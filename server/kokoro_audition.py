"""Renders one Southern test line in a handful of candidate Kokoro voice blends,
so they can be compared by ear before picking one for the TTS server.

    kokoro-venv/bin/python kokoro_audition.py            # the built-in candidates
    kokoro-venv/bin/python kokoro_audition.py "af_bella:0.7,af_sky:0.3"   # try your own

Clips land in data/auditions/; play one on a Mac with `afplay data/auditions/<name>.wav`.
"""

import sys
from pathlib import Path

from kokoro_voice import blend_voice, drawl, load_kokoro, synthesize_wav

LINE = (
    "Well hey there, sugar! I'm fixing to tell you about the time I drove my old "
    "pickup truck all the way down to Nashville. Ten dollars and a dream, honey. "
    "That was all I had, and I reckon it was plenty."
)

CANDIDATES = {
    "1-heart-plain": ("af_heart", False),
    "2-heart": ("af_heart", True),
    "3-heart-bella": ("af_heart:0.6,af_bella:0.4", True),
    "4-bella-sarah": ("af_bella:0.7,af_sarah:0.3", True),
    "5-heart-nicole-bella": ("af_heart:0.5,af_nicole:0.3,af_bella:0.2", True),
    "6-jessica-bella": ("af_jessica:0.5,af_bella:0.5", True),
    "7-heart-kore": ("af_heart:0.7,af_kore:0.3", True),
}

SPEED = 0.9  # a touch slower — part of what makes a drawl a drawl


def main() -> None:
    out_dir = Path(__file__).parent / "data" / "auditions"
    out_dir.mkdir(parents=True, exist_ok=True)
    kokoro = load_kokoro()

    candidates = (
        {f"custom-{i + 1}": (spec, True) for i, spec in enumerate(sys.argv[1:])}
        if len(sys.argv) > 1
        else CANDIDATES
    )

    print("Phonemes with drawl:", drawl(kokoro.tokenizer.phonemize(LINE, "en-us")), "\n")
    for name, (spec, southern) in candidates.items():
        wav = synthesize_wav(kokoro, LINE, blend_voice(kokoro, spec), SPEED, southern)
        path = out_dir / f"{name}.wav"
        path.write_bytes(wav)
        print(f"{path.relative_to(Path(__file__).parent)}  ←  {spec}{'' if southern else '  (no drawl)'}")


if __name__ == "__main__":
    main()
