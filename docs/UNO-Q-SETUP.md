# UNO Q setup and power-on checklist

**Board now installed:** use [the actual installation record](UNO-Q-INSTALLED.md) for this board's `/home/arduino` paths, SSH username and verified results. The `/opt` instructions below remain a generic alternative.

13 November 2026. This guide deploys the current **dashboard, economy-mode Gemini/Sarvam TTS adapters and local public-law RAG**. It does not turn unfinished RFID + PIN, private encrypted case storage, USB capture or Bluetooth application routing into working features. Complete the hardware acceptance checklist before calling this a working kiosk.

## 1. What code goes on which device

| Device | Code/location | How it runs |
|---|---|---|
| UNO Q Linux processor | Entire `nexus-mcp` application, including `dist`, `dashboard`, `data/legal`, `.env`, Firebase credentials | Node.js process, port 3001 |
| UNO Q STM32 microcontroller | No sketch required for the current application | Leave its existing firmware alone |
| Existing ESP32-S3 N16R8 | Your existing SAAKSHI reader sketch; supplied headers in `hardware/esp32-reader` | Arduino IDE, ESP32S3 Dev Module |
| Android phone / Chrome | No installed code | Opens UNO Q dashboard over the shared Wi-Fi |
| Laptop | Development source, backups; optional separate RAG service later | Current RAG can run directly inside the UNO Q Node server |

