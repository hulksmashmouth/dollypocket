#!/usr/bin/env python3
"""Local text-to-speech over Kokoro (https://github.com/thewh1teagle/kokoro-onnx),
a drop-in replacement for the Piper servers: same port and endpoints (see
tts_http.py). Keeps the model loaded in-process, since Kokoro's load time
would otherwise dominate every request. Voice is set by:
  KOKORO_VOICE  blend spec, e.g. "af_heart:0.6,af_bella:0.4" (see kokoro_voice.py)
  KOKORO_SPEED  speaking rate, 1.0 = Kokoro's default
  KOKORO_DRAWL  "0" turns off the phoneme-level Southern accent
"""

import os

from kokoro_voice import blend_voice, load_kokoro, synthesize_wav
from tts_http import serve

VOICE = os.environ.get("KOKORO_VOICE", "af_heart:0.6,af_bella:0.4")
SPEED = float(os.environ.get("KOKORO_SPEED", "0.9"))
DRAWL = os.environ.get("KOKORO_DRAWL", "1") != "0"
PORT = int(os.environ.get("PORT", "11436"))

VOICE_LABEL = f"kokoro {VOICE} @{SPEED}{' +drawl' if DRAWL else ''}"

kokoro = load_kokoro()
style = blend_voice(kokoro, VOICE)

if __name__ == "__main__":
    serve(PORT, VOICE_LABEL, lambda text: synthesize_wav(kokoro, text, style, SPEED, DRAWL))
