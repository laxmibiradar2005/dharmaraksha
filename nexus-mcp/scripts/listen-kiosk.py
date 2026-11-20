"""Capture one bounded utterance using local energy gating. Output WAV only on speech."""
import io
import math
import os
import select
import struct
import subprocess
import sys
import time
import wave
import json

command = ['arecord', '-q', '-D', os.environ.get('KIOSK_MIC', 'plughw:CARD=Device,DEV=0'), '-t', 'raw', '-f', 'S16_LE', '-r', '16000', '-c', '1']
process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
frames = []
preroll = []
started = None
last_voice = 0
begin = time.monotonic()
voice_frames = 0
levels = []
threshold = float(os.environ.get('KIOSK_MIC_RMS', '240'))
try:
    while time.monotonic()-begin < 35:
        now = time.monotonic()
        ready, _, _ = select.select([process.stdout], [], [], .2)
        if not ready:
            if process.poll() is not None: raise RuntimeError('microphone unavailable')
            if started is None and now-begin > 7: break
            continue
        raw = os.read(process.stdout.fileno(), 2560)
        if not raw:
            if process.poll() is not None: raise RuntimeError('microphone stopped unexpectedly')
            break
        samples = struct.unpack('<'+'h'*(len(raw)//2), raw)
        rms = math.sqrt(sum(s*s for s in samples)/max(1,len(samples)))
        levels.append(rms)
        if now-begin < .45:
            preroll.append(raw)
            continue
        if started is None:
            baseline = sorted(levels[:6])[max(0, len(levels[:6])//4)]
            threshold = max(float(os.environ.get('KIOSK_MIC_RMS', '240')), min(3000, baseline * 1.8))
        voiced = rms > threshold
        if voiced:
            last_voice = now; voice_frames += 1
            if started is None: started = now; frames.extend(preroll)
        if started is not None:
            frames.append(raw)
            if now-last_voice > 1.4 or now-started > 28: break
        else:
            preroll.append(raw); preroll=preroll[-5:]
            if now-begin > 7: break
finally:
    process.terminate()
    try: process.wait(timeout=2)
    except subprocess.TimeoutExpired: process.kill(); process.wait()
sys.stderr.write(json.dumps({'peakRms': round(max(levels, default=0)), 'threshold': round(threshold), 'speechFrames': voice_frames, 'seconds': round(sum(len(f) for f in frames)/32000, 2)})+'\n')
if voice_frames >= 4:
    out=io.BytesIO()
    with wave.open(out,'wb') as wav:
        wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(16000);wav.writeframes(b''.join(frames))
    sys.stdout.buffer.write(out.getvalue())
