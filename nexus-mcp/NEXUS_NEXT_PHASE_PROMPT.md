# Upcoming Task: Interactive Telegram Menus & WhatsApp Bot Integration

**Context**: 
We are expanding the NEXUS Multi-Agent Legal Investigation platform. Currently, the user has to type `/investigate <topic>` in Telegram. We are moving to a conversational, menu-driven approach across two platforms: Telegram and WhatsApp.

## Objective 1: Interactive Telegram Bot (No-Command Flow)
Refactor `bot/telegram.ts` to replace the rigid slash-command approach with an interactive, state-driven conversation.

**Requirements:**
1. **Main Menu on `/start`:** When the user types `/start`, the bot should reply with an Inline Keyboard containing the multiple solutions from our problem statement (e.g., Solution A: Legal Analysis, Solution B: Rapid Risk Check, Solution C: Document Review).
2. **State Machine / Session Management:** 
   - When a user clicks a specific solution button (via `callback_query`), the bot must ask: *"Please provide your query or upload your document for [Solution Name]."*
   - The bot needs to track that this `chatId` is currently in the `AWAITING_QUERY` state over the specific solution.
3. **No-Command Querying:** 
   - When the user sends a regular text message (or a voice note/document) without a `/` command, the bot should check the state machine. 
   - If they are in `AWAITING_QUERY`, extract the query and pass it to pipelines with the context of the solution they selected.

## Objective 2: WhatsApp Integration & Interactive Messages
Create a new integration for WhatsApp (e.g., in `bot/whatsapp.ts`) alongside Telegram. Assuming the use of the Meta Cloud API or Twilio for WhatsApp Business.

**Requirements:**
1. **Webhook Setup:** Set up `POST /api/whatsapp/webhook` in `server.ts` to receive incoming WhatsApp messages.
2. **Interactive Menus:** 
   - Implement WhatsApp Interactive Messages (Reply Buttons or List Messages) for the Main Menu. 
   - When users message the WhatsApp bot, it should present the same multi-solution menu as Telegram.
3. **Auto-Question Flow:** 
   - Incorporate the same state machine logic. Allow the user to select an interactive button, then prompt them for text/audio input.
   - Add targeted "auto-questions" in WhatsApp (e.g. "Who is the opposing party?" or "What is the jurisdiction?") depending on the solution chosen before triggering the 50-agent pipeline.
4. **Media Handling:** Handle WhatsApp audio messages (OGG format) and PDF document media URLs, downloading and parsing them to text just like we do for Telegram.

## Instructions for implementation:
- Review the existing `bot/telegram.ts` to see how `userProfiles` and `activeSessions` are currently managed. We'll need a unified State Machine (e.g., `lib/userState.ts`) that handles state for BOTH Telegram (`chatId`) and WhatsApp (`phoneNumber`).
- Keep the existing 50-agent orchestration in `agents/pipeline.ts` intact, but allow passing a `solutionType` flag so the Supreme Judge knows what kind of output is expected.
- First, map out the State Machine architecture. Then, modify the Telegram UI. Finally, build the WhatsApp webhook and hook it into the same pipeline.
