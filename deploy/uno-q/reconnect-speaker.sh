#!/usr/bin/env bash
# This board's explicitly selected speaker; do not pair unknown devices.
set -eu
speaker=88:81:75:22:10:03
if ! bluetoothctl info "$speaker" | grep -q 'Connected: yes'; then
  timeout 12 bluetoothctl connect "$speaker" >/dev/null
fi
bluetoothctl info "$speaker" | grep -q 'Connected: yes'
pw-dump | python3 -c '
import json,subprocess,sys
for obj in json.load(sys.stdin):
    p=obj.get("info",{}).get("props",{})
    name=p.get("node.name","").replace("_",":")
    if p.get("media.class")=="Audio/Sink" and "88:81:75:22:10:03" in name:
        subprocess.run(["wpctl","set-default",str(obj["id"])],check=True)
'
