import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { runPipeline, approveRiskGate, cancelRiskGate, getSessionMeta } from "../agents/pipeline";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const whatsappRouter = Router();

// --- STATE MANAGEMENT ---
type RegState = 'AWAITING_NAME' | 'AWAITING_EMAIL';
const registrationState = new Map<string, RegState>();
const userProfiles = new Map<string, { name: string; email: string }>();
const activeSessions = new Map<string, string>();
const pendingRiskGateChats = new Set<string>();

interface WizardState {
  step: 'AWAITING_FORMAT' | 'AWAITING_LANGUAGE';
  extractedText: string;
  format?: 'pdf' | 'text';
  fileName: string;
}
const docWizardState = new Map<string, WizardState>();

// --- WHATSAPP API HELPERS ---
async function sendWAMessage(to: string, text: string) {
    const url = `https://graph.facebook.com/v17.0/${process.env.WA_PHONE_NUMBER_ID}/messages`;
    try {
        await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.WA_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to,
                type: "text",
                text: { body: text }
            })
        });
    } catch (e: any) {
        console.error(`[WA] Failed to send message to ${to}: ${e.message}`);
    }
}

async function sendWAInteractive(to: string, text: string, buttons: { id: string, title: string }[]) {
    const url = `https://graph.facebook.com/v17.0/${process.env.WA_PHONE_NUMBER_ID}/messages`;
    try {
        await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.WA_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to,
                type: "interactive",
                interactive: {
                    type: "button",
                    body: { text },
                    action: {
                        buttons: buttons.map(b => ({
                            type: "reply",
                            reply: { id: b.id, title: b.title.substring(0, 20) }
                        }))
                    }
                }
            })
        });
    } catch (e: any) {
        console.error(`[WA] Failed to send interactive to ${to}: ${e.message}`);
    }
}

// --- VERDICT SENDING LOGIC ---
async function sendVerdictAsText(chatId: string, verdict: string, lang: 'en' | 'hi' | 'kn' = 'en') {
    let finalVerdict = verdict;

    // Translate if non-English
    if (lang !== 'en') {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
            const langName = lang === 'hi' ? 'Hindi' : 'Kannada';
            const result = await model.generateContent(
                `Translate the following legal verdict to ${langName}. Keep all legal terms, section numbers, and formatting intact. Output only the translated text.\n\n${verdict.substring(0, 3000)}`
            );
            finalVerdict = result.response.text().trim();
        } catch (e: any) {
            console.warn(`[WA] Translation failed: ${e.message}`);
        }
    }

    const clean = finalVerdict
        .replace(/```json[\s\S]*?```/g, '')
        .replace(/\{[\s\S]{0,200}\}/g, '')
        .replace(/\[[\s\S]{0,200}\]/g, '')
        .trim();

    // WhatsApp limit is usually high enough (4096), but split just in case
    const chunks: string[] = [];
    let remaining = clean;
    while (remaining.length > 0) {
        let chunk = remaining.substring(0, 3800);
        const lastPara = chunk.lastIndexOf('\n\n');
        if (lastPara > 2000) chunk = remaining.substring(0, lastPara);
        chunks.push(chunk);
        remaining = remaining.substring(chunk.length).trim();
    }

    const langLabel = lang === 'hi' ? 'Hindi (हिन्दी)' : lang === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English';
    await sendWAMessage(chatId, `⚖️ *NEXUS Tribunal — Verdict*\n🌐 Language: *${langLabel}*\n━━━━━━━━━━━━━━━━━━━━`);

    for (const chunk of chunks.slice(0, 5)) {
        await sendWAMessage(chatId, chunk);
        await new Promise(r => setTimeout(r, 500));
    }

    await sendWAMessage(chatId, `━━━━━━━━━━━━━━━━━━━━\n✅ *Analysis complete.*\n\n⚠️ _This is an AI-generated analysis for informational purposes only. Consult a qualified lawyer for legal advice._`);
}

