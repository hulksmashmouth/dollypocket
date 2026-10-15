"""Shared Kokoro helpers: blended voices and a phoneme-level Southern drawl.

Kokoro ships no Southern-accented voice, so Dolly's is built in two layers:
  1. Timbre — a weighted blend of Kokoro's stock voice styles, written as
     "af_heart:0.6,af_bella:0.4" (weights are normalized, so they needn't sum to 1).
  2. Accent — Kokoro speaks IPA phonemes, so Southern US vowel shifts are
     applied straight to the phoneme string before synthesis (see DRAWL_RULES).
"""

import io
import re
import wave
from pathlib import Path

import numpy as np
from kokoro_onnx import Kokoro

MODEL_DIR = Path(__file__).parent / "kokoro"

# Each rule is (pattern, replacement) over espeak IPA, e.g. "tˈaɪm" -> "tˈaːm".
DRAWL_RULES = [
    # /aɪ/ glide flattening — the signature Southern vowel: I -> "Ah", time -> "tahm".
    (re.compile(r"aɪ"), "aː"),
    # -ing -> -in' ("fixin'", "singin'"); only unstressed word-final, so "sing" keeps its ŋ.
    (re.compile(r"(?<=[^ˈˌ\s])ɪŋ(?=[\s,.!?;:]|$)"), "ɪn"),
    # Pin-pen merger: "ten" -> "tin", "when" -> "win", "remember" -> "rimimber".
    (re.compile(r"ɛ(?=[nm])"), "ɪ"),
    # Drawl "breaking" of stressed short vowels into a little two-part glide:
    # "yes" -> "yeh-us", "hand" -> "hay-and".
    (re.compile(r"(?<=ˈ)([^ˈˌ\s]*?)ɛ(?![ɹə])"), r"\1ɛə"),
    (re.compile(r"(?<=ˈ)([^ˈˌ\s]*?)æ"), r"\1æɛ"),
]


def load_kokoro() -> Kokoro:
    return Kokoro(str(MODEL_DIR / "kokoro-v1.0.onnx"), str(MODEL_DIR / "voices-v1.0.bin"))


def blend_voice(kokoro: Kokoro, spec: str) -> np.ndarray:
    """Turns "af_heart:0.6,af_bella:0.4" (or a bare "af_heart") into one style vector."""
    parts = []
    for item in spec.split(","):
        name, _, weight = item.strip().partition(":")
        parts.append((name, float(weight or 1)))
    total = sum(w for _, w in parts)
    return sum(kokoro.get_voice_style(name) * (w / total) for name, w in parts)


def drawl(phonemes: str) -> str:
    for pattern, replacement in DRAWL_RULES:
        phonemes = pattern.sub(replacement, phonemes)
    return phonemes


def synthesize_wav(
    kokoro: Kokoro, text: str, style: np.ndarray, speed: float, southern: bool
) -> bytes:
    phonemes = kokoro.tokenizer.phonemize(text, "en-us")
    if southern:
        phonemes = drawl(phonemes)
    samples, sample_rate = kokoro.create(phonemes, voice=style, speed=speed, is_phonemes=True)

    pcm = (np.clip(samples, -1, 1) * 32767).astype("<i2")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm.tobytes())
    return buf.getvalue()
