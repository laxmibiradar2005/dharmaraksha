"""Local-only document scanner. Frames remain in RAM; no images are logged/saved."""
import base64
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import cv2
import numpy as np

cv2.setNumThreads(2)
lock = threading.Lock()
state = {'ready': False, 'issues': ['Place one page under the camera.']}
document = None
preview = None
last_use = 0.0


def corners(points):
    points = np.asarray(points, dtype=np.float32).reshape(4, 2)
    sums, differences = points.sum(axis=1), np.diff(points, axis=1).ravel()
    return np.array([points[np.argmin(sums)], points[np.argmin(differences)],
                     points[np.argmax(sums)], points[np.argmax(differences)]], dtype=np.float32)


def inspect(frame):
    """Conservative heuristic gate, not a claim that OCR will be error-free."""
    h, w = frame.shape[:2]
    scale = 720 / w
    small = cv2.resize(frame, (720, round(h * scale)))
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 45, 130)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    quad = None
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:12]:
        area = cv2.contourArea(contour) / gray.size
        poly = cv2.approxPolyDP(contour, .025 * cv2.arcLength(contour, True), True)
        if .18 < area < .94 and len(poly) == 4 and cv2.isContourConvex(poly):
            quad = corners(poly)
            break
    if quad is None:
        return small, None, {'ready': False, 'issues': ['Show all four page corners on a darker background.']}, None
    cv2.polylines(small, [quad.astype(np.int32)], True, (70, 190, 130), 3)
    q = quad / scale
    tl, tr, br, bl = q
    width = int(max(np.linalg.norm(tr-tl), np.linalg.norm(br-bl)))
    height = int(max(np.linalg.norm(bl-tl), np.linalg.norm(br-tr)))
    transform = cv2.getPerspectiveTransform(q, np.float32([[0, 0], [width-1, 0], [width-1, height-1], [0, height-1]]))
    crop = cv2.warpPerspective(frame, transform, (width, height))
    g = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    normalized = cv2.resize(g, (600, max(1, round(600 * height / width))))
    sharp = float(cv2.Laplacian(normalized, cv2.CV_64F).var())
    bright = float(g.mean())
    contrast = float(g.std())
    issues = []
    if min(width, height) < 620: issues.append('Bring the page closer while keeping all four corners visible.')
    if sharp < 85: issues.append('The text is blurry. Hold still and let the camera focus.')
    if bright < 65: issues.append('Add more even light to the page.')
    if bright > 247 or (g > 253).mean() > .65: issues.append('Reduce glare or move the light away from the page.')
    if contrast < 18: issues.append('Text contrast is too low. Adjust the light or page position.')
    # Compare downsampled page pixels for both movement and duplicate-page prevention.
    fingerprint = cv2.resize(g, (32, 32)).astype(np.float32)
    return small, crop, {'ready': not issues, 'issues': issues, 'sharpness': round(sharp), 'brightness': round(bright)}, (quad, fingerprint)


def camera_loop():
    global state, document, preview
    cap = None
    previous = None
    stable_since = time.monotonic()
    opened = stable_since
    while True:
        now = time.monotonic()
        if now-last_use > 20:
            if cap is not None: cap.release(); cap = None
            with lock: document = None; preview = None; state = {'ready': False, 'issues': ['Camera is resting.']}
            time.sleep(.3); continue
        if cap is None:
            cap = cv2.VideoCapture(os.environ.get('KIOSK_CAMERA', '/dev/video0'), cv2.CAP_V4L2)
            cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
            cap.set(cv2.CAP_PROP_FPS, 10)
            cap.set(cv2.CAP_PROP_AUTOFOCUS, 1)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            opened = now; stable_since = now; previous = None
        ok, frame = cap.read()
        if not ok:
            with lock: state = {'ready': False, 'issues': ['Camera disconnected. Check the USB connection.']}; document = None; preview = None
            cap.release(); cap = None; time.sleep(1); continue
        try:
            shown, crop, result, marker = inspect(frame)
            if marker is None or previous is None or np.abs(marker[0]-previous[0]).mean() > 2 or np.abs(marker[1]-previous[1]).mean() > 5:
                stable_since = now
            previous = marker
            stable = now-stable_since >= 2 and now-opened >= 3
            result['stable'] = stable
            if result['ready'] and not stable: result['ready'] = False; result['issues'] = ['Hold still. Waiting for focus and a steady page.']
            if result['ready']: result['issues'] = ['Page is steady and passes the image checks.']
            _, encoded = cv2.imencode('.jpg', shown, [cv2.IMWRITE_JPEG_QUALITY, 70])
            capture_frame = crop if crop is not None else frame
            _, captured = cv2.imencode('.jpg', capture_frame, [cv2.IMWRITE_JPEG_QUALITY, 94])
            if crop is not None:
                _, cropped = cv2.imencode('.jpg', crop, [cv2.IMWRITE_JPEG_QUALITY, 94])
                thumb = cv2.resize(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY), (32, 32))
                result['fingerprint'] = base64.b64encode(thumb.tobytes()).decode()
            with lock:
                result['frameTime'] = time.monotonic()
                state = result; preview = encoded.tobytes()
                document = captured.tobytes()
        except Exception:
            with lock: state = {'ready': False, 'issues': ['Cannot identify a readable page. Reposition the document.']}; document = None
        time.sleep(.08)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def do_GET(self):
        global last_use
        last_use = time.monotonic()
        if self.path == '/stream':
            self.send_response(200)
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            try:
                while True:
                    last_use = time.monotonic()
                    with lock: image = preview
                    if image:
                        self.wfile.write(b'--frame\r\nContent-Type: image/jpeg\r\nContent-Length: '+str(len(image)).encode()+b'\r\n\r\n'+image+b'\r\n')
                        self.wfile.flush()
                    time.sleep(.125)
            except (BrokenPipeError, ConnectionResetError, TimeoutError): return
        with lock:
            result = dict(state)
            fresh = time.monotonic()-result.pop('frameTime', 0) <= 3
            if not fresh:
                result['ready'] = False
                result['issues'] = ['Waiting for a fresh camera frame.']
            if self.path == '/capture':
                if not fresh or document is None:
                    self.send_response(422); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(json.dumps(result).encode()); return
                result['image'] = base64.b64encode(document).decode()
            elif self.path == '/frame':
                if preview: result['preview'] = base64.b64encode(preview).decode()
            elif self.path == '/quality': pass
            else:
                self.send_response(404); self.end_headers(); return
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Cache-Control', 'no-store'); self.end_headers()
        try: self.wfile.write(json.dumps(result).encode())
        except (BrokenPipeError, ConnectionResetError): pass


if __name__ == '__main__':
    threading.Thread(target=camera_loop, daemon=True).start()
    ThreadingHTTPServer(('127.0.0.1', 8083), Handler).serve_forever()