UNO Q contains a Debian Linux MPU and separate STM32 MCU. Arduino IDE programs the MCU; it is not where this Node/React application is uploaded. The official documentation describes USB cameras/microphones through an externally powered USB-C dongle and recommends the 4 GB board for standalone use. [Arduino hardware reference](https://docs.arduino.cc/hardware/uno-q/), [first-time setup/manual](https://docs.arduino.cc/tutorials/uno-q/user-manual/).

## 2. First boot and network

1. Follow Arduino's current App Lab first-time setup for your board image. Set a strong Linux account password and join the same Wi-Fi as the Android phone and ESP32. Use a network without wireless client isolation.
2. Use the board's supported power supply and a powered USB-C hub with data support for USB camera and microphone. A charging-only cable cannot carry USB data. Do not assume a phone charger powers the hub reliably.
3. Open a terminal on the board through the supported App Lab/desktop workflow. Verify:

```sh
uname -m
cat /etc/os-release
free -h
df -h /
hostname -I
```

Expect ARM64 (`aarch64`) Linux, roughly 4 GB installed RAM and sufficient free storage. Record the actual LAN address; do not reuse the old SAAKSHI campus IP. Reserve the address in your router if possible. Enable SSH through the board's supported configuration if you want to copy from Windows; do not assume a default username/password.

## 3. Copy the application

Maintained Windows source folder:

`C:\Users\LAXMI BIRADAR\OneDrive\Desktop\darma rakshak ksit\indian-court-room-main`

Copy this project to the UNO Q user home, for example `~/dharmaraksha-upload`. **Exclude** Windows `node_modules`, `.git`, `.local-history`, test videos/traces, old duplicate projects and `data/legal/pdfs/bnss-rejected-draft.pdf`. Do not transfer Windows native binaries. Keep `package-lock.json`, backend/frontend source, `dist`, built `dashboard`, `rag`, `scripts`, `deploy`, `hardware` and `data/legal/index.sqlite`, `manifest.json`, verified PDFs.

The legal corpus is ignored by Git: a Git clone alone does not include it. Transfer it explicitly or run `npm run rag:build` on the board. Three unavailable source downloads are recorded in the manifest; the working library has 15 documents.

Transfer `.env` and `serviceAccountKey.json` privately into `nexus-mcp`. Never put these in `dashboard`, `public`, Git or a shared download. The current backend requires the Firebase service-account file and its database/bucket configuration at startup.

If copying `nexus.db` or `data/private/ai-budget.sqlite`, first stop the originating server to obtain a consistent snapshot including any SQLite WAL data. Back up before migration. Copy the existing budget ledger if the same API credit budget is shared; starting an empty ledger on another device does not know spending already reserved here. Avoid running two independently budgeted kiosks against the same small credit balance.

## 4. Install runtime on UNO Q

Use a current Node.js **22 LTS release (at least 22.12)** with npm for Linux ARM64. Verify `node --version` and `npm --version`; if the Debian repository offers an older Node version, use a supported Node 22 ARM64 installation from [Node.js downloads](https://nodejs.org/en/download). The service template below expects `/usr/bin/node`; adjust it to the actual `command -v node` result. A Node executable hidden in another user's home will not work with the hardened service.

```sh
sudo apt update
sudo apt install -y build-essential python3 pkg-config ca-certificates usbutils v4l-utils alsa-utils bluez
sudo useradd --system --user-group --home-dir /opt/dharmaraksha --shell /usr/sbin/nologin dharmaraksha
sudo mkdir -p /opt/dharmaraksha
sudo cp -a ~/dharmaraksha-upload/. /opt/dharmaraksha/
sudo chown -R dharmaraksha:dharmaraksha /opt/dharmaraksha
cd /opt/dharmaraksha/nexus-mcp
sudo -u dharmaraksha npm ci
sudo -u dharmaraksha npm run build
```

Create the service account only once; if it already exists, skip `useradd`. `npm ci` installs ARM64 dependencies and may compile SQLite locally. If it fails, resolve the native build error before proceeding. The production `dashboard` built on the laptop can be copied directly; JavaScript/CSS assets are platform-independent. To rebuild frontend on UNO Q instead:

```sh
cd /opt/dharmaraksha/nexus-mcp/dashboard-react
sudo -u dharmaraksha npm ci
sudo -u dharmaraksha npm run build
```

## 5. Private configuration

Keep the working private values in `/opt/dharmaraksha/nexus-mcp/.env`. Use `.env.example` as a name reference, not as a replacement for your working credentials. Required configuration:

```dotenv
PORT=3001
DISABLE_OUTBOUND_INTEGRATIONS=true
ECONOMY_MODE=true
RAG_ENABLED=true
LEGAL_ASSISTANT_MODEL=gemini-2.5-flash-lite
SARVAM_TTS_MODEL=bulbul:v4-flash
SARVAM_SPEAKER=
AI_BUDGET_INR=400
AI_DAILY_BUDGET_INR=20
AI_BUDGET_CYCLE=prototype-2026-11
RAG_SERVER_URL=
LOCAL_LLM_URL=
```

Also retain actual `GEMINI_API_KEY`, `SARVAM_API_KEY`, `FIREBASE_DATABASE_URL`, `FIREBASE_STORAGE_BUCKET` and `serviceAccountKey.json`. Empty `RAG_SERVER_URL` selects the implemented in-process RAG. Do not set it to the dashboard itself: that connector expects a different `/query` contract. Empty `LOCAL_LLM_URL` means no generative offline model yet; free local law search still works.

```sh
sudo chmod 600 /opt/dharmaraksha/nexus-mcp/.env /opt/dharmaraksha/nexus-mcp/serviceAccountKey.json
cd /opt/dharmaraksha/nexus-mcp
sudo -u dharmaraksha env DISABLE_OUTBOUND_INTEGRATIONS=true npm run doctor
```

Doctor is read-only, prints presence checks rather than keys, and makes no paid AI calls. All required checks should pass. It does not prove provider health or physical device support.

## 6. Start now, then automatically after power-on

Foreground smoke test:

```sh
cd /opt/dharmaraksha/nexus-mcp
sudo -u dharmaraksha env DISABLE_OUTBOUND_INTEGRATIONS=true node dist/server.js
```

On the phone open `http://UNO_Q_LAN_IP:3001/dashboard/`, replacing the placeholder with `hostname -I` output. Open Documents and search `free consent contract`. After this succeeds, stop the foreground process with Ctrl+C and install the service:

```sh
sudo cp /opt/dharmaraksha/deploy/uno-q/dharmaraksha.service /etc/systemd/system/dharmaraksha.service
sudo systemctl daemon-reload
sudo systemctl enable --now dharmaraksha
systemctl status dharmaraksha --no-pager
curl -fsS http://127.0.0.1:3001/api/rag/status
```

Troubleshooting:

```sh
journalctl -u dharmaraksha -n 80 --no-pager
sudo systemctl restart dharmaraksha
sudo systemctl stop dharmaraksha
```

`enable` starts the app on future boots; `Restart=on-failure` restarts a crashed process. This does not make failing USB devices, Bluetooth pairing or internet service recover automatically. Never run both the foreground server and service on port 3001.

Do not expose this prototype's unauthenticated operator API through a public tunnel. Plain LAN HTTP supports the text/dashboard preview, but Chrome camera/microphone access and some secure browser APIs require a trusted HTTPS origin. The eventual UNO Q device bridge must capture hardware on Linux rather than calling the phone's `getUserMedia`.

## 7. Check USB camera, microphone and Bluetooth speaker

```sh
bash /opt/dharmaraksha/deploy/uno-q/check-hardware.sh
v4l2-ctl --list-devices
arecord -l
bluetoothctl
```

In `bluetoothctl`: run `power on`, `agent on`, `default-agent`, `scan on`. Put the speaker into pairing mode; use its **observed** address with `pair ADDRESS`, `trust ADDRESS`, `connect ADDRESS`, then `scan off` and `quit`. Trust only your speaker. Bluetooth connection alone is insufficient: the Linux audio session also needs a working Bluetooth sink/profile.

In the logged-in Linux audio session, use `wpctl status` if PipeWire is installed, or `pactl list short sinks` if the image uses PulseAudio. Select the observed Bluetooth sink as default (`wpctl set-default SINK_ID` for PipeWire). Do not install or replace the audio stack blindly; use the stack supplied by the board image. A system Node service does not automatically inherit a logged-in user's audio session.

To test USB recording, substitute the actual ALSA capture card/device from `arecord -l`:

```sh
arecord -D plughw:CARD,DEVICE -f S16_LE -r 16000 -c 1 -d 5 /tmp/dharmaraksha-mic.wav
```

Play the test through the selected Bluetooth sink using `pw-play /tmp/dharmaraksha-mic.wav` (PipeWire) or `paplay /tmp/dharmaraksha-mic.wav` (PulseAudio). Delete the recording after checking. If either command is unavailable or silent, repair the Linux audio setup first. Camera preview can be checked using the board's camera utility after verifying its V4L2 device.

**Current application limitation:** the browser scanner still uses the phone/browser camera and microphone, and browser playback uses the phone's audio output. No tested UNO Q USB capture/Sarvam STT/Bluetooth playback bridge exists yet. Pairing the speaker will not reroute browser audio from the phone to UNO Q. The scripts above test hardware independently and do not implement that bridge.

## 8. ESP32-S3 / RC522: preserve the working firmware

Keep your existing working sketch on the ESP32. The project currently contains these wiring-preserving headers, not a complete replacement `.ino`:

- `hardware/esp32-reader/config.example.h`: copy beside your SAAKSHI `.ino` as `config.h`, then fill private network settings.
- `hardware/esp32-reader/lgfx_setup.h`: keep beside the sketch.
- `hardware/esp32-reader/README.md`: exact pin map and proposed gateway protocol.

Select **ESP32S3 Dev Module**, with the matching N16R8 board memory settings from your working installation. Libraries: LovyanGFX, MFRC522 and ArduinoJson 7.x. RC522 stays on GPIO 4/5/6/7/15, TFT on GPIO 9–14, SPI3 display bus, ST7796 at 10 MHz. RC522 supply is 3.3 V. Nothing moves to UNO Q GPIOs.

Do not flash these headers onto UNO Q, overwrite cards, or point the old SAAKSHI `/api/nfc/resolve` firmware at port 3001 expecting it to unlock cases. That route and the RFID + PIN gateway are not implemented. There is no honest “upload this sketch and private case login works” step yet.

## 9. Optional local model

The connector exists, but no model has been installed or benchmarked on your board. Follow [the architecture's llama.cpp instructions](kiosk-architecture.md) with a licensed Llama 3.2 1B Instruct Q4 model and a loopback-only server. Start with one request, context 1024–2048 and short outputs. Only set `LOCAL_LLM_URL=http://127.0.0.1:8080` after its chat endpoint works. Account for RAM, thermals and USB workloads; do not start a 3B model by assumption. Offline voice and OCR are intentionally out of scope.

## 10. Physical acceptance — required before demonstration

| Check | Expected outcome |
|---|---|
| Cold boot with hub and all devices attached | No power resets; service becomes active; phone opens dashboard |
| Reboot twice | Service restarts each time without manually running npm |
| Local law search | Results with Act titles and PDF pages, including with internet disconnected |
| One short Gemini question and one clicked introduction | Cited answer and audible speech on the current browser; cost ledger changes only for model calls |
| Wi-Fi internet removed but LAN retained | Dashboard and local search still work; AI reports unavailable or uses configured local model |
| Budget reached | New paid requests stop; local search remains available |
| Camera/mic/speaker hardware tests | Linux recognizes devices, camera image readable, voice recorded clearly, Bluetooth playback audible |
| USB unplug/replug and Bluetooth power cycle | Record whether Linux and the future bridge reconnect; not yet application-tested |
| RFID + PIN, two-user isolation, lock/recovery | Blocked until implementation; must not claim success using demo card |
| Saved case privacy and Firebase encryption | Blocked until encrypted user vault and access controls are implemented |

Shut down Linux cleanly (`sudo shutdown -h now`) before removing power. Abrupt power loss can corrupt data even when the server auto-starts. Keep a backup and test restore. The current hardware setup is a prototype deployment, not a guarantee of uninterrupted operation.
