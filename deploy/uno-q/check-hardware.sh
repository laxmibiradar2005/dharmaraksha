#!/usr/bin/env bash
# Inventory only: no recording, playback, network transmission or installation.
set -u
printf '\nSystem\n'
uname -m
free -h
df -h /
printf '\nNetwork addresses\n'
hostname -I
printf '\nUSB devices\n'
command -v lsusb >/dev/null && lsusb
printf '\nCamera devices\n'
command -v v4l2-ctl >/dev/null && v4l2-ctl --list-devices
printf '\nAudio capture devices\n'
command -v arecord >/dev/null && arecord -l
printf '\nAudio playback devices\n'
command -v aplay >/dev/null && aplay -l
printf '\nBluetooth controller\n'
command -v bluetoothctl >/dev/null && bluetoothctl show
printf '\nUser audio session\n'
command -v wpctl >/dev/null && wpctl status
printf '\nThese inventory results do not certify the application device bridge.\n'
