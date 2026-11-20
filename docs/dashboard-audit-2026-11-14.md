# Laptop dashboard audit — 14 November 2026

Test target: http://127.0.0.1:3001/. Production dashboard rebuilt and synchronized.

## Page coverage

| Page | Checks |
| --- | --- |
| Overview | 3D canvas, camera views, participants, navigation, fullscreen and clear view |
| AI assistant | Questions, history, upload context, failure/draft recovery, safe rendering, language persistence, accessibility |
| Case workspace | Filters, search, report modal, download, close, investigation and review events |
| Documents | Actual PDF/TXT extraction, library search, PDF page anchors, failure/retry without stale results |
| Virtual courtroom | Agent selection, reload, introductions, stop, live specialist events, final findings |
| Agent network | Search, mobile navigation, Criminal Law profile and specialist handoff |
| Connected devices | Rendering, missing values, database-error messages, limited report-link comparison |
| Voice and document scan | Configured online voice, camera permission errors, capture/retake/review, reset, audio failure without blocking camera |

## Changes

- Laptop scan page uses the configured online voice instead of a separate browser-only voice.
- Camera opening and analysis submission no longer wait for spoken announcements.
- Questions from the scan page use the grounded assistant API, selected language and bounded conversation history.
- Increased scan-page document context from 3,000 to 20,000 characters; timeout protections and guards prevent late capture/question results from restoring reset sessions.
- Failed document analysis preserves the captured image for retry; resets clear history and stop speech.
- Exit phrases match complete utterances instead of substrings within a question.
- Chat language survives navigation; law searches clear outdated results after failure.
- Missing sensor readings display as unavailable rather than zero/clear/stable. Read errors are shown.
- The report chain control describes comparison of stored links only, not cryptographic verification.
- Grounded answers check requested script, retry obvious mismatches once, unwrap translation JSON, and return localized fallback when mismatch persists. This is a script heuristic, not proof of translation accuracy.
- Optional external integration SDK loads only when needed.

## Live service evidence

- Library: ready, 16 documents and 3,471 passages.
- Consumer-refund retrieval: six sources, approximately 238 ms.
- Synthetic document question: correct 21 May 2027 deadline and Page 2 citation, approximately 1.46 seconds in English.
- Hindi and Tamil synthetic questions returned the correct deadline and Page 2 reference in their requested scripts.
- Kannada initially returned Burmese. This prompted the script-validation fix; subsequent live retry returned Kannada and Page 2. Translation wrapping was then corrected and covered by regression tests.
- English, Hindi, Kannada and Tamil speech endpoints returned nonempty audio/wav, HTTP 200, approximately 787–1,022 ms for short phrases. These timings measure full HTTP audio delivery, not microphone-to-speaker latency.

## Boundaries of verification

The browser tests use synthetic case records and mocked AI/Telegram events for repeatability and cost control, except the actual PDF/TXT parsing and listed live API checks. No new message was sent to a Telegram recipient during this audit. Browser camera frames are synthetic; physical microphone transcription, speaker audibility, real-document OCR accuracy and RFID were not reverified on the laptop in this pass.

The laptop scan entry remains a demo entry. Private RFID/PIN case access belongs to the separate UNO Q kiosk, and encrypted central case-history integration remains unfinished. Device rendering is tested; a live sensor feed is not confirmed. The document library is a selected corpus, not all Indian law. This audit does not establish correctness of every legal answer, every language, or every possible use case.

## Reproduce

From nexus-mcp: `npm test`.

From nexus-mcp/dashboard-react: `npm run lint` and `npm run build`.

For browser tests, set PowerShell `$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3001'`, then run `npx playwright test tests/workspace.spec.ts --reporter=line`.

Results: 29 browser checks passed in the expanded full run; all five final changed-flow reruns passed. All 30 backend tests passed; six focused language/research tests passed after the final translation-format change. Dashboard build and lint passed. Both laptop services were started and verified after the final build: dashboard HTTP 200, library ready, and a live Kannada document answer returned plain Kannada with the correct 21 May 2027 deadline and [Page 2].
