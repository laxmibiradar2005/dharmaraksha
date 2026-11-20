#pragma once
// ESP32-S3 N16R8. Copy to config.h and fill private network settings locally.
// Exact existing SAAKSHI wiring. No wire changes are required.
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASS "YOUR_WIFI_PASSWORD"
// Set the reachable gateway address; do not assume a campus or hotspot IP.
#define SAAKSHI_API_BASE "http://YOUR_GATEWAY_LAN_IP:3001"
#define DEVICE_TOKEN "SET_A_UNIQUE_DEVICE_SECRET"
#define DEVICE_ID "saakshi-reader-01"
#define FW_VERSION "1.1.0"
#define POLL_INTERVAL_MS 2000
#define HTTP_TIMEOUT_MS 4000
#define RESULT_SCREEN_MS 9000
#define WRITE_RESULT_MS 6000
#define CARD_DEBOUNCE_MS 2500
#define RFID_HEALTH_MS 30000
#define WIFI_RETRY_MS 10000
// Keep the currently working ST7796 driver. ILI9488 is an alternative only.
#define TFT_DRIVER_ST7796
// #define TFT_DRIVER_ILI9488
#define TFT_PIN_SCLK 12
#define TFT_PIN_MOSI 11
#define TFT_PIN_MISO -1
#define TFT_PIN_CS 10
#define TFT_PIN_DC 9
#define TFT_PIN_RST 14
#define TFT_PIN_BL 13
#define TFT_SPI_FREQ 10000000
#define TFT_ROTATION 1
#define TFT_RGB_ORDER false
#define TFT_INVERT false
// RC522 supply is 3.3 V. Display supply is 5 V. Shared ground.
#define RFID_PIN_SS 4
#define RFID_PIN_SCK 5
#define RFID_PIN_MOSI 6
#define RFID_PIN_MISO 7
#define RFID_PIN_RST 15
#define RGB_LED_PIN 48
#define SAAKSHI_RGB_BRIGHTNESS 24
#define MAX_JOBCARD_LEN 32
#define NTAG_FIRST_PAGE 4
#define NTAG_LAST_PAGE 39
