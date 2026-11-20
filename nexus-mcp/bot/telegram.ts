/**
 * NEXUS Telegram Bot
 * Commands: /start, /investigate <topic>, /status, /approve
 * Supports: Document uploads (PDF/TXT), YES/NO risk gate replies.
 */
process.env.NTBA_FIX_350 = "1";
import TelegramBot from "node-telegram-bot-api";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";
import { runPipeline, approveRiskGate, cancelRiskGate, findPausedSessionByChatId } from "../agents/pipeline";
import { getAllSessions, getSession } from "../lib/sessionStore";
import type { RiskLevel } from "../lib/sessionStore";
import { processVoiceNote } from "../lib/audioProcessor";

let bot: TelegramBot | null = null;

const activeSessions = new Map<number, string>();
const pendingRiskGateChats = new Set<number>();

// Registration state machine
type RegState = 'AWAITING_NAME' | 'AWAITING_EMAIL';
const registrationState = new Map<number, RegState>();
const userProfiles = new Map<number, { name: string; email: string }>();

// Document wizard state machine (fires after profile is complete and doc is uploaded)
type DocWizardStep = 'AWAITING_FORMAT' | 'AWAITING_LANGUAGE';
interface DocWizardState {
  step: DocWizardStep;
  extractedText: string;
  fileName: string;
  format?: 'pdf' | 'text';
}
const docWizardState = new Map<number, DocWizardState>();

// Language name map for verdict translation prompt
const LANG_NAMES: Record<string, string> = {
  'en': 'English',
  'hi': 'Hindi (हिन्दी)',
  'kn': 'Kannada (ಕನ್ನಡ)',
};

/**
 * Download a Telegram file and extract its text content.
 * Supports PDF (via pdf-parse) and plain text files.
 */
async function extractTextFromFile(fileId: string): Promise<string> {
  if (!bot) throw new Error("Bot not initialized");

  const file = await bot.getFile(fileId);
  const filePath = file.file_path;
  if (!filePath) throw new Error("Could not get file path");

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

  console.log(`📥 [TELEGRAM] Downloading file: ${filePath}`);

  const response = await fetch(fileUrl);
  const buffer = await response.buffer();

  if (filePath.endsWith(".pdf")) {
    try {
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(buffer);
      console.log(`📄 [TELEGRAM] Extracted ${data.text.length} chars from PDF (${data.numpages} pages)`);
      return data.text;
    } catch (err: any) {
      throw new Error(`PDF parse failed: ${err.message}`);
    }
  } else if (filePath.endsWith(".txt") || filePath.endsWith(".md") || filePath.endsWith(".doc")) {
    return buffer.toString("utf-8");
  } else if (filePath.endsWith(".docx")) {
    const text = buffer.toString("utf-8").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length > 50) return text;
    return `[DOCX document uploaded — file: ${filePath}. Raw text extraction returned limited content. For full analysis, please paste the contract text directly.]`;
  } else {
    const text = buffer.toString("utf-8");
    if (text.length > 20 && /[a-zA-Z]/.test(text)) return text;
    throw new Error(`Unsupported file type: ${filePath}. Please upload PDF or TXT files.`);
  }
}

