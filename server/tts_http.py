"""The HTTP side shared by the TTS servers (Piper and Kokoro): same port and
endpoints for both, so the app doesn't know or care which engine is running.

POST /speak { text } -> synthesizes (or reuses a cached) WAV file and
returns { id, url }; GET /audio/<id>.wav serves that file.
"""

import hashlib
import json
import threading
from collections.abc import Callable
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

CACHE_DIR = Path(__file__).parent / "data" / "tts-cache"
HEX = set("0123456789abcdef")


def serve(port: int, voice_label: str, synthesize_wav: Callable[[str], bytes]) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    # One synthesis at a time — parallel ONNX runs just fight over the same cores.
    synth_lock = threading.Lock()

    def synthesize(text: str) -> str:
        # The label is part of the key, so changing voice settings never
        # serves a stale clip from the cache.
        audio_id = hashlib.sha256(f"{voice_label} {text}".encode()).hexdigest()
        wav_path = CACHE_DIR / f"{audio_id}.wav"
        if not wav_path.exists():
            with synth_lock:
                if not wav_path.exists():
                    wav_path.write_bytes(synthesize_wav(text))
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
                return self._send_json(200, {"status": "ok", "voice": voice_label})

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
            pass  # quiet

    print(f"TTS server listening on http://0.0.0.0:{port} (voice: {voice_label})", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
