import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { createServer } from "http";

// Load environment variables
dotenv.config();

// Import Vercel-style handlers (MCP tools)
import healthHandler from "./api/index";
import wikipediaHandler from "./api/tools/wikipedia";
import newsHandler from "./api/tools/news";
import redditHandler from "./api/tools/reddit";
import factcheckHandler from "./api/tools/factcheck";
import hibpHandler from "./api/tools/hibp";
import geolocationHandler from "./api/tools/geolocation";
import { languageRouter } from './api/languages';
import { assistantRouter } from "./api/assistant";
import { createVoiceRouter } from "./api/voice";
import { ragRouter } from "./api/rag";
import { economyRouter } from "./api/economy";
import { kioskRouter } from './api/kiosk';
import { kioskReaderRouter } from './api/kioskReader';

// Import NEXUS components
import { initWebSocket, broadcast } from "./lib/websocket";
import { initTelegramChat } from "./bot/telegramChat";
import { getSession, getAllSessions, getDbStats } from "./lib/sessionStore";
import { runPipeline, approveRiskGate, cancelRiskGate, getSessionMeta } from "./agents/pipeline";
import { v4 as uuidv4 } from "uuid";
import { whatsappRouter } from "./bot/whatsapp";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { setVoiceOutput } from "./server/firebase";
import { runSensorEventPipeline } from "./lib/orchestrator";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Larger limit for document uploads
app.use('/api', economyRouter);
app.use('/api/kiosk', kioskRouter);
app.use('/api/kiosk-reader', kioskReaderRouter);
app.use('/api/rag', ragRouter);
app.use('/api/assistant', assistantRouter);
app.use('/api/languages', languageRouter);
app.use('/api/voice', createVoiceRouter());

// === MCP Tool Routes ===
app.all("/api/health", healthHandler as any);
app.all("/api", healthHandler as any);
app.all("/api/tools/wikipedia", wikipediaHandler as any);
app.all("/api/tools/news", newsHandler as any);
app.all("/api/tools/reddit", redditHandler as any);
app.all("/api/tools/factcheck", factcheckHandler as any);
app.all("/api/tools/hibp", hibpHandler as any);
app.all("/api/tools/geolocation", geolocationHandler as any);

// === WhatsApp Routes ===
app.use("/api/whatsapp", whatsappRouter);

// === Session API Routes ===
app.get("/api/sessions", (_req, res) => {
  const sessions = getAllSessions();
  res.json(
    sessions.map((s) => ({
      session_id: s.session_id,
      topic: s.topic,
      status: s.status,
      risk_level: s.risk_level,
      agents_done: Object.keys(s.agents_output).length,
      events_count: s.events.length,
      created_at: s.created_at,
    }))
  );
});

app.get("/api/sessions/:id", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
});

app.get("/api/stats", (_req, res) => {
  res.json(getDbStats());
});

// ═══════════════════════════════════════════════════
// === n8n INBOUND API ROUTES ===
// ═══════════════════════════════════════════════════

/**
 * POST /api/pipeline/start
 * n8n calls this to trigger the pipeline.
 * Body: { session_id, input, chat_id, username, dashboard_url }
 */
app.post("/api/pipeline/start", async (req, res) => {
  const { session_id, input, chat_id, username, dashboard_url } = req.body;

  if (typeof input !== 'string' || !input.trim() || input.length > 20000) {
    res.status(400).json({ error: "Input must be text between 1 and 20,000 characters." });
    return;
  }
  if (session_id !== undefined && (typeof session_id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(session_id))) {
    res.status(400).json({ error: 'Invalid session ID.' });
    return;
  }

  const sid = session_id || uuidv4();
  const chatId = chat_id ? Number(chat_id) : undefined;

  console.log(`\n📡 [N8N → NEXUS] Pipeline start received`);
  console.log(`   Session: ${sid.slice(0, 8)} | User: ${username || 'n8n'}`);
  console.log(`   Input: "${String(input).substring(0, 80)}..."`);

  res.json({ ok: true, session_id: sid, status: "started" });

  // Run pipeline asynchronously (don't await — n8n gets immediate response)
  runPipeline(
    sid, input, chatId,
    (score, reason) => {
      if (username === 'NFC_Judge') {
        console.log(`[VOICE] Auto-approving risk gate (Score: ${score}) for NFC voice query`);
        approveRiskGate(sid);
      }
    }, // onRiskGate — auto approve if NFC
    undefined, // onRiskGateResponse
    undefined, // onComplete — handled by n8n webhook
    username || 'n8n',
    dashboard_url || `http://localhost:${process.env.PORT || 3001}/dashboard?session=${sid}`
  ).catch((err) => {
    console.error(`❌ [N8N PIPELINE] Error: ${err.message}`);
  });
});

