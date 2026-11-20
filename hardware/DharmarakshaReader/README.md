# Dharmaraksha RC522 reader — ESP32-S3 N16R8

Open **DharmarakshaReader.ino** in Arduino IDE. This is for your existing ESP32-S3, not the UNO Q MCU. `config.h` in this local folder is already populated with your supplied Wi-Fi settings, UNO Q address and a generated device token. It is private and Git-ignored. Do not publish it. `config.example.h` is the shareable template. `device.env` is the private matching backend token for recovery; the maintained UNO Q `.env` is configured during deployment.

Install **esp32 by Espressif Systems** and select **ESP32S3 Dev Module**. Use the flash/PSRAM settings from your working N16R8 SAAKSHI build (16 MB flash, matching OPI PSRAM hardware). Install libraries **LovyanGFX**, **MFRC522 1.4.x**, and **ArduinoJson 7.x**. Connect the ESP32 USB cable, select its actual port and upload. Close Serial Monitor while uploading. No card-writing operation is performed.

## Wiring — unchanged

| RC522 | ESP32 GPIO |
|---|---|
| SDA/SS | 4 |
| SCK | 5 |
| MOSI | 6 |
| MISO | 7 |
| RST | 15 |
| Supply | 3.3 V, shared GND |

| TFT | ESP32 GPIO |
|---|---|
| SCLK | 12 |
| MOSI/SDI | 11 |
| CS | 10 |
| DC | 9 |
| RESET | 14 |
| LED | 13 |
| MISO | Not connected |
| Supply | 5 V, shared GND |

ILI9488 is enabled (confirmed on the physical display on 14 November 2026), SPI3_HOST at 10 MHz, rotation 1. The RC522 uses the separate default Arduino SPI bus. Keep the display driver that already works; do not move wires.

## Expected behavior

1. Reader connects to Aryaa Wi-Fi and sends an authenticated heartbeat to UNO Q at port 3001.
2. TFT shows RFID OK / Server OK.
3. A tap sends the hardware UID over the trusted local network. Server validates device token and ID, rejects malformed IDs, debounces repeated taps, and exposes only the last four characters to the kiosk.
4. Phone shows **Card … detected**. One-card enrollment and PIN verification are implemented on UNO Q. A recognized tap opens the PIN form on the phone. Saved-case retrieval and encrypted case storage are not connected yet; authentication does not imply case-history availability.

Routes: `GET /api/kiosk-reader/heartbeat`, `POST /api/kiosk-reader/tap`. The old SAAKSHI audit resolve/write routes are not used by this sketch. No private document is stored on the card. Existing NDEF contents are left unchanged; this reader uses UID as a detection pointer, not a secure identity proof.

Use the same LAN for ESP32, phone and UNO Q. Update `SAAKSHI_API_BASE` if DHCP changes UNO Q's address; reserve the current address in the router if possible. Local HTTP is a prototype transport, not suitable for an untrusted/public network.

## Phone workflow

Open `http://10.16.214.172:3001/kiosk/` in Android Chrome on Aryaa. Refresh after an update. Choose your conversation language, Continue as guest, then Scan documents. Keep the whole sheet visible on a dark background. When Capture this page becomes enabled and you are happy with the preview, press it. Nothing captures automatically. Use Next page for another sheet, Retake to replace the last one, and Finished scanning / Yes, analyze pages to submit the batch. Maximum: six pages per guest session.

The microphone and USB camera stay connected to UNO Q; output goes to Mivi Roam 2. Camera scanning intentionally pauses the microphone. Voice commands resume after capture. Bluetooth must be powered on and connected. All three additional languages were confirmed audible by the user. The reader itself uses ASCII status labels because its TFT font does not shape Indic scripts.

## If the reader does not connect

- Wi-Fi reconnecting: check Aryaa is available to the ESP32 and its 2.4 GHz radio is enabled.
- RFID CHECK: verify 3.3 V and the unchanged GPIO connections above.
- Server WAIT: confirm the phone can open the kiosk link; check UNO Q still has the configured address.
- Reader not trusted: the `DEVICE_TOKEN` and `DEVICE_ID` in private `config.h` must match `KIOSK_DEVICE_TOKEN` / `KIOSK_DEVICE_ID` in the UNO Q backend `.env`. Restart `dharmaraksha` after changing backend values.
- A physical tap still needs to be tested after uploading. Unit tests verify token checks, valid UID lengths, debounce and that a tap cannot unlock cases.

## Compile verification

Compiled successfully on 13 November 2026 with Espressif ESP32 core 3.3.12, LovyanGFX 1.3.0, MFRC522 1.4.12 and ArduinoJson 7.4.2. Target: `esp32:esp32:esp32s3:FlashSize=16M,PSRAM=opi`. Result: 1,100,867 bytes program storage and 48,376 bytes static RAM. `build/` contains local build output and is Git-ignored because firmware includes your private credentials. This describes the earlier compile-only run; see physical verification below.


## Physical display verification — 14 November 2026

The ST7796 driver produced an illuminated white screen. Switching only the driver to ILI9488 restored visible text, confirmed by the user. GPIO assignments, 10 MHz SPI, rotation and RFID wiring are unchanged. Uploaded the application at 0x10000 via UNO Q /dev/ttyUSB0; esptool verified its hash. Existing flash through 4 MB was backed up on UNO Q at /home/arduino/dharmaraksha-runtime/reader-before-display-test.bin before writing. The old compile-only/no-flash statement above describes the earlier run.

On 14 November 2026, the user enrolled one card and confirmed successful PIN verification on the phone. Reader firmware now prompts Enter your PIN on the phone. PIN verification occurs only on UNO Q; the firmware contains no user PIN.
