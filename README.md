# Dharmaraksha

An Indian legal research workspace with a conversational AI assistant, document review, case history, and a live 3D tribunal of 51 specialist roles. AI output is research assistance, not a court ruling or professional legal advice.

## Run locally

Use Node.js 22 or newer. From `nexus-mcp`:

```powershell
npm ci
npm run build
cd dashboard-react
npm ci
npm run build
cd ..
npm start
```

Open **http://localhost:3001/dashboard/**. The frontend build copies its production output into the backend's `dashboard` directory on Windows, macOS, and Linux.

For frontend development, run `npm run dev` inside `nexus-mcp/dashboard-react` and open **http://localhost:5173**. Keep the backend running on port 3001; Vite proxies both `/api` and `/ws`.

To preview without starting the existing Telegram integration:

```powershell
$env:DISABLE_OUTBOUND_INTEGRATIONS = 'true'
npm start
```

This flag skips automatic Telegram polling. It does not disable the existing pipeline's report, email, hardware, or webhook actions. The dedicated assistant endpoint does not invoke those integrations.

## AI configuration

The assistant uses the server-side `GEMINI_API_KEY` in `nexus-mcp/.env` with budget-limited `gemini-2.5-flash-lite`. No provider key is embedded in the frontend. The assistant supports English, Hindi, Kannada, and Tamil; PDF, DOCX, TXT, and Markdown attachments. The economy provider bounds conversation history to four messages. Documents are sent to the configured model when a question is submitted. Conversation state is kept in browser memory and clears when the page is reloaded.

**Verification on 13 November 2026:** replacement Gemini and Sarvam credentials passed live response/audio checks. Local RAG now contains 16 official public-law/judgment snapshots and 3,471 passages in embedded PostgreSQL/pgvector. The laptop service is connected to UNO Q. Coverage is incomplete and citations require human verification. See [PostgreSQL RAG setup and architecture](docs/RAG-POSTGRES.md) and [RAG and budget details](docs/rag-and-budget.md). Keep provider keys private and untracked.

## UNO Q deployment

Follow [the UNO Q setup guide](docs/UNO-Q-SETUP.md) for exact code locations, Linux installation, automatic startup, ESP32 wiring, Bluetooth setup and physical acceptance checks. See [the test report](docs/TEST-REPORT.md) for verified coverage and unfinished components. The Node application runs on UNO Q Linux; the existing reader sketch stays on the ESP32-S3.

## Project map

The [kiosk architecture and implementation status](docs/kiosk-architecture.md) describes the confirmed UNO Q, Firebase, RFID + PIN, Sarvam, Gemini and laptop RAG design. The [architecture diagram](docs/kiosk-architecture.svg) is a target design; authentication, encrypted user vaults and physical device integration are not deployed. Exact existing pin assignments are preserved in the [ESP32 handoff](hardware/DharmarakshaReader/README.md).

Set `RAG_SERVER_URL` to route assistant questions through the laptop RAG contract, and `LOCAL_LLM_URL` to enable fallback after an online failure. The laptop RAG service and UNO Q local fallback are configured in this installation. `SARVAM_API_KEY` enables online Sarvam courtroom introductions; the legacy voice scanner still uses browser speech. See the architecture document for remaining integration work and configuration.

| Area | Location | Responsibility |
| --- | --- | --- |
| React / Vite workspace | `nexus-mcp/dashboard-react/src` | Overview, assistant, cases, documents, agent directory, 3D courtroom, voice and devices |
| Express API | `nexus-mcp/server.ts` | HTTP routes, file parsing, sessions, pipeline entry points, static dashboard |
| Conversational assistant | `nexus-mcp/api/assistant.ts` | Input validation and a bounded, server-side Gemini conversation |
| Investigation engine | `nexus-mcp/agents` | Agent registry, routing, parallel research, debate, and synthesis |
| Live events | `nexus-mcp/lib/websocket.ts` | Session-tagged updates, consumed by the dashboard |
| Persistence | `nexus-mcp/lib/sessionStore.ts` | SQLite cases, events, agent outputs, and security records |
| Integrations | `nexus-mcp/bot`, `lib`, `server` | Existing Telegram, WhatsApp, Firebase, reporting and automation integrations |

## Validation

```powershell
# Backend build and assistant request validation
cd nexus-mcp
npm test

# Frontend typecheck, production build, and lint
cd dashboard-react
npm run build
npm run lint

# Keep backend running; the test runner starts/reuses Vite.
npm run test:e2e
```

Browser tests use Microsoft Edge by default. Set `PLAYWRIGHT_BROWSER_CHANNEL` to an installed Playwright channel if needed. Tests mock AI replies and investigation execution to avoid live provider billing and outbound report delivery. TXT and PDF parsing tests exercise the real local server. Physical NFC, cameras, microphones, external report delivery, and the full paid multi-agent pipeline require separate integration testing.

## Consolidation and visual design

The maintained project is this top-level `indian-court-room-main` folder. Both original frontends built. The nested copy supplied useful fixes to verdict persistence, multilingual voice context, backend compilation, document delivery, and the development WebSocket proxy; these were merged here. Eleven unique investigations and their 43 events were imported, leaving 162 cases; 20 unique report files were preserved. SQLite integrity check passed. Project reference PDFs were organized into `docs`.

**Cleanup limitation:** automatic approval review rejected both recursive-deletion attempts, including the exact verified path. The redundant sibling `darma rakshak ksit` directory remains on disk and is not used by the updated app. Deleting it requires a user action outside this execution policy. All needed source changes, reports, and unique case records have already been preserved here.

Recovery data lives in the ignored `.local-history` directory: both pre-change Git patches, the duplicate's Git bundle and local database/environment archive, the primary database backup, and screenshots. It contains private local configuration and must remain untracked. The existing primary email settings were kept; the duplicate's differing settings remain in the local archive.

The default page is a full-screen, interactive courtroom with a raised judge’s bench, counsel desks, witness stand, gallery seating, wood panelling, coffered ceiling, Indian flags, and warm lighting. Four animated camera presets show the gallery, bench, counsel, and a roofless overview. Drag to orbit, scroll or pinch to zoom, select a participant, follow the active speaker, start a camera tour, or enter browser fullscreen. Participant profiles also have keyboard-accessible controls. Live activity, human review, and findings stay connected to the existing case pipeline. The assistant and case workspace remain accessible from the top navigation.

The room uses procedural geometry and a small local wood texture. Reduced-motion preferences stop character idle motion and make camera changes immediate. WebGL errors show a fallback while navigation remains available. The replaced landing/scales scene, old courtroom, old camera/messenger code, unused chatbot, free controls, and template artwork were removed.

Design references: [Supreme Court courtroom photographs](https://www.sci.gov.in/ceremonial-bench/), [Spline's interactive 3D examples](https://spline.design/examples), and [Three.js material examples](https://threejs.org/examples/). This is an original, stylized court interior, not a digital replica of a particular court.

This remains a local project setup. Authentication, multi-user authorization, production deployment, current-law retrieval, and external integration credentials were outside this UI/consolidation pass.

## Implemented local RAG and budget controls

See [RAG setup, costs and corpus coverage](docs/rag-and-budget.md). The local library now powers the assistant; the earlier architecture status table predates this implementation.
