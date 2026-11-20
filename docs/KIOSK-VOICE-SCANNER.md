# Voice-guided kiosk and scanner — 13 November 2026

Open `http://10.16.214.172:3001/kiosk/` in one phone tab and refresh after updates. UNO Q's root and old dashboard URLs now open the visitor kiosk. The separate laptop dashboard remains available in laptop mode. Kiosk files use `Cache-Control: no-store`.

The welcome screen shows a live USB-camera preview. Select English, Hindi, Kannada or Tamil at the top; Dharmaraksha speaks translated guidance using Sarvam. Speak after the Listening indicator or use the visible navigation buttons. Flow: **start as guest → scan documents → press Capture this page → next page / retake / finished scanning → yes analyze → ask a question → yes → end session**. Photo capture is always manual. After eight silent listening turns, voice pauses; Resume restarts it. During speech and scanning the microphone is off. Navigation clicks during an active listening request are handled after that request ends.

## Capture

Put one page on a dark, flat background with all four corners visible. The Kreo Owl camera supports continuous autofocus. The new scanner keeps it open while in use at 1920×1080, warms it for at least three seconds, detects a quadrilateral, corrects perspective and waits for two seconds of steadiness. It checks page size, Laplacian sharpness, exposure and contrast. Stale frames cannot be captured. The live preview is downscaled; retained pages use higher-quality JPEG. Camera closes after 20 seconds without requests.

Up to six pages are kept in browser memory. A page is captured only when you press Capture this page; the button enables after quality and steadiness checks pass. There is no automatic capture or duplicate-page blocking. Retake replaces the last page. No OCR is requested until **yes analyze**. OCR text is reused when retrying a completed page; total extracted document context is limited to 9,000 characters with an explicit error instead of silently omitting pages. OCR can still misread text and is flagged if it reports illegible/truncated content. Quality heuristics are not a guarantee of perfect readability.

The actual tested page was rejected because its bottom edge was outside the camera frame; capture was not forced. A successful real-page capture with this new scanner and a visitor's full spoken session still require user verification.

## Voice and cost

`scripts/listen-kiosk.py` records bounded USB-microphone utterances in memory with a local energy threshold, pre-roll and silence ending. Silent windows are not sent to Sarvam. Voice activity detection is heuristic: background noise can trigger it. Clips are bounded below Sarvam REST's 30-second limit. Sarvam `saaras:v3` with `mode=translate` supplies English text for command parsing; answers support selected English, Hindi, Kannada and Tamil. Workflow instructions and answers use the selected language. Fixed translated instructions avoid a separate paid translation request. Speech recognition and output require internet. STT reserves an estimated ₹1.50/minute plus tax buffer in the existing ₹20/day and ₹400/cycle ledger. It is not an account-level cap.

Sarvam's live transcription test returned **Start as guest.** for a generated known phrase. This proves the API path, not recognition accuracy in the user's room. Local microphone capture returned nonempty audio without saving or transmitting that test recording. Production utterances are processed by Sarvam; selected pages are sent to Gemini. No raw recordings are saved by the kiosk.

## Installed services and source

- `/home/arduino/dharmaraksha/nexus-mcp/kiosk/`: browser UI and voice workflow.
- `api/kiosk.ts`: leased control, scanner bridge, Sarvam input, Bluetooth output.
- `scripts/document-scanner.py`: local-only OpenCV server at `127.0.0.1:8083`.
- `/home/arduino/dharmaraksha-runtime/scanner-venv`: NumPy and OpenCV installation.
- `dharmaraksha-scanner.service`: boot-enabled scanner; main `dharmaraksha.service` serves the kiosk.

A short renewable session lease prevents independent phone tabs from issuing overlapping hardware actions. It is not authentication. RFID/PIN and encrypted private-case history remain unfinished. Only guest access is presented as functional. One tab owns the device; close other tabs and allow a minute for an abandoned lease to expire. Reload retains the lease in tab session storage. Network fetch failures retry up to three times; provider failures pause rather than repeatedly spend credits.

## Verification

17 backend tests passed locally, including reader authentication, UID validation/debounce and no visitor-authentication grant. Five synthetic scanner tests pass on UNO Q. Seven browser tests pass against the deployed UI with mocked hardware/cloud responses: manual two-page capture, Hindi/Kannada/Tamil guidance, blur rejection, retake without OCR after denied consent, and competing-controller rejection. Real Sarvam TTS returned valid WAV audio for Hindi, Kannada and Tamil; the user confirmed all three were audible through Mivi Roam 2. The scanner stream delivered 33 multipart frames over four seconds on UNO Q; this is transport throughput, not a measured phone glass-to-glass latency or unique camera-frame rate.

