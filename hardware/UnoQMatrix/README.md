# UNO Q matrix animation

`UnoQMatrix.ino` draws gently breathing scales on the UNO Q LED matrix. It runs on the STM32 independently of the Linux kiosk and does not change ESP32 reader wiring.

On UNO Q:

```sh
arduino-cli compile --fqbn arduino:zephyr:unoq --output-dir /tmp/dharma-matrix-build ~/dharmaraksha/hardware/UnoQMatrix
```

Use Arduino App Lab / Arduino CLI upload with the UNO Q board selected. With the core's default **dynamic** link mode, the upload artifact is `UnoQMatrix.ino.elf-zsk.bin`. Do not flash the raw `.bin`: it lacks the sketch container expected by the loader. The static link mode uses a different artifact.

The animation is decorative, not a microphone or connection-status indicator.
