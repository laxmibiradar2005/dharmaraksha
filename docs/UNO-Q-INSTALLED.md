# Actual UNO Q installation — 13 November 2026

Open **http://10.16.214.172:3001/kiosk/** from Android Chrome on the same Aryaa Wi-Fi. The root URL also redirects to this visitor kiosk when `KIOSK_MODE=true`. The courtroom dashboard is a separate operator interface, not the kiosk start screen. The address can change with DHCP. SSH is `ssh arduino@10.16.214.172`; `hack` is the hostname, not the username. Passwords and API credentials are deliberately omitted here.

## Visitor kiosk update

The current visitor flow is documented in [KIOSK-VOICE-SCANNER.md](KIOSK-VOICE-SCANNER.md). Source: `nexus-mcp/kiosk/`; camera/microphone bridge: `nexus-mcp/api/kiosk.ts`; authenticated ESP32 reader bridge: `nexus-mcp/api/kioskReader.ts`.

Select your language, continue as guest, choose Scan documents, frame the page, then press **Capture this page** yourself. Choose Next page to add up to six pages, Retake to replace the latest, or Finished scanning. OCR only runs after Yes, analyze pages. Voice guidance uses Sarvam; capture is manual. Guest pages and chat remain in browser memory until session clear/reload. There is currently no automatic inactivity data clearing; clear the session after use. Private card/PIN cases remain unavailable.

`KIOSK_MODE=true`, `KIOSK_CAMERA=/dev/video0` and `XDG_RUNTIME_DIR=/run/user/1000` enable hardware control. A continuously streamed preview replaces repeated large frame requests. The local scanner warms/focuses the camera and checks sharpness, lighting and all page corners. Speech plays from UNO Q to Mivi Roam 2; microphone input uses the UNO Q USB microphone. See `hardware/DharmarakshaReader/README.md` for ESP32 upload; its local ignored `config.h` contains the configured Wi-Fi/address/device token. No MCU wiring changes are needed.

## What was installed

The board has a small root partition and a larger home partition. This deployment therefore uses `/home/arduino`, overriding the generic `/opt` example in UNO-Q-SETUP.md.

| Item | Installed location |
|---|---|
| Backend, production UI, law index and case database | `/home/arduino/dharmaraksha/nexus-mcp` |
| Server-side provider settings | `/home/arduino/dharmaraksha/nexus-mcp/.env` (mode 600) |
| Firebase service account | `/home/arduino/dharmaraksha/nexus-mcp/serviceAccountKey.json` (mode 600) |
| ARM64 Node 22.23.5 | `/home/arduino/dharmaraksha-runtime/node-v22.23.5-linux-arm64/bin/node` |
| Boot service | `/etc/systemd/system/dharmaraksha.service` |
| Speaker reconnect timer | `~/.config/systemd/user/dharmaraksha-speaker.timer` |
| Installation and backend test logs | `/home/arduino/dharmaraksha-runtime` |
| Existing local model, reused without replacing its service | `/home/arduino/fieldrag-data/models/llm/Qwen_Qwen3-0.6B-Q4_K_M.gguf` |

The existing `fieldrag-llm.service` serves the local model at loopback port 8081. The application points to that endpoint with thinking disabled for short fallback answers. This small model is not reliable legal authority; its successful fact-summary test does not establish legal competence. No new MCU or ESP32 sketch was flashed.

## Operation

```sh
systemctl status dharmaraksha --no-pager
sudo systemctl restart dharmaraksha
journalctl -u dharmaraksha -n 60 --no-pager
systemctl --user status dharmaraksha-speaker.timer --no-pager
systemctl --user start dharmaraksha-speaker.service
```