export function initTelegramBot(): TelegramBot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("⚠️  TELEGRAM_BOT_TOKEN not set — bot disabled");
    return null;
  }

  bot = new TelegramBot(token, { polling: true });

  bot.on('polling_error', (error: any) => {
    if (error.code === 'ECONNRESET' || (error.message && error.message.includes('ECONNRESET'))) {
      console.debug('🤖 Telegram polling dropped (ECONNRESET), reconnecting...');
    } else {
      console.error(`🤖 Telegram polling error: ${error.message || error}`);
    }
  });

  console.log("🤖 Telegram bot connected");

  // /start command
  bot.onText(/\/start/i, (msg) => {
    const chatId = msg.chat.id;

    if (!userProfiles.has(chatId)) {
      registrationState.set(chatId, 'AWAITING_NAME');
      bot!.sendMessage(chatId,
        `🏛️ *Welcome to NEXUS DHARMARAKSHA*\n\n` +
        `I am a 50-agent AI Legal Tribunal for Indian law analysis.\n\n` +
        `To maintain proper legal records, please tell me your *Full Name*:`,
        { parse_mode: "Markdown" });
      return;
    }

    const profile = userProfiles.get(chatId)!;
    bot!.sendMessage(chatId,
      `🔮 *Welcome back, ${profile.name}*\n\n` +
      `*How to use NEXUS:*\n` +
      `📎 *Upload a document* (PDF/TXT) — I will analyze it through 50 AI agents\n` +
      `✍️ *Type any legal query* — direct investigation\n` +
      `🎙️ *Send a voice note* — I will transcribe and analyze\n\n` +
      `Use /help for commands.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📄 Review an NDA', callback_data: 'Q_1' }],
            [{ text: '⚖️ Workplace safety liability', callback_data: 'Q_2' }],
            [{ text: '🏡 Verbal partition deeds validity', callback_data: 'Q_3' }],
            [{ text: '👶 Maternity leave rules Karnataka', callback_data: 'Q_4' }],
          ]
        }
      }
    );
  });

  // /investigate command
  bot.onText(/\/investigate(?: (.+))?/i, async (msg, match) => {
    const chatId = msg.chat.id;

    if (!userProfiles.has(chatId)) {
      registrationState.set(chatId, 'AWAITING_NAME');
      bot!.sendMessage(chatId, `Please register first. What is your *Full Name*?`, { parse_mode: "Markdown" });
      return;
    }

    const topic = match?.[1]?.trim();

    if (!topic) {
      bot!.sendMessage(chatId, "❌ Please provide a topic: `/investigate <your topic>`", { parse_mode: "Markdown" });
      return;
    }

    if (activeSessions.has(chatId)) {
      bot!.sendMessage(chatId, "⏳ An investigation is already running. Use /status to check progress.");
      return;
    }

    const profile = userProfiles.get(chatId);
    const tgUser = profile ? `${profile.name} (${profile.email})` : msg.from?.username || "unknown";
    await startInvestigation(chatId, topic, tgUser, 'pdf', 'en');
  });

  // /status command
  bot.onText(/\/status/i, (msg) => {
    const chatId = msg.chat.id;
    const sessionId = activeSessions.get(chatId);

    if (!sessionId) {
      bot!.sendMessage(chatId, "No active investigation. Upload a document or type your query to begin.");
      return;
    }

    const session = getSession(sessionId);
    if (!session) {
      bot!.sendMessage(chatId, "Session not found. Upload a document or type your query to begin.");
      return;
    }

    const agentsDone = Object.keys(session.agents_output || {}).length;
    bot!.sendMessage(
      chatId,
      `📊 *Investigation Status*\n\n` +
      `📋 Topic: ${session.topic?.substring(0, 100)}\n` +
      `🔄 Status: *${session.status.toUpperCase()}*\n` +
      `🤖 Agents completed: ${agentsDone}/50\n` +
      `🆔 Session: \`${sessionId.slice(0, 8)}\``,
      { parse_mode: "Markdown" }
    );
  });

  // /approve command
  bot.onText(/\/approve/i, (msg) => {
    const chatId = msg.chat.id;
    const sessionId = activeSessions.get(chatId) || findPausedSessionByChatId(chatId);

    if (!sessionId) {
      bot!.sendMessage(chatId, "No paused investigation to approve.");
      return;
    }

    const approved = approveRiskGate(sessionId);
    if (approved) {
      pendingRiskGateChats.delete(chatId);
      bot!.sendMessage(chatId, `✅ *Risk Gate Approved*\n\nPipeline resuming...`, { parse_mode: "Markdown" });
    } else {
      bot!.sendMessage(chatId, "No pending risk gate for this session.");
    }
  });

  // /help command
  bot.onText(/\/help/i, (msg) => {
    const chatId = msg.chat.id;
    bot!.sendMessage(
      chatId,
      `📖 *NEXUS Commands*\n\n` +
      `/start — Welcome & overview\n` +
      `/investigate <topic> — Start text investigation\n` +
      `/status — Check progress\n` +
      `/approve — Approve risk gate\n` +
      `/help — Show commands\n\n` +
      `📎 Upload a *PDF or TXT file* or a *Voice Note* to analyze it!\n\n` +
      `*Supported document formats:* PDF, TXT, DOCX, MD`,
      { parse_mode: "Markdown" }
    );
  });

  // 1A. Voice Message Handler
  bot.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    if (!msg.voice) return;

    if (!userProfiles.has(chatId)) {
      registrationState.set(chatId, 'AWAITING_NAME');
      bot!.sendMessage(chatId, `Before we process voice notes, please tell me your *Full Name*:`, { parse_mode: "Markdown" });
      return;
    }

    try {
      const waitMsg = await bot!.sendMessage(chatId, "🎙️ *Voice Note Received...* Transcribing audio...", { parse_mode: 'Markdown' });

      const fileLink = await bot!.getFileLink(msg.voice.file_id);
      const response = await fetch(fileLink);
      if (!response.ok) throw new Error("Failed to download voice note.");

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const transcribedText = await processVoiceNote(buffer, "audio/ogg");

      await bot!.editMessageText(`✅ *Audio Processed*\n\n_Transcription/Translation:_\n"${transcribedText}"\n\n*Step 1 of 2:* How would you like to receive your verdict?`, {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📄 PDF Report (structured document)', callback_data: 'DOC_FORMAT_PDF' }],
            [{ text: '💬 Text Message (in regional language)', callback_data: 'DOC_FORMAT_TEXT' }],
          ]
        }
      });

      docWizardState.set(chatId, {
        step: 'AWAITING_FORMAT',
        extractedText: transcribedText.substring(0, 4000),
        fileName: 'Voice Note'
      });

    } catch (err: any) {
      console.error("Voice Note Error:", err);
      bot!.sendMessage(chatId, `❌ Failed to process voice note: ${err.message}`);
    }
  });

  // 1B. Document Handler — Step 1 of wizard
  bot.on("document", async (msg) => {
    const chatId = msg.chat.id;

    // Registration gate
    if (!userProfiles.has(chatId)) {
      registrationState.set(chatId, 'AWAITING_NAME');
      bot!.sendMessage(chatId, `Before uploading documents, please tell me your *Full Name*:`, { parse_mode: "Markdown" });
      return;
    }

    const doc = msg.document;
    if (!doc) return;

    if (activeSessions.has(chatId)) {
      bot!.sendMessage(chatId, "⏳ An investigation is already running. Please wait for it to complete.");
      return;
    }

    const fileName = doc.file_name || "unknown";
    const fileSize = doc.file_size || 0;
    console.log(`\n📎 [TELEGRAM] Document received: ${fileName} (${(fileSize / 1024).toFixed(1)} KB)`);

    if (fileSize > 20 * 1024 * 1024) {
      bot!.sendMessage(chatId, "❌ File too large. Maximum size is 20MB.");
      return;
    }

    const waitMsg = await bot!.sendMessage(chatId,
      `📎 *Document Received*\n\n📄 \`${fileName}\`\n📏 ${(fileSize / 1024).toFixed(1)} KB\n\n⏳ Extracting text...`,
      { parse_mode: "Markdown" }
    );

    try {
      const extractedText = await extractTextFromFile(doc.file_id);

      if (extractedText.length < 10) {
        bot!.sendMessage(chatId, "❌ Could not extract text from this document. Try pasting the text directly with `/investigate <text>`", { parse_mode: "Markdown" });
        return;
      }

      await bot!.editMessageText(
        `✅ *Extracted ${extractedText.length.toLocaleString()} characters* from \`${fileName}\`\n\n` +
        `*Step 1 of 2:* How would you like to receive your verdict?`,
        { chat_id: chatId, message_id: waitMsg.message_id, parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: '📄 PDF Report (structured document)', callback_data: 'DOC_FORMAT_PDF' }],
              [{ text: '💬 Text Message (in regional language)', callback_data: 'DOC_FORMAT_TEXT' }],
            ]
          }
        }
      );

      // Save wizard state
      docWizardState.set(chatId, {
        step: 'AWAITING_FORMAT',
        extractedText: extractedText.substring(0, 4000),
        fileName,
      });

    } catch (err: any) {
      console.error(`❌ [TELEGRAM] Document processing error: ${err.message}`);
      bot!.sendMessage(chatId, `❌ Failed to process document: ${err.message}`);
    }
  });

  // Handle plain text — wizard steps + registration + risk gate + general queries
  bot.on("message", async (msg) => {
    if (msg.text && msg.text.startsWith("/")) return;
    if (msg.document || msg.voice) return;

    const chatId = msg.chat.id;
    const rawText = msg.text?.trim();
    const textUpper = rawText?.toUpperCase();

    if (!rawText || !textUpper) return;

    // --- REGISTRATION FLOW ---
    if (registrationState.has(chatId)) {
      const state = registrationState.get(chatId);

      if (state === 'AWAITING_NAME') {
        userProfiles.set(chatId, { name: rawText, email: '' });
        registrationState.set(chatId, 'AWAITING_EMAIL');
        bot!.sendMessage(chatId,
          `👋 Nice to meet you, *${rawText}*!\n\nNow please enter your *Email Address* (for legal records):`,
          { parse_mode: "Markdown" });
        return;
      }

      if (state === 'AWAITING_EMAIL') {
        const profile = userProfiles.get(chatId)!;
        profile.email = rawText;
        registrationState.delete(chatId);
        bot!.sendMessage(chatId,
          `✅ *Registration Complete!*\n\n` +
          `📝 Name: *${profile.name}*\n📧 Email: *${profile.email}*\n\n` +
          `You can now:\n• 📎 Upload a document (PDF/TXT) to analyze\n• ✍️ Type your legal query\n• 🎙️ Send a voice note\n\nUse /start to see the menu.`,
          { parse_mode: "Markdown" });
        return;
      }
    }

    // Must be registered
    if (!userProfiles.has(chatId)) {
      registrationState.set(chatId, 'AWAITING_NAME');
      bot!.sendMessage(chatId, `Before we begin, please tell me your *Full Name*:`, { parse_mode: "Markdown" });
      return;
    }

    // --- RISK GATE ---
    if (pendingRiskGateChats.has(chatId)) {
      const sessionId = activeSessions.get(chatId);
      if (!sessionId) return;

      if (textUpper === "YES") {
        const ok = approveRiskGate(sessionId);
        pendingRiskGateChats.delete(chatId);
        bot!.sendMessage(chatId, `✅ *Approved!* Pipeline resuming...`, { parse_mode: "Markdown" });
        return;
      } else if (textUpper === "NO") {
        cancelRiskGate(sessionId);
        pendingRiskGateChats.delete(chatId);
        activeSessions.delete(chatId);
        bot!.sendMessage(chatId, "🛑 Analysis cancelled.");
        return;
      } else {
        bot!.sendMessage(chatId, "Please reply *YES* or *NO*.", { parse_mode: "Markdown" });
        return;
      }
    }

    if (activeSessions.has(chatId)) {
      bot!.sendMessage(chatId, `⏳ Investigation in progress. Use /status to check.`);
      return;
    }

    // Plain text query — run format wizard
    bot!.sendMessage(chatId,
      `*Step 1 of 2:* How would you like to receive your verdict?`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: '📄 PDF Report (structured document)', callback_data: 'DOC_FORMAT_PDF' }],
            [{ text: '💬 Text Message (in regional language)', callback_data: 'DOC_FORMAT_TEXT' }],
          ]
        }
      }
    );
    docWizardState.set(chatId, {
      step: 'AWAITING_FORMAT',
      extractedText: rawText,
      fileName: 'Text Query'
    });
  });

  // Inline keyboard callback handler
  bot.on("callback_query", async (query) => {
    const data = query.data || "";
    const chatId = query.message?.chat.id;

    if (!chatId) return;
    bot!.answerCallbackQuery(query.id);

    // ─── Risk gate ───
    if (data.startsWith("RISK_YES_")) {
      const sessionId = data.replace("RISK_YES_", "");
      approveRiskGate(sessionId);
      pendingRiskGateChats.delete(chatId);
      bot!.sendMessage(chatId, `✅ *Risk Gate Approved* — Pipeline resuming...`, { parse_mode: "Markdown" });
      return;
    }
    if (data.startsWith("RISK_NO_")) {
      const sessionId = data.replace("RISK_NO_", "");
      cancelRiskGate(sessionId);
      pendingRiskGateChats.delete(chatId);
      activeSessions.delete(chatId);
      bot!.sendMessage(chatId, "🛑 Analysis cancelled.");
      return;
    }

    // ─── Document wizard Step 1: format selection ───
    if (data === 'DOC_FORMAT_PDF' || data === 'DOC_FORMAT_TEXT') {
      const wizard = docWizardState.get(chatId);
      if (!wizard) { bot!.sendMessage(chatId, "❌ Session expired. Please upload the document again."); return; }

      wizard.format = data === 'DOC_FORMAT_PDF' ? 'pdf' : 'text';
      wizard.step = 'AWAITING_LANGUAGE';
      docWizardState.set(chatId, wizard);

      if (wizard.format === 'pdf') {
        // PDF is always English — skip language step, go directly
        bot!.sendMessage(chatId,
          `📄 *PDF Report selected*\n\n` +
          `📋 Your report will be generated in *English* with full structured formatting.\n\n` +
          `🚀 Starting 50-agent tribunal now...`,
          { parse_mode: "Markdown" }
        );
        const profile = userProfiles.get(chatId);
        const tgUser = profile ? `${profile.name} (${profile.email})` : "unknown";
        docWizardState.delete(chatId);
        await startInvestigation(chatId, wizard.extractedText, tgUser, 'pdf', 'en', wizard.fileName);
      } else {
        // Text → ask language
        bot!.sendMessage(chatId,
          `💬 *Text format selected*\n\n*Step 2 of 2:* Choose the language for your verdict:`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: '🇬🇧 English', callback_data: 'DOC_LANG_en' }],
                [{ text: '🇮🇳 Hindi (हिन्दी)', callback_data: 'DOC_LANG_hi' }],
                [{ text: '🇮🇳 Kannada (ಕನ್ನಡ)', callback_data: 'DOC_LANG_kn' }],
              ]
            }
          }
        );
      }
      return;
    }

    // ─── Document wizard Step 2: language selection ───
    if (data.startsWith('DOC_LANG_')) {
      const lang = data.replace('DOC_LANG_', '') as 'en' | 'hi' | 'kn';
      const wizard = docWizardState.get(chatId);
      if (!wizard) { bot!.sendMessage(chatId, "❌ Session expired. Please upload the document again."); return; }

      const langName = LANG_NAMES[lang] || 'English';
      bot!.sendMessage(chatId,
        `✅ *${langName} selected*\n\n🚀 Starting 50-agent tribunal now...\n\n` +
        `Your verdict will be delivered in *${langName}*.`,
        { parse_mode: "Markdown" }
      );

      const profile = userProfiles.get(chatId);
      const tgUser = profile ? `${profile.name} (${profile.email})` : "unknown";
      docWizardState.delete(chatId);
      await startInvestigation(chatId, wizard.extractedText, tgUser, 'text', lang, wizard.fileName);
      return;
    }

    // ─── Predefined questions ───
    if (data.startsWith("Q_")) {
      const PREDEFINED_QUESTIONS: Record<string, string> = {
        'Q_1': 'Please review my standard Non-Disclosure Agreement (NDA) and identify any risks under the Indian Contract Act.',
        'Q_2': 'A workplace safety incident occurred where a scaffolding collapsed on a construction site in Bangalore. Who is liable under Indian Labour Laws?',
        'Q_3': 'Are verbal partition deeds of ancestral property legally valid in India without written registration?',
        'Q_4': 'What are the statutory rules and employer obligations for maternity leave in Karnataka under the Maternity Benefit Act?'
      };

      const topic = PREDEFINED_QUESTIONS[data];
      if (!topic) return;

      bot!.sendMessage(chatId,
        `*Step 1 of 2:* How would you like to receive your verdict?`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: '📄 PDF Report (structured document)', callback_data: 'DOC_FORMAT_PDF' }],
              [{ text: '💬 Text Message (in regional language)', callback_data: 'DOC_FORMAT_TEXT' }],
            ]
          }
        }
      );
      docWizardState.set(chatId, {
        step: 'AWAITING_FORMAT',
        extractedText: topic,
        fileName: 'Predefined Query'
      });
    }
  });

  return bot;
}


