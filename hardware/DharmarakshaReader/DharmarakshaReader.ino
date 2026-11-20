/* ESP32-S3 N16R8 + RC522 + existing ST7796 TFT.
   Read-only card detection. Never writes cards and never claims PIN authentication.
   Wiring is identical to the supplied SAAKSHI build. */
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>
#include "config.h"
#include "lgfx_setup.h"

LGFX tft;
MFRC522 rfid(RFID_PIN_SS, RFID_PIN_RST);
static bool readerOk=false, serverOk=false;
static uint32_t lastPoll=0,lastWifi=0,lastHealth=0,lastTap=0,messageUntil=0;
static String previousUid;
static constexpr uint16_t BG=0xEF5B, INK=0x19E7, GOLD=0xB447, WHITE=0xFFFF;

void textLine(const char* text,int x,int y,const lgfx::IFont* font,uint16_t color){tft.setFont(font);tft.setTextColor(color);tft.drawString(text,x,y);}
void footer(){
 tft.fillRect(0,278,480,42,BG);
 String wifi=WiFi.status()==WL_CONNECTED?WiFi.localIP().toString():"Wi-Fi reconnecting";
 textLine(wifi.c_str(),16,292,&fonts::FreeSans9pt7b,INK);
 String state=String("RFID ")+(readerOk?"OK":"CHECK")+" / Server "+(serverOk?"OK":"WAIT");
 textLine(state.c_str(),220,292,&fonts::FreeSans9pt7b,INK);
}
void header(){
 tft.fillScreen(BG);tft.fillRect(0,0,480,55,INK);
 textLine("DHARMARAKSHA",18,16,&fonts::FreeSansBold18pt7b,WHITE);
 tft.fillRect(0,55,480,3,GOLD);
}
void idle(){
 header();textLine("Tap your card",28,88,&fonts::FreeSansBold24pt7b,INK);
 textLine("Then continue on your phone",28,142,&fonts::FreeSans12pt7b,INK);
 textLine("Legal help kiosk",28,195,&fonts::FreeSans12pt7b,GOLD);
 textLine("Tap card, then enter PIN on your phone.",28,239,&fonts::FreeSans9pt7b,INK);footer();
}
void message(const char* title,const char* detail){header();textLine(title,24,95,&fonts::FreeSansBold24pt7b,INK);textLine(detail,24,158,&fonts::FreeSans12pt7b,INK);textLine("See the phone kiosk for the next step.",24,217,&fonts::FreeSans9pt7b,INK);footer();messageUntil=millis()+4500;}
void auth(HTTPClient& http){http.addHeader("X-Device-Key",DEVICE_TOKEN);http.addHeader("X-Device-Id",DEVICE_ID);}
bool heartbeat(){
 if(WiFi.status()!=WL_CONNECTED)return false;
 HTTPClient http;if(!http.begin(String(SAAKSHI_API_BASE)+"/api/kiosk-reader/heartbeat"))return false;
 http.setConnectTimeout(HTTP_TIMEOUT_MS);http.setTimeout(HTTP_TIMEOUT_MS);auth(http);
 int code=http.GET();http.end();return code==200;
}
void sendTap(const String& uid){
 if(WiFi.status()!=WL_CONNECTED){serverOk=false;message("Wi-Fi offline","Reconnect, then tap the card again.");return;}
 HTTPClient http;if(!http.begin(String(SAAKSHI_API_BASE)+"/api/kiosk-reader/tap")){message("Connection error","Please tap again shortly.");return;}
 http.setConnectTimeout(HTTP_TIMEOUT_MS);http.setTimeout(HTTP_TIMEOUT_MS);auth(http);http.addHeader("Content-Type","application/json");
 JsonDocument body;body["uid"]=uid;String payload;serializeJson(body,payload);
 int code=http.POST(payload);serverOk=code==200;
 if(code==200)message("Card detected","Enter your PIN on the phone.");
 else if(code==401||code==403)message("Reader not trusted","Check device credentials.");
 else message("Server unavailable","Check UNO Q. Tap again to retry.");
 http.end();
}
void checkReader(){byte v=rfid.PCD_ReadRegister(MFRC522::VersionReg);readerOk=v!=0&&v!=255;}
void setup(){
 Serial.begin(115200);delay(200);
 pinMode(TFT_PIN_BL,OUTPUT);digitalWrite(TFT_PIN_BL,HIGH);tft.init();tft.setRotation(TFT_ROTATION);
 SPI.begin(RFID_PIN_SCK,RFID_PIN_MISO,RFID_PIN_MOSI,RFID_PIN_SS);rfid.PCD_Init();rfid.PCD_SetAntennaGain(MFRC522::RxGain_max);checkReader();
 WiFi.mode(WIFI_STA);WiFi.setSleep(false);WiFi.setAutoReconnect(true);WiFi.begin(WIFI_SSID,WIFI_PASS);idle();
 Serial.println("Dharmaraksha reader started. Secrets and card UIDs are not logged.");
}
void loop(){
 uint32_t now=millis();
 if(WiFi.status()!=WL_CONNECTED&&uint32_t(now-lastWifi)>=10000){lastWifi=now;WiFi.reconnect();serverOk=false;footer();}
 if(readerOk&&rfid.PICC_IsNewCardPresent()&&rfid.PICC_ReadCardSerial()){
  String uid;char hex[3];for(byte i=0;i<rfid.uid.size;i++){snprintf(hex,sizeof(hex),"%02X",rfid.uid.uidByte[i]);uid+=hex;}
  rfid.PICC_HaltA();rfid.PCD_StopCrypto1();
  if(uid!=previousUid||uint32_t(now-lastTap)>=CARD_DEBOUNCE_MS){previousUid=uid;lastTap=now;sendTap(uid);}
 }
 if(uint32_t(now-lastPoll)>=POLL_INTERVAL_MS){lastPoll=now;serverOk=heartbeat();footer();}
 if(uint32_t(now-lastHealth)>=RFID_HEALTH_MS){lastHealth=now;checkReader();if(!readerOk){rfid.PCD_Init();checkReader();}footer();}
 if(messageUntil&&int32_t(millis()-messageUntil)>=0){messageUntil=0;idle();}
 delay(20);
}