/**
 * POST /api/pipeline/risk-response
 * n8n calls this when user clicks YES/NO on inline keyboard.
 * Body: { session_id, approved }
 */
app.post("/api/pipeline/risk-response", (req, res) => {
  const { session_id, approved } = req.body;

  if (!session_id) {
    res.status(400).json({ error: "Missing session_id" });
    return;
  }

  const isApproved = approved === true || approved === "true";

  console.log(`\n📡 [N8N → NEXUS] Risk response: ${isApproved ? 'APPROVED' : 'CANCELLED'} for ${session_id.slice(0, 8)}`);

  if (isApproved) {
    const ok = approveRiskGate(session_id);
    res.json({ ok, status: "approved" });
  } else {
    const ok = cancelRiskGate(session_id);
    res.json({ ok, status: "cancelled" });
  }
});

/**
 * POST /api/dashboard/saved
 * n8n calls this after saving to Sheets/Drive/Notion.
 * Broadcasts to dashboard so the UI can show "Report saved" badge.
 * Body: { session_id, doc_url, status }
 */
app.post("/api/dashboard/saved", (req, res) => {
  const { session_id, doc_url, status } = req.body;

  console.log(`\n📡 [N8N → NEXUS] Dashboard saved notification: ${session_id?.slice(0, 8)}`);
  console.log(`   Doc URL: ${doc_url || 'none'}`);

  broadcast({
    type: "REPORT_SAVED",
    session_id,
    doc_url: doc_url || null,
    status: status || "saved",
  });

  res.json({ ok: true });
});

// === Chat Document APIs (for web chat page) ===
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * POST /api/chat/parse-document
 * Parses uploaded PDF/DOCX files and returns extracted text.
 */
app.post("/api/chat/parse-document", upload.single('file'), async (req: any, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const fileName = (file.originalname || 'unknown').toLowerCase();
    let extractedText = '';

    if (fileName.endsWith('.pdf')) {
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: file.buffer });
      try { extractedText = (await parser.getText()).text; }
      finally { await parser.destroy(); }
    } else if (fileName.endsWith('.docx')) {
      try {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(file.buffer);
        const docXml = zip.readAsText('word/document.xml');
        extractedText = docXml
          .replace(/<w:p[^>]*>/g, '\n')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
          .replace(/\s+/g, ' ').trim();
      } catch {
        res.status(400).json({ error: 'This DOCX could not be read. Please export it again or upload a text-based PDF.' });
        return;
      }
    } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      extractedText = file.buffer.toString('utf-8');
    } else {
      res.status(400).json({ error: "Unsupported file type" });
      return;
    }

    if (!extractedText.trim()) {
      res.status(422).json({ error: 'No readable text was found. Use a text-based PDF or TXT document.' });
      return;
    }
    res.json({ text: extractedText, length: extractedText.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/chat/analyze-document
 * Analyzes document text and returns type + summary.
 */
app.post("/api/chat/analyze-document", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: "No text provided" });
      return;
    }
    const { analyzeDocument } = require('./lib/docAnalyzer');
    const result = await analyzeDocument(text);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message, documentType: "Document", summary: "Analysis failed" });
  }
});

// === Sensor & Vision API Routes ===

/**
 * POST /api/sensor-event
 */