async function startInvestigation(
    chatId: string, topic: string, username: string,
    format: 'pdf' | 'text' = 'pdf',
    lang: 'en' | 'hi' | 'kn' = 'en',
    fileName?: string
) {
    const session_id = uuidv4();
    const dashboard_url = `http://localhost:${process.env.PORT || 3001}/dashboard?session=${session_id}`;
    const userEmail = userProfiles.get(chatId)?.email || '';

    activeSessions.set(chatId, session_id);

    await sendWAMessage(chatId,
        `🚀 *Investigation Started*\n\n` +
        `🆔 Session: ${session_id.slice(0, 8)}\n` +
        `📄 Input: ${fileName ? fileName : 'Text query'}\n` +
        `📋 Output: *${format === 'pdf' ? 'PDF Report (English)' : `Text (${lang === 'hi' ? 'Hindi' : lang === 'kn' ? 'Kannada' : 'English'})`}*\n\n` +
        `🔍 50 AI agents analyzing in parallel...\n` +
        `📊 Watch Live: ${dashboard_url}`
    );

    try {
        await runPipeline(
            session_id, topic, 0, // Using 0 for chatId since WA IDs are strings
            (risk_score: number, _reason: string) => {
                pendingRiskGateChats.add(chatId);
                sendWAInteractive(chatId, `⚠️ *NEXUS Risk Gate Triggered*\n\n🔴 Risk Score: *${risk_score}/10*\n\nDo you want to continue?`, [
                    { id: `RISK_YES_${session_id}`, title: "✅ YES" },
                    { id: `RISK_NO_${session_id}`, title: "❌ NO" }
                ]);
            },
            undefined,
            async (verdict: string, documentPath?: string, driveLink?: string) => {
                if (format === 'pdf') {
                    if (driveLink) {
                        await sendWAMessage(chatId, `📄 *NEXUS Legal Analysis Report*\n\nInvestigation complete. Download your structured PDF report here:\n🔗 ${driveLink}\n\n⚠️ _AI-generated — for informational purposes only._`);
                    } else {
                        await sendWAMessage(chatId, `⚠️ Document link generation failed. Falling back to text mode.`);
                        await sendVerdictAsText(chatId, verdict, lang);
                    }
                } else {
                    await sendVerdictAsText(chatId, verdict, lang);
                }
                activeSessions.delete(chatId);
                pendingRiskGateChats.delete(chatId);
            },
            username, dashboard_url, userEmail,
            format === 'text' // skipPdf if format is text
        );
    } catch (err: any) {
        const msg = err.message || "Pipeline failed";
        if (!msg.includes("cancelled")) {
            await sendWAMessage(chatId, `❌ *Investigation Failed*\n\n${msg}`);
        }
        activeSessions.delete(chatId);
        pendingRiskGateChats.delete(chatId);
    }
}