The preview uses a continuous 720-pixel-wide MJPEG stream, separate from small quality updates. Full-resolution corrected photographs remain available for manual capture. Reader source and configured private headers are in `hardware/DharmarakshaReader/`; see its README for exact wiring and upload instructions. RFID detects cards only; PIN login and private case access remain unfinished.

Provider references: [Sarvam REST speech recognition](https://docs.sarvam.ai/api-reference/speech-to-text/transcribe), [speech recognition guide and listed pricing](https://www.sarvam.ai/speech-to-text). Physical power stability remains subject to the earlier unexpected reboot findings.

## Voice update — 14 November 2026

- Kiosk speech streams MP3 bytes directly into ffplay using the pulseaudio driver and the Bluetooth sink. It no longer waits for the complete speech file before starting playback.
- Short completed speech is cached in bounded process memory; no speech audio is written to disk by this streaming path. Spending reservations still apply to uncached requests.
- The voice conversation answers the question immediately without repeating it and requiring a second confirmation recording. Spoken answers are shortened; full text and citations remain visible.
- Pause/Clear cancels microphone capture and speaker playback. Speech input ends after approximately 550 ms of silence, subject to microphone noise detection.
- Audio output can be set to **This phone**. A kiosk-speaker failure automatically selects this fallback for the current browser session. If Chrome blocks autoplay, tap **Play answer on this phone**. Phone fallback currently downloads the complete audio response, so it can be slower than board streaming.
- Connection requests have a bounded timeout and retry. Use http://10.16.214.172:3001/kiosk/ while on the board's Wi-Fi.

Validation: 22 backend tests and 9 kiosk browser tests passed, including streaming-before-completion, cancellation, request failure, phone fallback/autoplay, manual multi-page capture, consent, and language selection. A real UNO Q speech request returned HTTP 200 and played=true; first audio bytes reached the player at 1083 ms and playback completed at 7736 ms. This is one speech-only measurement, not a full conversational latency percentile or an acoustic timing measurement. User testing of complete question/answer turns remains necessary. RFID + PIN private case access remains unfinished.

### Control responsiveness — 14 November 2026
Continue as guest and other touch commands now interrupt pending audio, including Chrome autoplay waits. Scanner quality polling starts without waiting for spoken instructions. Capture explains a failed quality gate when pressed and does not send an invalid frame. Ten kiosk tests passed; an additional targeted test verified scanner readiness while speech remains pending. These are mocked browser tests; physical capture awaits camera reconnection.

Hardware diagnosis: UNO Q detected CP210x at /dev/ttyUSB0. esptool identified ESP32-S3 revision 0.2 with 8 MB embedded PSRAM. Serial boot reaches the Dharmaraksha reader startup message. User reports a white illuminated TFT. Testing the alternate ILI9488 controller with unchanged wiring; not yet confirmed.

Physical follow-up: ILI9488 application uploaded and hash verified; user confirmed visible text. UNO Q subsequently received a real card tap event with the reader connected. Camera remains intentionally unplugged. Private RFID + PIN case authentication is still not implemented.

## Single-card prototype authentication — 14 November 2026

The UNO Q now supports one enrolled card and a PIN form. Enrollment was armed locally through the operator shell, not a public HTTP endpoint. The first subsequent valid reader tap binds the card; other cards cannot replace it. The database stores a card hash and salted scrypt PIN hash, not the raw UID or PIN. It is at `nexus-mcp/data/private/kiosk-identity.sqlite` on UNO Q, mode 0600.

A fresh recognized tap is valid for 60 seconds. The unlock is bound to the controlling browser lease, expires after five minutes, and is invalidated by a new card tap or Clear session. Five wrong PIN attempts impose a five-minute lockout; attempts persist across service restarts. Unlocked state is memory-only and does not survive a restart. The prototype still uses local HTTP.

This implements authentication only. Firebase encrypted case storage/retrieval is not connected to this flow; the UI explicitly says saved cases are unavailable and does not claim to recover history. Do not place private case records in the reader database.

Validation: 24 backend tests and 12 kiosk browser tests passed, including enrollment restriction, incorrect/expired PIN flow, lease binding, lockout, replay rejection and the PIN screen transition. Physical enrollment confirmation is tracked separately.

Physical enrollment verified: the user confirmed Card verified after tapping the selected card and entering the configured PIN. Server status confirms one enrolled card.