app.post("/api/sensor-event", async (req, res) => {
  try {
    const { type, desc, temp, motion, vib, timestamp } = req.body;

    const validTypes = ['temperature_breach', 'equipment_impact', 'access_detected', 'document_scan'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ success: false, error: "Invalid sensor event type" });
      return;
    }

    const verdictId = await runSensorEventPipeline(req.body);

    res.status(200).json({ success: true, verdictId });
  } catch (error: any) {
    console.error("❌ [API] Sensor Event error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/document-vision
 * Smart document capture — handles tilted, glare, poorly-lit documents
 */
app.post("/api/document-vision", async (req, res) => {
  try {
    const { image_base64, timestamp, language } = req.body;

    if (!image_base64) {
      res.status(400).json({ success: false, error: "Missing image_base64" });
      return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const imagePart = {
      inlineData: {
        data: image_base64,
        mimeType: "image/jpeg"
      }
    };

    const visionPrompt = `You are a precise legal document OCR system.
This is a photograph of a legal document taken from a mobile phone camera.
The document may be tilted, rotated, partially visible, have glare, shadows, or poor lighting.
Despite any imperfections in the photograph:
1. Extract ALL text from the document as accurately as possible.
2. Correct any obvious OCR artifacts or misreadings.
3. Preserve the original structure (headings, paragraphs, clauses).
4. If parts are genuinely unreadable, note them as [illegible].
5. Return ONLY the extracted text, nothing else.`;

    const result = await model.generateContent([visionPrompt, imagePart]);
    const extractedText = result.response.text();

    const sessionId = uuidv4();

    // Store extracted text and chosen language for voice-chat context (In-memory + Firebase)
    const posSessionContexts = (global as any).__posContexts || new Map();
    const posSessionLanguages = (global as any).__posLanguages || new Map();
    const contextSnippet = extractedText.substring(0, 4000);
    const chosenLang = language || 'en-IN';
    posSessionContexts.set(sessionId, contextSnippet);
    posSessionLanguages.set(sessionId, chosenLang);
    (global as any).__posContexts = posSessionContexts;
    (global as any).__posLanguages = posSessionLanguages;

    // Persist context & language to Firebase for reliability
    try {
      const { rtdb } = require('./server/firebase');
      await rtdb.ref(`/pos_sessions/${sessionId}`).update({
        context: contextSnippet,
        language: chosenLang,
        timestamp: Date.now()
      });
    } catch (e) {
      console.warn("⚠️ [API] Failed to persist context to Firebase:", e);
    }

    runPipeline(
      sessionId,
      `[Document Review] ${extractedText}`,
      undefined,
      (score, reason) => {
        console.log(`[VISION] Auto-approving risk gate (Score: ${score}) for mobile scanner`);
        approveRiskGate(sessionId);
      },
      undefined,
      undefined,
      'Vision_Scanner'
    ).catch(e => console.error(e));

    const voiceResponse = `Document scanned successfully. I have extracted ${extractedText.length} characters and started the tribunal analysis.`;

    await setVoiceOutput(voiceResponse);

    res.status(200).json({ success: true, extractedText, voiceResponse, sessionId, language: chosenLang });
  } catch (error: any) {
    console.error("❌ [API] Document Vision error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/session-status/:sessionId
 * Polling fallback for POS — returns verdict when session is complete.
 * Used when WebSocket drops (e.g. over ngrok).
 */
app.get("/api/session-status/:sessionId", (req, res) => {
  try {
    const { getSession } = require("./lib/sessionStore");
    const session = getSession(req.params.sessionId);
    if (!session) {
      res.status(404).json({ status: "not_found" });
      return;
    }
    const isDone = session.status === "complete" || session.status === "done";
    const posLanguages = (global as any).__posLanguages || new Map();
    const sessionLang = posLanguages.get(req.params.sessionId) || 'en-IN';
    res.json({
      status: isDone ? "done" : session.status,
      verdict: session.verdict || null,
      confidence: session.confidence || 0,
      risk_level: session.risk_level || "medium",
      documentUrl: (session as any).documentUrl || null,
      language: sessionLang,
    });
  } catch (e: any) {
    res.status(500).json({ status: "error", error: e.message });
  }
});

/**
 * POST /api/voice-chat
 * Gemini-powered conversational legal AI for the POS voice agent.
 * Law-only guardrail — refuses non-legal queries and speaks exclusively in chosen language.
 */
const voiceChatHistories = new Map<string, Array<{role: string, parts: [{text: string}]}>>();

app.post("/api/voice-chat", async (req, res) => {
  try {
    const { message, language, sessionId, context } = req.body;

    if (!message) {
      res.status(400).json({ error: "Missing message" });
      return;
    }

    const posLanguages = (global as any).__posLanguages || new Map();
    const effectiveLang = language || (sessionId ? posLanguages.get(sessionId) : null) || 'en-IN';

    const langName: Record<string, string> = {
      'en-IN': 'English',
      'kn-IN': 'Kannada',
      'hi-IN': 'Hindi',
      'ta-IN': 'Tamil'
    };
    const respondIn = langName[effectiveLang] || 'English';

    const declineMessages: Record<string, string> = {
      'en-IN': "I can only assist with legal matters under Indian law. Please ask me a law-related question.",
      'kn-IN': "ನಾನು ಭಾರತೀಯ ಕಾನೂನಿನ ಸಂಬಂಧಿತ ವಿಷಯಗಳಲ್ಲಿ ಮಾತ್ರ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ದಯವಿಟ್ಟು ಕಾನೂನಿಗೆ ಸಂಬಂಧಿಸಿದ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ.",
      'hi-IN': "मैं केवल भारतीय कानून से संबंधित मामलों में मदद कर सकता हूँ। कृपया कानून से संबंधित प्रश्न पूछें।",
      'ta-IN': "நான் இந்திய சட்ட விவகாரங்களில் மட்டுமே உதவ முடியும். தயவுசெய்து சட்டம் தொடர்பான கேள்வியைக் கேளுங்கள்."
    };

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Retrieve document context (Memory -> Firebase fallback)
    const posContexts = (global as any).__posContexts || new Map();
    let docContext = context || (sessionId ? posContexts.get(sessionId) : '');

    if (!docContext && sessionId) {
      try {
        const { rtdb } = require('./server/firebase');
        const snap = await rtdb.ref(`/pos_sessions/${sessionId}/context`).get();
        if (snap.exists()) docContext = snap.val();
      } catch (e) {
        console.warn("⚠️ [VOICE-CHAT] Firebase context fetch failed");
      }
    }
    docContext = docContext || '';

    const systemPrompt = `You are DHARMARAKSHA, an AI Legal Assistant specializing exclusively in Indian law.
The user has chosen to communicate in ${respondIn} (${effectiveLang}).

CRITICAL LANGUAGE RULE:
- You MUST respond EXCLUSIVELY and ENTIRELY in ${respondIn} language (using native ${respondIn} script: Kannada in Kannada script, Hindi in Devanagari script, Tamil in Tamil script, English in English).
- Do NOT use English sentences or words in your explanation if the user chose ${respondIn} (unless quoting a specific Section or Act title like 'Section 27' or 'BNS').
- Keep responses concise — maximum 2 to 3 sentences — optimized for spoken voice delivery.

LEGAL GUARDRAIL:
- You ONLY answer questions related to Indian law, contracts, property law, labour law, consumer rights, constitutional law, and legal procedures.
- If the question is NOT legal, respond with: "${declineMessages[effectiveLang] || declineMessages['en-IN']}"

${docContext ? `DOCUMENT CONTEXT (from user's scanned document):\n"${docContext.substring(0, 2000)}"` : 'No document context.'}`;

    // Get or create chat history for this session
    const historyKey = sessionId || 'default';
    if (!voiceChatHistories.has(historyKey)) {
      voiceChatHistories.set(historyKey, []);
    }
    const history = voiceChatHistories.get(historyKey)!;

    // Initialize Gemini Chat
    const chat = model.startChat({
      history: history,
    });

    const result = await chat.sendMessage([
      { text: `SYSTEM INSTRUCTION: ${systemPrompt}` },
      { text: message }
    ]);
    const reply = result.response.text().trim();

    // Update history
    history.push({ role: 'user', parts: [{ text: message }] });
    history.push({ role: 'model', parts: [{ text: reply }] });

    // Log Q&A to Firebase for visibility
    if (sessionId) {
      try {
        const { rtdb } = require('./server/firebase');
        await rtdb.ref(`/pos_sessions/${sessionId}/history`).push({
          role: 'user',
          text: message,
          reply: reply,
          language: effectiveLang,
          timestamp: Date.now()
        });
      } catch (e) {
        console.warn("⚠️ [VOICE-CHAT] Failed to log history to Firebase");
      }
    }

    console.log(`🎙️ [VOICE-CHAT] [${respondIn}] Q: "${message.substring(0, 50)}..." → A: "${reply.substring(0, 50)}..."`);

    res.json({ reply, language: effectiveLang });
  } catch (error: any) {
    console.error("❌ [API] Voice chat error:", error);
    res.json({ reply: "I apologize, there was an error processing your question. Please try again." });
  }
});

/**
 * POST /api/detect-language
 * Detects which language the user spoke from their voice input.
 */
app.post("/api/detect-language", async (req, res) => {
  try {
    const { spokenText } = req.body;
    if (!spokenText) { res.json({ language: 'en-IN' }); return; }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const result = await model.generateContent(
      `The user was asked which language they prefer. They said: "${spokenText}".
Determine which Indian language they want. Reply with ONLY one of these exact codes:
- en-IN (if they said English, or anything in English indicating English)
- kn-IN (if they said Kannada, ಕನ್ನಡ, or anything indicating Kannada)
- hi-IN (if they said Hindi, हिन्दी, or anything indicating Hindi)
- ta-IN (if they said Tamil, தமிழ், or anything indicating Tamil)
Reply with ONLY the code, nothing else.`
    );
    const code = result.response.text().trim();
    const valid = ['en-IN', 'kn-IN', 'hi-IN', 'ta-IN'];
    res.json({ language: valid.includes(code) ? code : 'en-IN' });
  } catch {
    res.json({ language: 'en-IN' });
  }
});

/**
 * POST /api/explain-verdict
 * Takes a full verdict and generates a brief, simple 2-3 sentence explanation
 * in the user's language. Designed for illiterate users who need spoken summaries.
 */
app.post("/api/explain-verdict", async (req, res) => {
  try {
    const { verdict, language, sessionId, documentContext } = req.body;

    const posLanguages = (global as any).__posLanguages || new Map();
    let effectiveLang = language;
    if ((!effectiveLang || effectiveLang === 'en-IN') && sessionId && posLanguages.has(sessionId)) {
      effectiveLang = posLanguages.get(sessionId);
    }
    if (!effectiveLang) effectiveLang = 'en-IN';

    const langName: Record<string, string> = {
      'en-IN': 'English', 'kn-IN': 'Kannada', 'hi-IN': 'Hindi', 'ta-IN': 'Tamil'
    };
    const respondIn = langName[effectiveLang] || 'English';

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `You are an AI legal assistant explaining legal audit results to an ordinary citizen in their regional language.

VERDICT / AUDIT FINDINGS:
"${(verdict || 'Document analyzed under Indian laws, statutes, and safety checks.').substring(0, 3000)}"

${documentContext ? `DOCUMENT ANALYZED:\n"${documentContext.substring(0, 1000)}"` : ''}

CRITICAL REQUIREMENT:
1. You MUST explain the verdict EXCLUSIVELY and ENTIRELY in ${respondIn} language (using native ${respondIn} script: Kannada in Kannada script, Hindi in Devanagari script, Tamil in Tamil script, English in English).
2. Keep it to exactly 2-3 short, spoken sentences that sound completely natural when spoken out loud.
3. State whether the document is valid/safe or has legal risks, and what the citizen should do.
4. Respond ONLY with the ${respondIn} explanation text. Do NOT include any English words, translation notes, quotation marks, or markdown.`;

    const result = await model.generateContent(prompt);
    const explanation = result.response.text().trim();

    console.log(`📢 [EXPLAIN] [${respondIn} / ${effectiveLang}]: "${explanation.substring(0, 80)}..."`);
    res.json({ explanation, language: effectiveLang });
  } catch (error: any) {
    console.error("❌ [API] Explain verdict error:", error);
    res.json({ explanation: '', language: 'en-IN' });
  }
});

// === Dashboard Static Files ===
const projectRoot = path.basename(__dirname) === 'dist' ? path.resolve(__dirname, '..') : __dirname;
app.use('/dashboard', (req,res,next)=>process.env.KIOSK_MODE==='true'?res.redirect('/kiosk/'):next());
app.use("/dashboard", express.static(path.join(projectRoot, "dashboard")));
app.use('/kiosk', express.static(path.join(projectRoot, 'kiosk'), { etag:false, lastModified:false, setHeaders(res){res.setHeader('Cache-Control','no-store');} }));

// === Chat Page Static Files ===
app.use("/chat", express.static(path.join(projectRoot, "chat")));

// Redirect root to dashboard
app.get("/", (_req, res) => {
  res.redirect(process.env.KIOSK_MODE === 'true' ? '/kiosk/' : '/dashboard');
});

// === Start Server ===
const server = createServer(app);

// Initialize WebSocket on the HTTP server
initWebSocket(server);

// Initialize Telegram bot
if (process.env.TELEGRAM_CHAT_ENABLED === 'true') initTelegramChat();

server.listen(PORT, () => {
  console.log("");
  console.log("  ◆ NEXUS MCP Server");
  console.log(`  ├─ Server:    http://localhost:${PORT}`);
  console.log(`  ├─ Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`  ├─ Health:    http://localhost:${PORT}/api/health`);
  console.log(`  ├─ WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`  ├─ Tools:     /api/tools/{wikipedia,news,reddit,factcheck,hibp,geolocation}`);
  console.log(`  └─ n8n API:   /api/pipeline/{start,risk-response} + /api/dashboard/saved`);
  console.log("");
});
