# Existing reader: wiring-preserving handoff

These headers preserve the supplied ESP32-S3 N16R8 configuration. They are **not a flashed or hardware-tested kiosk firmware release**. The working SAAKSHI sketch remains the reference firmware; no board was connected to this development session.

Copy `config.example.h` to ignored `config.h` and enter the actual local network settings. Private Wi-Fi credentials and device tokens are deliberately absent from tracked files. The API base in the template is a placeholder, not a working kiosk endpoint.

| Peripheral | Existing pins / settings |
| --- | --- |
| RC522 | SS 4, SCK 5, MOSI 6, MISO 7, RST 15; 3.3 V |
| TFT | DC 9, CS 10, MOSI 11, SCK 12, backlight 13, RESET 14; 5 V |
| TFT bus | SPI3_HOST, 10 MHz, rotation 1, ST7796 default |
| RFID bus | Arduino SPI / SPI2; separate from display |
| RGB LED | GPIO 48, brightness 24 |

Use the existing LovyanGFX >=1.1.16, MFRC522 1.4.x and ArduinoJson 7.x setup with the ESP32S3 Dev Module board selection. The second display driver can only be enabled after disabling the first.

## Required kiosk firmware change (not implemented)

The current `/api/nfc/resolve` protocol returns social-audit data on a card tap. It must not be reused to return private legal cases before PIN verification. Proposed replacement:

1. Reader sends an authenticated tap event with `device_id`, a unique `event_id`, and `card_uid` to the paired UNO Q gateway. Card data is an account pointer, not authentication proof.
2. Gateway creates a short-lived challenge bound to that reader and the paired phone session. Replayed event IDs are rejected. Reader displays “Enter PIN on your phone”; no private case name is returned.
3. User enters PIN on the phone. Gateway verifies it, applies persistent attempt limits, and unlocks only that user's encrypted case vault.
4. Reader receives only generic success/failure state. Existing card-writing commands stay operator-only; do not overwrite current job cards during testing.

These routes, phone pairing, PIN verification and encrypted vault are still to be built. The current voice page's demo card does not implement them. Do not point the old resolve code at the dashboard and expect compatible responses.

For deployment use authenticated encrypted device transport with certificate verification; the old HTTP URL and demo token are development settings. Bluetooth audio and USB camera/mic are hosted by UNO Q Linux, not by this ESP32 firmware. See [the kiosk architecture](../../docs/kiosk-architecture.md).
