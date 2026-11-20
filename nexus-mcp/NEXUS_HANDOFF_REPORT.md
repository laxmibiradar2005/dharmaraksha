# NEXUS AI Tribunal — Complete Technical Handoff Report

> **Project**: NEXUS — Multi-Agent AI Legal Investigation Platform  
> **Location**: `c:\Users\arya\Desktop\indian-court-room-main\indian-court-room-main\nexus-mcp\`  
> **Runtime**: Node.js 18+ (TypeScript) + Python 3.12 (PDF engine)  
> **Date**: 09 April 2026

---

## 1. Platform Overview

NEXUS is a **50-agent AI tribunal platform** that analyzes legal topics from multiple perspectives. Users interact via a **Telegram bot** (text, voice, PDF uploads). The system runs 50 specialized AI agents in parallel across 6 categories (Security, Legal, Indian Context, Research, Analysis, Debate), then a Supreme Judge AI synthesizes all inputs into a final verdict.

### End-to-End Flow

```
User Input (Telegram)
    ↓
Security Shield (threat detection)
    ↓
Input Classification (legal_document | general_topic)
    ↓
50 AI Agents (via Gemini API, parallel execution)
    ├── Research Agents
    ├── Legal Agents
    ├── Indian Context Agents
    ├── Analysis Agents
    └── Debate Agents (Prosecution + Defense)
    ↓
Risk Gate (score > 7 → requires user approval)
    ↓
Supreme Judge AI (final synthesis)
    ↓
