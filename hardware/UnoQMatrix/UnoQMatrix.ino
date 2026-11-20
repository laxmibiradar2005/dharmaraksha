#include <Arduino_LED_Matrix.h>
Arduino_LED_Matrix matrix;
uint8_t pixels[104];
void setup() { matrix.begin(); matrix.setGrayscaleBits(3); }
void dot(int x,int y,uint8_t shade){ if(x>=0&&x<13&&y>=0&&y<8)pixels[y*13+x]=shade; }
void loop(){
  memset(pixels,0,sizeof(pixels));
  const unsigned phase=(millis()/100)%28;
  const uint8_t brightness=2+(phase<14?phase:27-phase)/3;
  // Breathing scales of justice; autonomous, no network or audio work.
  for(int y=1;y<7;y++)dot(6,y,brightness);
  for(int x=2;x<=10;x++)dot(x,2,brightness);
  for(int x=4;x<=8;x++)dot(x,7,brightness);
  dot(2,3,3);dot(10,3,3);
  dot(1,4,brightness);dot(3,4,brightness);dot(9,4,brightness);dot(11,4,brightness);
  for(int x=1;x<=3;x++)dot(x,5,brightness);
  for(int x=9;x<=11;x++)dot(x,5,brightness);
  matrix.draw(pixels);delay(70);
}
