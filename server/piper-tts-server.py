#!/usr/bin/env python3
"""Local text-to-speech over Piper with Dolly's Southern drawl — the voice
server the Pi runs. Same port and endpoints as the Kokoro server (see tts_http.py).

It keeps the voice loaded between requests (starting `python -m piper` per
request took ~4s each on a Pi, mostly reloading the voice), so each sentence
comes back fast enough for Dolly to keep talking while the reply is still
being written. Settings:
  PIPER_VOICE   voice name, e.g. en_US-amy-medium (an .onnx in PIPER_DATA_DIR)
  PIPER_SPEED   speaking rate, 1.0 = the voice's default; lower is slower
  PIPER_DRAWL   "0" turns off the Southern accent (see drawl.py)
  PIPER_LOUDER  "0" skips the compress-and-normalize step (see loudness.py)
"""

import io
import os
import wave
from pathlib import Path

import numpy as np
from piper import PiperVoice, SynthesisConfig

from drawl import drawl, southern_text
from loudness import louder
from tts_http import serve

VOICES_DIR = Path(os.environ.get("PIPER_DATA_DIR", Path(__file__).parent / "voices"))
VOICE = os.environ.get("PIPER_VOICE", "en_US-amy-medium")
SPEED = float(os.environ.get("PIPER_SPEED", "0.88"))
DRAWL = os.environ.get("PIPER_DRAWL", "1") != "0"
LOUDER = os.environ.get("PIPER_LOUDER", "1") != "0"
PORT = int(os.environ.get("PORT", "11436"))

VOICE_LABEL = f"piper {VOICE} @{SPEED}{' +drawl' if DRAWL else ''}{' +louder' if LOUDER else ''}"

voice = PiperVoice.load(str(VOICES_DIR / f"{VOICE}.onnx"))
# Piper's length_scale is duration, the inverse of speed; slower is part of a drawl.
syn_config = SynthesisConfig(length_scale=1 / SPEED)
known_phonemes = set(voice.config.phoneme_id_map)


def synthesize_wav(text: str) -> bytes:
    if DRAWL:
        text = southern_text(text)
    chunks = []
    for sentence in voice.phonemize(text):
        phonemes = "".join(sentence)
        if DRAWL:
            phonemes = drawl(phonemes)
        ids = voice.phonemes_to_ids([p for p in phonemes if p in known_phonemes])
        chunks.append(voice.phoneme_ids_to_audio(ids, syn_config))
    audio = np.concatenate(chunks) if chunks else np.zeros(0, dtype=np.float32)
    if LOUDER:
        audio = louder(audio, voice.config.sample_rate)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(voice.config.sample_rate)
        wav.writeframes((audio.clip(-1, 1) * 32767).astype("<i2").tobytes())
    return buf.getvalue()


if __name__ == "__main__":
    serve(PORT, VOICE_LABEL, synthesize_wav)