Output Pipeline (parallel):
    ├── PDF Report (PyMuPDF, multilingual)
    ├── Telegram (send PDF document)
    ├── Google Drive (upload PDF)
    ├── Google Sheets (append row)
    ├── Supabase (persist session)
    ├── Gmail (send HTML report to user's email)
    └── WebSocket (broadcast to dashboard)
```

---

## 2. File-by-File Architecture

### 2.1 Root & Config

| File | Purpose |
|------|---------|
| `server.ts` | Express server entry point. Registers all API routes, initializes WebSocket, starts Telegram bot. Port: `3001` |
| `package.json` | Dependencies: `@google/generative-ai`, `@supabase/supabase-js`, `composio-core`, `node-telegram-bot-api`, `better-sqlite3`, `docx`, `ws`, `express` |
| `tsconfig.json` | TypeScript config |
| `.env` | All API keys and secrets (see Section 4) |
| `vercel.json` | Vercel deployment config (MCP tool routes) |

### 2.2 `agents/` — AI Agent System

| File | Size | Purpose |
|------|------|---------|
| `registry.ts` | 56 KB | **THE CORE**: Defines all 50 AI agent system prompts. Each agent has a `name`, `role`, `systemPrompt`, and `category`. Categories: `security`, `legal`, `indian_context`, `research`, `analysis`, `debate` |
| `pipeline.ts` | 17.5 KB | **Main orchestrator**. `runPipeline()` is the entry function. Flow: sanitize → detect type → run orchestration (50 agents) → risk gate → judge → generate PDF → run Composio saves. Accepts `user_email` parameter throughout |
| `judgeAgent.ts` | 4.8 KB | Supreme Judge AI — synthesizes all agent outputs into a structured verdict with confidence score and risk level |
| `legalAgent.ts` | 5.3 KB | Legal analysis agent runner |
| `researchAgent.ts` | 6.4 KB | Research agent runner |
| `devilsAdvocate.ts` | 3.8 KB | Devil's Advocate agent — challenges the main verdict |

### 2.3 `lib/` — Core Libraries

| File | Size | Purpose |
|------|------|---------|
| `orchestrator.ts` | 10.6 KB | Runs all 50 agents in parallel using `Promise.allSettled()`. Returns structured results with timing data, risk scores, and per-agent outputs |
| `composioTools.ts` | 18.2 KB | **Composio SDK integration**. Functions: `saveToGoogleDrive()`, `uploadPdfToDrive()`, `logToGoogleSheets()`, `sendGmailAlert()`, `sendReportEmail()`, `scheduleCalendarEvent()`, `runComposioSaves()` |
| `supabaseClient.ts` | 5.9 KB | **Supabase integration**. `saveToSupabase()` inserts session data. `getRecentSessions()` queries for dashboard. Auto-table-creation attempted via RPC (requires manual SQL — see Section 5) |
| `documentGenerator.ts` | 3.1 KB | Orchestrates PDF generation. `saveDocumentToFile()` calls `pdf_generator.py` via `child_process.execSync()`. Includes `detectLanguage()` for auto-detecting Hindi/Kannada/Telugu/Tamil from Unicode ranges |
| `pdf_generator.py` | 19.4 KB | **Python PDF engine** (PyMuPDF/fitz). Generates professional 5-page legal reports with cover page, metadata table, and body content. Supports 5 languages: English, Hindi, Kannada, Telugu, Tamil. Uses `Nirmala UI` TTC font for Indic scripts via `fitz.TextWriter` |
| `securityShield.ts` | 15.8 KB | Multi-layer security: prompt injection detection, PII detection, threat classification. Blocks malicious inputs before they reach the AI agents |
| `sessionStore.ts` | 10.1 KB | SQLite-based session persistence using `better-sqlite3`. Stores session state, events timeline, per-agent outputs |
| `audioProcessor.ts` | 1.3 KB | Processes Telegram voice notes. Downloads OGG file, sends to Gemini for transcription |
| `router.ts` | 2.5 KB | Input routing logic — classifies input as legal document or general topic |
| `websocket.ts` | 1.1 KB | WebSocket server for real-time dashboard updates. `broadcast()` sends events to all connected clients |
| `mcpWrapper.ts` | 1.3 KB | MCP protocol wrapper for tool API calls |
| `agentRunner.ts` | 7.6 KB | Generic agent execution engine. Calls Gemini API with system prompts from registry |

### 2.4 `bot/` — Telegram Bot

| File | Size | Purpose |
|------|------|---------|
| `telegram.ts` | 19 KB | Full Telegram bot implementation. Handles `/start`, `/investigate`, document uploads (PDF/TXT), voice notes, and risk gate YES/NO responses. Registration flow: collects Name → Email → stores in `userProfiles` Map. Auto-reconnect on polling errors |

**Key data structures in telegram.ts:**
```typescript
const activeSessions = new Map<number, string>();        // chatId → sessionId
const pendingRiskGateChats = new Set<number>();           // chats awaiting YES/NO
const registrationState = new Map<number, 'AWAITING_NAME' | 'AWAITING_EMAIL'>();
const userProfiles = new Map<number, { name: string; email: string }>();
```

### 2.5 `api/` — MCP Tool Endpoints

| File | Purpose |
|------|---------|
| `api/index.ts` | Health check endpoint |
| `api/tools/wikipedia.ts` | Wikipedia search tool |
| `api/tools/news.ts` | News API search (NewsData.io) |
| `api/tools/reddit.ts` | Reddit search tool |
| `api/tools/factcheck.ts` | Google Fact Check API |
| `api/tools/hibp.ts` | Have I Been Pwned API |
| `api/tools/geolocation.ts` | Google Geolocation API |

### 2.6 `dashboard-react/` — Web Dashboard

React + Vite frontend. Provides a real-time investigation dashboard with WebSocket streaming.

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main dashboard component (27 KB) |
| `src/App.css` | Dashboard styling (20 KB) |
| `src/components/Messenger.tsx` | Chat interface component |

### 2.7 Generated Outputs

| Directory/File | Purpose |
|------|---------|
| `generated_documents/` | All generated PDF reports are saved here |
| `nexus.db` | SQLite database (session store) |

---

## 3. Data Flow: Investigation Lifecycle

### 3.1 Telegram → Pipeline → Output

```
1. User sends /start → bot asks for Name
2. User sends name → bot asks for Email
3. User sends email → saved to userProfiles Map
4. User sends /investigate <topic> OR voice note OR PDF
5. telegram.ts → startInvestigation()
   ├── userEmail = userProfiles.get(chatId)?.email
   └── runPipeline(sessionId, topic, chatId, ..., userEmail)

6. pipeline.ts → runPipeline()
   ├── Security Shield check
   ├── Input classification (legal_document | general_topic)
   ├── runOrchestration() → 50 agents in parallel via Gemini
   ├── Risk Gate (if risk_score > 7 → ask user YES/NO)
   ├── Supreme Judge synthesis
   ├── saveDocumentToFile() → Python PDF generator
   └── runComposioSaves() → parallel:
       ├── Upload PDF to Google Drive
       ├── Log to Google Sheets
       ├── Save to Supabase
       └── Send HTML email to user's registered email

7. telegram.ts → onComplete callback
   └── bot.sendDocument(chatId, pdfPath)
```

### 3.2 Email Flow

```
sendReportEmail(sessionData, driveLink, documentPath)
  ├── TO_EMAIL = sessionData.user_email || process.env.ADMIN_EMAIL
  ├── Builds HTML email with:
  │   ├── Dark blue header banner
  │   ├── Metadata table (Reference, Date, User, Topic, Confidence, Risk)
  │   ├── PDF Drive link (if available)
  │   └── Verdict summary (first 1500 chars)
  └── Sends via Composio GMAIL_SEND_EMAIL action
```

### 3.3 PDF Generation Flow

```
documentGenerator.ts → saveDocumentToFile()
  ├── detectLanguage(verdictText) → 'en'|'hi'|'kn'|'te'|'ta'
  ├── Builds JSON payload: {sessionId, verdict, confidence, riskLevel, outputPath, language}
  └── execSync('python lib/pdf_generator.py', {input: JSON})

pdf_generator.py receives JSON on stdin:
  ├── draw_cover_page() using fitz.TextWriter + fitz.Font
  │   ├── English: Times-Bold, Helvetica fonts
  │   └── Indic: Nirmala UI (C:\Windows\Fonts\Nirmala.ttc)
  │       Supports: Hindi (Devanagari), Kannada, Telugu, Tamil
  ├── Markdown → HTML conversion (**, ##, -, bullets)
  ├── fitz.Story(html) → paginated body content
  ├── Header/Footer on each page with reference number
  └── Outputs JSON: {"success": true, "path": "..."}
```

---

## 4. Environment Variables (`.env`)

```env
# AI
GEMINI_API_KEY=AIzaSyCkFNlX0OqUXwpd-aeqvelqTAYfrNEpZ28

# External APIs
NEWS_API_KEY=pub_44ad9a0dc9284e4486cd29a58d72dbae
FACTCHECK_API_KEY=AIzaSyCSTabepoZfJo888Bjys91TWnwq73kkZ8E
GEOLOCATION_API_KEY=AIzaSyDia5Idhfi54QhmLA5c9UySEqK_hu3U630

# Telegram
TELEGRAM_BOT_TOKEN=8602058972:AAGBIrfnaJx3tdqGBVMGt_InSQEObn65FFQ

# Composio (Google Drive, Sheets, Gmail, Calendar)
COMPOSIO_API_KEY=ak_Cb1O5leJoouLG13cTAJs
COMPOSIO_USER_ID=pg-test-572ee157-7fa5-4d74-90c2-8a647e72b140
GOOGLE_SHEET_ID=12kKz1g0ZYeTLNGK1fpjzjm9IyU7y2PmnvzuRPO4NfV4
GOOGLE_DRIVE_FOLDER_ID=1_FoNHylPJFuGFAL310FZgvAE6hcRiEu8
ADMIN_EMAIL=sameraaryaadb@gmail.com

# Supabase (replaced Notion)
SUPABASE_URL=https://nzvennadndumvkzkkfci.supabase.co
SUPABASE_KEY=sb_publishable_MDk95OktZCINw_yLlgQFRA_YzXLHleP

PORT=3001
```

---

## 5. Supabase Schema

> **IMPORTANT**: The table must be created manually via the Supabase SQL Editor. The SDK cannot auto-create tables with the `anon` key.

```sql
CREATE TABLE IF NOT EXISTS nexus_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  topic TEXT,
  input_type TEXT,
  confidence INTEGER DEFAULT 0,
  risk_level TEXT DEFAULT 'low',
  risk_score INTEGER DEFAULT 0,
  verdict TEXT,
  shield_blocked BOOLEAN DEFAULT FALSE,
  risk_gate_triggered BOOLEAN DEFAULT FALSE,
  user_name TEXT,
  user_email TEXT,
  drive_link TEXT,
  document_path TEXT,
  language TEXT DEFAULT 'en'
);
```

---

## 6. Composio Integration Details

Composio is the middleware SDK that connects to Google services. All actions use `executeComposioAction()` which resolves connected account IDs via `composio.connectedAccounts.list()`.

### Connected Apps

| App | Actions Used | Purpose |
|-----|-------------|---------|
| `googledrive` | `GOOGLEDRIVE_CREATE_FILE_FROM_TEXT`, `GOOGLEDRIVE_UPLOAD_FILE` | Save reports to shared Drive folder |
| `googlesheets` | `GOOGLESHEETS_SPREADSHEETS_VALUES_APPEND` | Append session log row to tracking spreadsheet |
| `gmail` | `GMAIL_SEND_EMAIL` | Send HTML investigation report to user |
| `googlecalendar` | `GOOGLECALENDAR_QUICK_ADD`, `GOOGLECALENDAR_CREATE_EVENT` | Schedule high-risk session reviews |

### Key Functions in `composioTools.ts`

| Function | Description |
|----------|-------------|
| `saveToGoogleDrive(sessionId, content, title)` | Text-based Drive file creation |
| `uploadPdfToDrive(sessionId, filePath, title)` | Base64-encoded PDF upload to Drive |
| `logToGoogleSheets(sessionData)` | Appends a row: [timestamp, sessionId, topic, inputType, confidence, riskLevel, riskScore, shieldBlocked, riskGateTriggered, telegramUser] |
| `sendReportEmail(sessionData, driveLink, documentPath)` | Rich HTML email to user's registered email with metadata table and Drive link |
| `sendGmailAlert(subject, body)` | Simple alert email to ADMIN_EMAIL |
| `scheduleCalendarEvent(title, datePhrase)` | Google Calendar event for high-risk reviews |
| `runComposioSaves(sessionId, content, title, sessionData, pdfFilePath)` | Master function — runs Drive upload, then Sheets + Supabase + Email in parallel |

---

## 7. Multilingual PDF System

### Supported Languages

| Code | Language | Font | Script Range |
|------|----------|------|-------------|
| `en` | English | Times-Bold / Helvetica | ASCII |
| `hi` | Hindi | Nirmala UI (.ttc) | `\u0900-\u097F` (Devanagari) |
| `kn` | Kannada | Nirmala UI (.ttc) | `\u0C80-\u0CFF` |
| `te` | Telugu | Nirmala UI (.ttc) | `\u0C00-\u0C7F` |
| `ta` | Tamil | Nirmala UI (.ttc) | `\u0B80-\u0BFF` |

### Language Detection (`documentGenerator.ts`)

```typescript
function detectLanguage(text: string): string {
  const devanagari = (text.match(/[\u0900-\u097F]/g) || []).length;
  const kannada = (text.match(/[\u0C80-\u0CFF]/g) || []).length;
  // ... (Telugu, Tamil)
  const max = Math.max(devanagari, kannada, telugu, tamil);
  if (max < 20) return 'en';
  // return whichever has the most characters
}
```

### Critical Technical Details (PDF)

1. **Font Rendering**: `insert_text(fontfile=)` does NOT work with `.ttc` files — renders dots/question marks. Must use `fitz.TextWriter()` + `fitz.Font(fontfile=)` instead.
2. **TextWriter.append() does NOT support `color` kwarg** — color is set on `tw.write_text(page, color=...)`. Use separate TextWriter instances for different color groups.
3. **Notice section**: Uses manual word-wrapping with TextWriter (measures text width with `tw_test.text_rect.width`) because `insert_textbox(fontfile=)` also fails with TTC.
4. **Font path**: `C:\Windows\Fonts\Nirmala.ttc` — works on all modern Windows systems. Nirmala UI supports all 12+ Indian scripts natively.

---

## 8. Dashboard (React)

- **Framework**: React + Vite
- **Location**: `dashboard-react/`
- **Build**: `cd dashboard-react && npm run build` (compiles to `dashboard-react/dist/`)
- **Main component**: `src/App.tsx` (27 KB) — full investigation dashboard with real-time WebSocket updates
- **Build status**: ✅ Compiles successfully (716ms, no errors)

---

## 9. How to Run

```bash
# 1. Install dependencies
cd nexus-mcp
npm install

# 2. Ensure Python has PyMuPDF
pip install pymupdf

# 3. Create Supabase table (run SQL from Section 5 in Supabase dashboard)

# 4. Start server
npm run dev
# → Server: http://localhost:3001
# → Dashboard: http://localhost:3001/dashboard
# → Telegram bot auto-starts
```

---

## 10. Known Issues & Gotchas

### Must Fix
1. **Supabase table not created** — Must run the `CREATE TABLE` SQL manually in the Supabase SQL Editor. The SDK's `anon` key doesn't have permission to create tables via RPC.
2. **User profiles are in-memory** — `userProfiles` Map in `telegram.ts` is lost on server restart. Consider persisting to Supabase.

### Working But Fragile
3. **Telegram polling** — Uses `polling: true` with auto-reconnect on `ECONNRESET`. May fail if the server IP is blocked by Telegram. Consider switching to webhooks for production.
4. **Composio connected accounts** — Cached in memory via `accountIdCache`. If a connected account is re-authorized, the cache must be cleared (restart server).
5. **PDF font path** — Hardcoded to `C:\Windows\Fonts\Nirmala.ttc`. Will fail on Linux/Mac. For cross-platform: bundle a Noto Sans font or use environment variable.

### Not Yet Implemented
6. **Dashboard → Supabase** — The web dashboard still reads from local SQLite (`sessionStore.ts`). Should be updated to use `getRecentSessions()` from `supabaseClient.ts`.
7. **PDF body text in Indic languages** — The cover page labels render in Hindi/Kannada, but the Story HTML body uses CSS `@font-face` which may or may not resolve the TTC correctly. If body text shows wrong glyphs, the Story section also needs the TextWriter approach.
8. **Voice note language** — Voice notes are transcribed via Gemini. The AI responds in the same language as the voice, but language detection runs on the verdict text (not the input).

---

## 11. Key Dependencies & Versions

| Package | Version | Purpose |
|---------|---------|---------|
| `@google/generative-ai` | ^0.21.0 | Gemini API for all 50 agents |
| `@supabase/supabase-js` | ^2.102.1 | Supabase database client |
| `composio-core` | ^0.5.39 | Google Drive, Sheets, Gmail, Calendar |
| `node-telegram-bot-api` | ^0.66.0 | Telegram bot polling |
| `better-sqlite3` | ^12.8.0 | Local SQLite session store |
| `docx` | ^9.6.1 | (Legacy, now using PyMuPDF for PDF) |
| `express` | ^4.21.2 | HTTP server |
| `ws` | ^8.16.0 | WebSocket for dashboard |
| Python `fitz` (PyMuPDF) | latest | PDF generation engine |

---

## 12. API Routes Summary

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/health` | Health check |
| GET | `/api/sessions` | List all sessions |
| GET | `/api/sessions/:id` | Get session by ID |
| GET | `/api/stats` | Database statistics |
| POST | `/api/pipeline/start` | Start investigation (n8n integration) |
| POST | `/api/pipeline/risk-response` | Approve/cancel risk gate |
| POST | `/api/dashboard/saved` | Notify dashboard of saved report |
| GET | `/api/tools/wikipedia` | Wikipedia search MCP tool |
| GET | `/api/tools/news` | News search MCP tool |
| GET | `/api/tools/factcheck` | Fact check MCP tool |
| GET | `/api/tools/reddit` | Reddit search MCP tool |
| GET | `/api/tools/hibp` | HIBP breach check MCP tool |
| GET | `/api/tools/geolocation` | Geolocation MCP tool |

---

## 13. Test Results (09 April 2026)

| Test | Status |
|------|--------|
| English PDF generation (5 pages, 152 KB) | ✅ PASS |
| Hindi PDF — Devanagari rendering (810 KB) | ✅ PASS |
| Kannada PDF — Kannada script rendering (810 KB) | ✅ PASS |
| Supabase connection | ✅ PASS (table needs manual creation) |
| Language detection (en, hi, kn) | ✅ PASS |
| All API keys loaded | ✅ PASS |
| Dashboard React build (716ms) | ✅ PASS |

---

*End of handoff report. This document contains everything needed to understand, modify, and extend the NEXUS platform.*
