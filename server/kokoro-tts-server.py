#!/usr/bin/env python3
"""Local text-to-speech over Kokoro (https://github.com/thewh1teagle/kokoro-onnx),
a drop-in replacement for tts-server.mjs (Piper): same port, same endpoints,
so the app doesn't know or care which one is running.

POST /speak { text } -> synthesizes (or reuses a cached) WAV file and
returns { id, url }; GET /audio/<id>.wav serves that file.

Unlike the Piper server this keeps the model loaded in-process, since
Kokoro's load time would otherwise dominate every request. Voice is set by:
  KOKORO_VOICE  blend spec, e.g. "af_heart:0.6,af_bella:0.4" (see kokoro_voice.py)
  KOKORO_SPEED  speaking rate, 1.0 = Kokoro's default
  KOKORO_DRAWL  "0" turns off the phoneme-level Southern accent
"""

import hashlib
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from kokoro_voice import blend_voice, load_kokoro, synthesize_wav

CACHE_DIR = Path(__file__).parent / "data" / "tts-cache"
VOICE = os.environ.get("KOKORO_VOICE", "af_heart:0.6,af_bella:0.4")
SPEED = float(os.environ.get("KOKORO_SPEED", "0.9"))
DRAWL = os.environ.get("KOKORO_DRAWL", "1") != "0"
PORT = int(os.environ.get("PORT", "11436"))

VOICE_LABEL = f"kokoro {VOICE} @{SPEED}{' +drawl' if DRAWL else ''}"
HEX = set("0123456789abcdef")

CACHE_DIR.mkdir(parents=True, exist_ok=True)
kokoro = load_kokoro()
style = blend_voice(kokoro, VOICE)
# One synthesis at a time — parallel ONNX runs just fight over the same cores.
synth_lock = threading.Lock()


def synthesize(text: str) -> str:
    audio_id = hashlib.sha256(f"{VOICE_LABEL} {text}".encode()).hexdigest()
    wav_path = CACHE_DIR / f"{audio_id}.wav"
    if not wav_path.exists():
        with synth_lock:
            if not wav_path.exists():
                wav_path.write_bytes(synthesize_wav(kokoro, text, style, SPEED, DRAWL))
    return audio_id


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, body: dict) -> None:
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/health":
            return self._send_json(200, {"status": "ok", "voice": VOICE_LABEL})

        if self.path.startswith("/audio/"):
            audio_id = self.path[len("/audio/") :].removesuffix(".wav")
            if len(audio_id) != 64 or not set(audio_id) <= HEX:
                return self._send_json(400, {"error": "invalid id"})
            wav_path = CACHE_DIR / f"{audio_id}.wav"
            if not wav_path.exists():
                return self._send_json(404, {"error": "not found"})
            data = wav_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(data)
            return

        self._send_json(404, {"error": "not found"})

    def do_POST(self) -> None:
        if self.path != "/speak":
            return self._send_json(404, {"error": "not found"})
        try:
            length = int(self.headers.get("Content-Length", 0))
            text = json.loads(self.rfile.read(length) or b"{}").get("text")
            if not text or not isinstance(text, str):
                return self._send_json(400, {"error": "text is required"})
            audio_id = synthesize(text)
            self._send_json(200, {"id": audio_id, "url": f"/audio/{audio_id}.wav"})
        except Exception as err:  # noqa: BLE001 — surface any synthesis failure to the client
            self._send_json(500, {"error": str(err) or "synthesis failed"})

    def log_message(self, format: str, *args) -> None:
        pass  # quiet, like tts-server.mjs


if __name__ == "__main__":
    print(f"TTS server listening on http://0.0.0.0:{PORT} (voice: {VOICE_LABEL})", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
