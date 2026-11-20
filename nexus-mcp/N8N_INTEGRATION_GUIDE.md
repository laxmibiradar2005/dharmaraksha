# NEXUS ↔ n8n Integration Guide — Step by Step

## Architecture Overview

```
Telegram User → n8n Telegram Trigger → NEXUS Backend API → Pipeline runs
                                                              ↓
                                           n8n webhooks ←┐   (risk gate, complete, error)
                                              ↓          │
                                   Google Sheets/Docs ←───┤
                                   Notion Database   ←───┤
                                   Airtable          ←───┘
                                              ↓
                                   Telegram Verdict → User
```

---

## Step 1 — Add Environment Variables

Add these to your `.env` file:

```env
# n8n webhook base URL (your n8n instance)
N8N_WEBHOOK_URL=http://localhost:5678/webhook

# Your backend URL (n8n calls this)
BACKEND_URL=http://localhost:3001

# Dashboard URL (sent to users)
DASHBOARD_URL=http://localhost:3001/dashboard
```

---

## Step 2 — Import the n8n Workflow

1. Open n8n (`http://localhost:5678`)
2. Go to **Workflows → Import from File**
3. Save the JSON workflow you have as `nexus-n8n-workflow.json`
4. Import it — all 20 nodes will appear

---

## Step 3 — Configure n8n Credentials

You need to set up these credentials in n8n (**Settings → Credentials**):

| Credential | What to enter |
|---|---|
| **NEXUS Telegram Bot** | Your `TELEGRAM_BOT_TOKEN` from @BotFather |
| **NEXUS Google** (Sheets/Drive) | OAuth2 with Google Cloud Console |
| **NEXUS Notion** | Internal integration token from notion.so/my-integrations |
| **NEXUS Airtable** | Personal access token from airtable.com/account |

---

## Step 4 — Replace Placeholder IDs in n8n

Find and replace these in the workflow nodes:

| Placeholder | Replace with |
|---|---|
| `YOUR_GOOGLE_SHEET_ID` | Google Sheets spreadsheet ID |
| `YOUR_DRIVE_FOLDER_ID` | Google Drive folder ID for reports |
| `YOUR_NOTION_DATABASE_ID` | Notion database ID |
| `YOUR_AIRTABLE_BASE_ID` | Airtable base ID |
| `YOUR_PERSONAL_TELEGRAM_CHAT_ID` | Your Telegram numeric chat ID |

---

## Step 5 — Create Your Google Sheet

Create a Google Sheet named "NEXUS Sessions" with these column headers in Row 1:

```
session_id | timestamp | topic | input_type | username | confidence | risk_level | risk_score | verdict | shield_blocked | risk_gate_triggered | risk_gate_approved | dashboard_url | doc_url
```

---

## Step 6 — Create Your Notion Database

Create a Notion database with these properties:

| Property | Type |
|---|---|
| Session ID | Title |
| Topic | Text |
| Input Type | Select (legal_document, general_topic) |
| Confidence | Number |
| Risk Level | Select (low, medium, high) |
| Risk Score | Number |
| User | Text |
| Dashboard URL | URL |
| Doc URL | URL |
| Timestamp | Date |

---

## Step 7 — Set n8n Environment Variables

In n8n, go to **Settings → Variables** and add:
- `BACKEND_URL` = `http://localhost:3001`
- `DASHBOARD_URL` = `http://localhost:3001/dashboard`

---

## Step 8 — Activate the Workflow

1. Click **"Activate"** on the workflow in n8n
2. Verify the webhook URLs are responding:
   - `http://localhost:5678/webhook/nexus-risk-gate`
   - `http://localhost:5678/webhook/nexus-session-complete`
   - `http://localhost:5678/webhook/nexus-error`

---

## Step 9 — Start NEXUS Backend

```bash
cd nexus-mcp
npm run dev
```

You should see:
```
◆ NEXUS MCP Server
├─ Server:    http://localhost:3001
├─ n8n API:   /api/pipeline/{start,risk-response} + /api/dashboard/saved
```

---

## Step 10 — Test the Flow

### Test 1: Text Investigation
1. Open Telegram → send `/investigate Is cryptocurrency legal in India?`
2. Watch the console for `📋 [INPUT TYPE]` and `⚠️ [RISK GATE]` logs
3. If risk ≥ 7, you'll get inline YES/NO buttons via n8n
4. After completion, check Google Sheets + Notion for the logged session

### Test 2: Document Upload
1. Upload a PDF contract or NDA to the bot
2. Bot will extract text, start the pipeline
3. Check console for `📄 [TELEGRAM] Extracted N chars from PDF`

---

## API Endpoints Reference

| Endpoint | Method | Called by | Purpose |
|---|---|---|---|
| `/api/pipeline/start` | POST | n8n | Start a new pipeline |
| `/api/pipeline/risk-response` | POST | n8n | Send YES/NO risk decision |
| `/api/dashboard/saved` | POST | n8n | Notify dashboard of saved report |

### Body formats:

```json
// POST /api/pipeline/start
{ "session_id": "...", "input": "topic or document text", "chat_id": 123, "username": "user", "dashboard_url": "..." }

// POST /api/pipeline/risk-response
{ "session_id": "...", "approved": true }

// POST /api/dashboard/saved
{ "session_id": "...", "doc_url": "https://docs.google.com/...", "status": "saved" }
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| n8n webhooks not receiving | Check `N8N_WEBHOOK_URL` in `.env`, ensure n8n is running |
| Telegram bot conflict | Only ONE bot poller should run — either n8n's "Telegram Trigger" OR NEXUS's built-in polling. **Disable n8n's "Telegram Trigger" node if using NEXUS's bot directly** |
| PDF extraction fails | Ensure `pdf-parse` is installed: `npm install pdf-parse` |
| Risk gate never triggers | Check console for `⚠️ [RISK GATE] Parsed risk_score`. Score must be ≥ 7 |