// --- WEBHOOK ENDPOINTS ---
whatsappRouter.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === process.env.WA_VERIFY_TOKEN) {
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

whatsappRouter.post("/webhook", async (req, res) => {
    res.sendStatus(200); // Always ack immediately

    try {
        const body = req.body;
        if (body.object !== "whatsapp_business_account") return;

        for (const entry of body.entry) {
            for (const change of entry.changes) {
                if (change.field !== "messages") continue;
                const value = change.value;
                if (!value.messages) continue;

                for (const msg of value.messages) {
                    const chatId = msg.from; // Phone number string

                    // 1. Handle interactive buttons
                    if (msg.type === "interactive" && msg.interactive.type === "button_reply") {
                        const data = msg.interactive.button_reply.id;

                        // Risk Gate
                        if (data.startsWith("RISK_YES_")) {
                            const sessionId = data.replace("RISK_YES_", "");
                            approveRiskGate(sessionId);
                            pendingRiskGateChats.delete(chatId);
                            await sendWAMessage(chatId, `✅ *Risk Gate Approved* — Pipeline resuming...`);
                            continue;
                        }
                        if (data.startsWith("RISK_NO_")) {
                            const sessionId = data.replace("RISK_NO_", "");
                            cancelRiskGate(sessionId);
                            pendingRiskGateChats.delete(chatId);
                            activeSessions.delete(chatId);
                            await sendWAMessage(chatId, `🛑 Analysis cancelled.`);
                            continue;
                        }

                        // Wizard Step 1: Format
                        if (data === "DOC_FORMAT_PDF" || data === "DOC_FORMAT_TEXT") {
                            const wizard = docWizardState.get(chatId);
                            if (!wizard) {
                                await sendWAMessage(chatId, "❌ Session expired. Please type your query again.");
                                continue;
                            }

                            wizard.format = data === 'DOC_FORMAT_PDF' ? 'pdf' : 'text';
                            wizard.step = 'AWAITING_LANGUAGE';
                            docWizardState.set(chatId, wizard);

                            if (wizard.format === 'pdf') {
                                await sendWAMessage(chatId, `📄 *PDF Report selected*\n\n📋 Your report will be generated in *English* with full structured formatting.\n\n🚀 Starting 50-agent tribunal now...`);
                                const profile = userProfiles.get(chatId);
                                const tgUser = profile ? `${profile.name} (${profile.email})` : chatId;
                                await startInvestigation(chatId, wizard.extractedText, tgUser, 'pdf', 'en', wizard.fileName);
                                docWizardState.delete(chatId);
                            } else {
                                await sendWAInteractive(chatId, `*Step 2 of 2:* Choose the language for your verdict:`, [
                                    { id: 'LANG_EN', title: "🇬🇧 English" },
                                    { id: 'LANG_HI', title: "🇮🇳 Hindi (हिन्दी)" },
                                    { id: 'LANG_KN', title: "🇮🇳 Kannada (ಕನ್ನಡ)" }
                                ]);
                            }
                            continue;
                        }

                        // Wizard Step 2: Language
                        if (data === "LANG_EN" || data === "LANG_HI" || data === "LANG_KN") {
                            const wizard = docWizardState.get(chatId);
                            if (!wizard) {
                                await sendWAMessage(chatId, "❌ Session expired. Please type your query again.");
                                continue;
                            }
                            const lang = data === 'LANG_EN' ? 'en' : data === 'LANG_HI' ? 'hi' : 'kn';
                            const langLabel = lang === 'hi' ? 'Hindi' : lang === 'kn' ? 'Kannada' : 'English';

                            await sendWAMessage(chatId, `💬 *Text Mode selected*\n\n🌐 Language: *${langLabel}*\n\n🚀 Starting 50-agent tribunal now...`);
                            const profile = userProfiles.get(chatId);
                            const tgUser = profile ? `${profile.name} (${profile.email})` : chatId;
                            await startInvestigation(chatId, wizard.extractedText, tgUser, 'text', lang, wizard.fileName);
                            docWizardState.delete(chatId);
                            continue;
                        }
                    }

                    // 2. Handle simple text
                    if (msg.type === "text") {
                        const rawText = msg.text.body.trim();
                        const textUpper = rawText.toUpperCase();

                        // Registration Flow
                        if (registrationState.has(chatId)) {
                            const state = registrationState.get(chatId);
                            if (state === 'AWAITING_NAME') {
                                userProfiles.set(chatId, { name: rawText, email: '' });
                                registrationState.set(chatId, 'AWAITING_EMAIL');
                                await sendWAMessage(chatId, `Nice to meet you, *${rawText}*!\n\nNow please enter your *Email Address* (for legal records):`);
                                continue;
                            }
                            if (state === 'AWAITING_EMAIL') {
                                const profile = userProfiles.get(chatId)!;
                                profile.email = rawText;
                                registrationState.delete(chatId);
                                await sendWAMessage(chatId, `✅ *Registration Complete*\n\nThank you! Your details will be attached to all generated legal records.\n\nYou can now type your query to begin.`);
                                continue;
                            }
                        }

                        // Must be registered
                        if (!userProfiles.has(chatId)) {
                            registrationState.set(chatId, 'AWAITING_NAME');
                            await sendWAMessage(chatId, `🔮 *Welcome to NEXUS*\n\nBefore we begin, please tell me your *Full Name*:`);
                            continue;
                        }

                        // Risk Gate
                        if (pendingRiskGateChats.has(chatId)) {
                            if (textUpper === "YES") {
                                const sessionId = activeSessions.get(chatId);
                                if (sessionId) approveRiskGate(sessionId);
                                pendingRiskGateChats.delete(chatId);
                                await sendWAMessage(chatId, `✅ *Approved!* Pipeline resuming...`);
                            } else if (textUpper === "NO") {
                                const sessionId = activeSessions.get(chatId);
                                if (sessionId) cancelRiskGate(sessionId);
                                pendingRiskGateChats.delete(chatId);
                                activeSessions.delete(chatId);
                                await sendWAMessage(chatId, "🛑 Analysis cancelled.");
                            } else {
                                await sendWAMessage(chatId, "Please reply *YES* or *NO*.");
                            }
                            continue;
                        }

                        if (activeSessions.has(chatId)) {
                            await sendWAMessage(chatId, `⏳ Investigation in progress. Please wait.`);
                            continue;
                        }

                        // Start Wizard
                        docWizardState.set(chatId, {
                            step: 'AWAITING_FORMAT',
                            extractedText: rawText,
                            fileName: 'Text Query'
                        });

                        await sendWAInteractive(chatId, `*Step 1 of 2:* How would you like to receive your verdict?`, [
                            { id: "DOC_FORMAT_PDF", title: "📄 PDF Report" },
                            { id: "DOC_FORMAT_TEXT", title: "💬 Text Message" }
                        ]);
                    }

                    // To keep things simple, we don't handle audio/document parsing yet.
                    // If user wants document processing, they can use Telegram/Web, or we can add it later.
                }
            }
        }
    } catch (err: any) {
        console.error(`[WA] Webhook processing error:`, err);
    }
});
