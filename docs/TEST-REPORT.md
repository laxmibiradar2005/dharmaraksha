# Prototype verification — 13 November 2026

Testing host: Windows development laptop. No UNO Q, ESP32, USB camera/microphone or Bluetooth speaker was connected to this test runner. This report certifies only the checks below, not a complete physical kiosk or exhaustive correctness.

## Automated and local checks

| Component | Result and scope |
|---|---|
| Backend TypeScript | `npm test` builds successfully; 14 tests pass |
| Assistant API | Valid languages/context/history, malformed requests, role injection and untrusted document handling tested |
| Online/offline routing | Mocked provider outage, bounded local fallback, recovery to online RAG and unsafe source-link filtering pass; no board model benchmark |
| Speech adapter | Input validation, server-side key handling, no-store response, concurrent-request deduplication and retry after provider failure pass with mocked HTTP |
| Budget persistence | Daily/total limits, overspend rejection and reopening SQLite after restart pass; independent temporary ledgers avoid consuming real credits |
| Local RAG | Retrieval and query-syntax handling pass; SQLite integrity passes; 15 documents / 3,248 passages; all 15 PDF SHA-256 values match the manifest |
| Frontend | TypeScript production build and ESLint pass; production output synchronized into backend dashboard |
| Browser workflows | Final full Playwright run: 16/16 passed in 2.4 minutes on Microsoft Edge with software WebGL |
| Deployment preflight | `npm run doctor` passes locally with outbound integrations disabled; checks credential presence, not remote account health |
| Running production endpoints | Dashboard, RAG status, contract search and voice status return HTTP 200 |

Browser coverage: 3D camera presets and participants; fullscreen/clear-view restoration; direct Criminal Law navigation and reload; mobile navigation/width; assistant history/language, escaping and failed-request recovery; real TXT/PDF extraction; case search/filter/detail/download; correlated live investigation review/completion; voice page load; conversation persistence across navigation; click-only speech; simulated camera capture, review and retake. Accessibility scanning found no violations under the assistant page's tested WCAG tags. This is not an accessibility audit of every page.

The first browser run passed 14/16. Two asynchronous courtroom checks exceeded the default five-second assertion window under software-rendered WebGL. Both passed on targeted rerun with a 15-second assertion window; no assertions were removed. Automated voice calls are mocked to prevent billing. The capture test uses a synthetic browser video stream, not a physical camera.

Earlier in this implementation session, live Gemini returned a grounded answer and Sarvam returned a WAV response. Those checks establish provider connectivity at that time, not available credits, future uptime or accuracy. This verification pass avoids additional paid requests.

## Not certified / still incomplete

- ARM64 installation, systemd service start/restart, cold boot, thermal behavior, power stability and actual Android Chrome GPU performance require the board.
- USB capture, Sarvam speech-to-text and UNO Q Bluetooth playback are not wired into the application. Current browser capture/playback runs on the phone/browser.
- RFID + PIN authentication, private encrypted case vault, cross-user isolation, recovery and encrypted Firebase synchronization are unfinished. Demo-card UI is not authentication. Firebase credential presence is not a tested private-case flow.
- No local model is installed or benchmarked on UNO Q. The connector tests use mocks; offline encrypted case history is not implemented.
- The ESP32 folder contains configuration/display headers, not a complete replacement reader sketch. Preserve the existing working firmware and wiring.
- Public-law corpus coverage is incomplete. Three requested source downloads remain unavailable. No legal correctness or comprehensive current-law guarantee is made.
- Full paid multi-agent execution and outbound email/WhatsApp/report actions were deliberately not invoked by tests.
- The 3D production chunk remains approximately 932 kB before gzip; actual mobile loading time and animation frame rate must be measured on the phone.

Follow [UNO Q setup and acceptance checklist](UNO-Q-SETUP.md). Record actual hardware results before demonstrating the complete kiosk.