/**
 * Start an investigation with format (pdf|text) and language (en|hi|kn) preferences.
 */
async function startInvestigation(
  chatId: number, topic: string, username: string,
  format: 'pdf' | 'text' = 'pdf',
  lang: 'en' | 'hi' | 'kn' = 'en',
  fileName?: string
) {
  const session_id = uuidv4();
  const dashboard_url = `http://localhost:${process.env.PORT || 3001}/dashboard?session=${session_id}`;
  const userEmail = userProfiles.get(chatId)?.email || '';

  activeSessions.set(chatId, session_id);

  bot!.sendMessage(chatId,
    `🚀 *Investigation Started*\n\n` +
    `🆔 Session: \`${session_id.slice(0, 8)}\`\n` +
    `📄 Document: ${fileName ? `\`${fileName}\`` : 'Text query'}\n` +
    `📋 Output: *${format === 'pdf' ? 'PDF Report (English)' : `Text (${lang === 'hi' ? 'Hindi' : lang === 'kn' ? 'Kannada' : 'English'})`}*\n\n` +
    `🔍 50 AI agents analyzing in parallel...\n` +
    `📊 Live: ${dashboard_url}`,
    { parse_mode: "Markdown" }
  );

  // Store format/lang preference for this session
  const sessionPrefs = new Map<string, { format: string; lang: string }>();
  sessionPrefs.set(session_id, { format, lang });

  try {
    await runPipeline(
      session_id, topic, chatId,
      (risk_score: number, _reason: string) => {
        pendingRiskGateChats.add(chatId);
        bot!.sendMessage(chatId,
          `⚠️ *NEXUS Risk Gate Triggered*\n\n🔴 Risk Score: *${risk_score}/10*\n\nReply *YES* to continue or *NO* to cancel.\n_(Auto-cancels in 60 seconds)_`,
          { parse_mode: "Markdown" }
        );
      },
      undefined,
      async (verdict: string, documentPath?: string) => {
        if (format === 'pdf' && documentPath) {
          try {
            const fs = require('fs');
            if (fs.existsSync(documentPath)) {
              await bot!.sendDocument(chatId, fs.createReadStream(documentPath), {
                caption: `📄 *NEXUS Legal Analysis Report*\n\nInvestigation complete. Full structured report attached.\n\n⚠️ _AI-generated — for informational purposes only._`,
                parse_mode: 'Markdown',
              });
            } else {
              await sendVerdictAsText(chatId, verdict, lang);
            }
          } catch (err: any) {
            console.error(`❌ [TELEGRAM] Failed to send PDF: ${err.message}`);
            await sendVerdictAsText(chatId, verdict, lang);
          }
        } else {
          // Text format: translate if needed
          await sendVerdictAsText(chatId, verdict, lang);
        }
        activeSessions.delete(chatId);
        pendingRiskGateChats.delete(chatId);
      },
      username, dashboard_url, userEmail,
      false, // skipPdf only if text format
    );
  } catch (err: any) {
    const msg = err.message || "Pipeline failed";
    if (!msg.includes("cancelled")) {
      bot!.sendMessage(chatId, `❌ *Investigation Failed*\n\n${msg}`, { parse_mode: "Markdown" });
    }
    activeSessions.delete(chatId);
    pendingRiskGateChats.delete(chatId);
  }
}

/**
 * Send verdict as well-formatted text, optionally translated to hi/kn via Gemini.
 */
async function sendVerdictAsText(chatId: number, verdict: string, lang: 'en' | 'hi' | 'kn' = 'en') {
  let finalVerdict = verdict;

  // Translate if non-English
  if (lang !== 'en') {
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      const langName = lang === 'hi' ? 'Hindi' : 'Kannada';
      const result = await model.generateContent(
        `Translate the following legal verdict to ${langName}. Keep all legal terms, section numbers, and formatting intact. Output only the translated text.\n\n${verdict.substring(0, 3000)}`
      );
      finalVerdict = result.response.text().trim();
    } catch (e: any) {
      console.warn(`[TELEGRAM] Translation failed: ${e.message}`);
      // fall through to English
    }
  }

  // Clean and format for Telegram markdown
  const clean = finalVerdict
    .replace(/```json[\s\S]*?```/g, '')
    .replace(/\{[\s\S]{0,200}\}/g, '')
    .replace(/\[[\s\S]{0,200}\]/g, '')
    .replace(/\*\*/g, '*')
    .trim();

  // Split into chunks of 3800 chars (Telegram limit is 4096)
  const chunks: string[] = [];
  let remaining = clean;
  while (remaining.length > 0) {
    let chunk = remaining.substring(0, 3800);
    // Try to break at paragraph
    const lastPara = chunk.lastIndexOf('\n\n');
    if (lastPara > 2000) chunk = remaining.substring(0, lastPara);
    chunks.push(chunk);
    remaining = remaining.substring(chunk.length).trim();
  }

  // Send header
  const langLabel = lang === 'hi' ? 'Hindi (हिन्दी)' : lang === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English';
  await bot!.sendMessage(chatId,
    `⚖️ *NEXUS Tribunal — Verdict*\n🌐 Language: *${langLabel}*\n━━━━━━━━━━━━━━━━━━━━`,
    { parse_mode: 'Markdown' }
  );

  // Send chunks
  for (const chunk of chunks.slice(0, 5)) { // max 5 messages
    try {
      await bot!.sendMessage(chatId, chunk, { parse_mode: 'Markdown' });
    } catch {
      await bot!.sendMessage(chatId, chunk); // retry without markdown
    }
    await new Promise(r => setTimeout(r, 300));
  }

  await bot!.sendMessage(chatId,
    `━━━━━━━━━━━━━━━━━━━━\n✅ *Analysis complete.*\n\n⚠️ _This is an AI-generated analysis for informational purposes only. Consult a qualified lawyer for legal advice._`,
    { parse_mode: 'Markdown' }
  );
}

export function getBot(): TelegramBot | null {
  return bot;
}

export async function sendComplianceAlert(data: {
  eventType: string; eventDesc: string; voiceResponse: string;
  legalReference: string; timeframeHours: number; notifySupervisor: boolean;
  verdictHash: string; temperature: number;
}): Promise<void> {
  if (!bot) return;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return;
  try {
    await bot.sendMessage(chatId,
      `⚖️ *DHARMARAKSHA COMPLIANCE ALERT*\n━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 ${data.eventType} | 🌡️ ${data.temperature}°C\n${data.eventDesc}\n\n` +
      `🔔 ${data.voiceResponse}\n📚 ${data.legalReference}\n` +
      `⏱️ Action within: ${data.timeframeHours}h\n` +
      `👤 Notify Supervisor: ${data.notifySupervisor ? 'Yes' : 'No'}\n` +
      `🔗 #${data.verdictHash.substring(0, 12)}\n━━━━━━━━━━━━━━━━━━━━━━━━`
    );
  } catch (err: any) {
    console.error(`⚠️ [TELEGRAM] Alert failed: ${err.message}`);
  }
}