The application service is enabled for boot. The speaker timer retries the already-paired Mivi Roam 2 every 45 seconds; it does not pair arbitrary devices. User lingering was enabled so the audio session can run without SSH login. Mivi address: `88:81:75:22:10:03`. The USB microphone is the selected input. Bluetooth seat monitoring was disabled for the Arduino user, and the LightDM greeter's Bluetooth monitor was disabled to prevent it taking the speaker. These changes are in `90-dharmaraksha-headless.conf` under `~/.config/wireplumber/wireplumber.conf.d` and `90-dharmaraksha-bluetooth.conf` under `/var/lib/lightdm/.config/wireplumber/wireplumber.conf.d`.

For checks:

```sh
export PATH="$HOME/dharmaraksha-runtime/node-v22.23.5-linux-arm64/bin:$PATH"
cd ~/dharmaraksha/nexus-mcp
DISABLE_OUTBOUND_INTEGRATIONS=true npm run doctor
node --test dist/tests/*.test.js
curl -fsS http://127.0.0.1:3001/api/rag/status
```

Use `node --test` for the deployed compiled tests: production dependencies were installed without the TypeScript development toolchain. Build changed TypeScript on the laptop and transfer compiled output, or deliberately install development dependencies before rebuilding on the board.

## Verified on this board

- Node archive and application archive checksums passed. Native SQLite repair and legal-index integrity passed.
- All 15 backend tests passed on ARM64, including a new regression for startup without an optional Composio key.
- Camera `/dev/video0` supplied five 1280×720 MJPEG frames. USB microphone ALSA `plughw:1,0` captured a three-second non-silent signal. Captures were discarded, not retained.
- Mivi Roam 2 paired/trusted; the user confirmed hearing the second test tone. Sarvam returned a 105,884-byte WAV and local playback completed.
- Live Gemini returned a RAG response with five source records and citation labels. Existing Qwen locally summarized synthetic tenant/landlord facts.
- Law library contains 15 public-law snapshots and 3,248 passages. Existing case and budget databases were transferred using SQLite backups. The development laptop backend was stopped for handover.
- Deployed browser testing passed 14 initial workflows. It exposed a local-HTTP UUID issue, now fixed using cryptographic random bytes. Browser camera capture is unavailable on LAN HTTP; the UI now explains this limitation instead of giving a misleading permission error.
- Both targeted browser checks passed after the fix: investigation/review/completion over HTTP and actionable unavailable-camera guidance. A controlled systemd restart returned a healthy RAG endpoint; dashboard HTTP 200 and five contract-search results were verified remotely afterward.

## Remaining limitations

The board unexpectedly rebooted three times during installation; the user reported no manual restarts. Two interruptions left newly written native executables incomplete. Files were repaired and flushed, but the underlying power/hub/kernel cause is not established. A short successful run and service restart do not certify power stability. Use a supported power supply and powered peripheral hub, and perform a sustained cold-boot/load test before relying on the kiosk. Do not unplug during installation or writes.

The dedicated kiosk now uses UNO Q camera capture and Bluetooth playback; the older dashboard scanner still uses browser devices. USB microphone conversation/Sarvam speech recognition, RFID + PIN, encrypted user vault and private Firebase history remain unfinished. LAN HTTP does not enable Chrome phone-camera APIs, but the dedicated kiosk camera route captures on Linux. Do not expose the unauthenticated operator API through a public tunnel.

Avoid restarting the laptop backend against the same credits while using the board: separate local budget ledgers do not coordinate globally. The configured ₹400 total / ₹20 daily estimated limits are not the provider's account balance. Keep backups before further work. Shut down Linux cleanly before removing power.

## Laptop RAG connection update

UNO Q now calls `http://10.16.214.64:3002` using a private shared token. The laptop runs PGlite PostgreSQL + pgvector with 16 documents and 3,471 passages. An end-to-end UNO Q question with conversation history returned HTTP 200 and a Gemini RAG answer with four page-referenced sources. Keep the laptop RAG process running; see `RAG-POSTGRES.md` for restarts and ingestion. DHCP address changes require updating the UNO Q backend URL. The final mobile welcome layout is deployed; camera capture remains manual.
