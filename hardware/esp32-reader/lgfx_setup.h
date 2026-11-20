#pragma once
#define LGFX_USE_V1
#include <LovyanGFX.hpp>
#include "config.h"

#if defined(TFT_DRIVER_ST7796) == defined(TFT_DRIVER_ILI9488)
#error "Choose exactly one TFT display driver in config.h"
#endif

// Display uses SPI3_HOST; RC522 retains the Arduino SPI / SPI2 bus.
class LGFX : public lgfx::LGFX_Device {
#if defined(TFT_DRIVER_ST7796)
  lgfx::Panel_ST7796 _panel;
#else
  lgfx::Panel_ILI9488 _panel;
#endif
  lgfx::Bus_SPI _bus;
public:
  LGFX() {
    {
      auto cfg = _bus.config();
      cfg.spi_host = SPI3_HOST;
      cfg.spi_mode = 0;
      cfg.freq_write = TFT_SPI_FREQ;
      cfg.freq_read = 16000000;
      cfg.spi_3wire = false;
      cfg.use_lock = true;
      cfg.dma_channel = SPI_DMA_CH_AUTO;
      cfg.pin_sclk = TFT_PIN_SCLK;
      cfg.pin_mosi = TFT_PIN_MOSI;
      cfg.pin_miso = TFT_PIN_MISO;
      cfg.pin_dc = TFT_PIN_DC;
      _bus.config(cfg);
      _panel.setBus(&_bus);
    }
    {
      auto cfg = _panel.config();
      cfg.pin_cs = TFT_PIN_CS;
      cfg.pin_rst = TFT_PIN_RST;
      cfg.pin_busy = -1;
      cfg.panel_width = 320;
      cfg.panel_height = 480;
      cfg.offset_x = 0;
      cfg.offset_y = 0;
      cfg.offset_rotation = 0;
      cfg.dummy_read_pixel = 8;
      cfg.dummy_read_bits = 1;
      cfg.readable = false;
      cfg.invert = TFT_INVERT;
      cfg.rgb_order = TFT_RGB_ORDER;
      cfg.dlen_16bit = false;
      cfg.bus_shared = false;
      _panel.config(cfg);
    }
    setPanel(&_panel);
  }
};
