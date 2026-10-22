"""Makes synthesized speech louder on a small speaker without clipping it.

Raw Piper output peaks a few dB short of full scale and averages around
-21 dBFS, which is quiet through the kiosk's little I2S amp. A few sharp
consonant spikes are what stop it simply being turned up, so:
  1. A gentle compressor evens out loud and soft syllables.
  2. The clip is turned up to a target average loudness.
  3. A fast peak limiter tucks in the few spikes that would now clip, too
     briefly to hear, instead of letting them hold the whole clip down.

Vectorized (no per-sample Python loop), so it adds only milliseconds per
sentence on a Pi.
"""

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

THRESHOLD_DB = -24.0  # syllables louder than this get compressed...
RATIO = 3.0  # ...by this much (3 dB in -> 1 dB out above the threshold)
FRAME_MS = 10
SMOOTH_MS = 40  # how gradually the compressor's gain moves, so it doesn't "pump"
TARGET_RMS_DB = -15.0
MAX_BOOST_DB = 12.0  # so a nearly silent clip isn't blown up into hiss
CEILING = 10 ** (-1.0 / 20)  # limiter ceiling: -1 dBFS
LIMITER_MS = 3


def _moving(x: np.ndarray, width: int, reduce) -> np.ndarray:
    """`reduce` (np.min, np.mean) over a centered window of `width` samples."""
    half = width // 2
    padded = np.pad(x, (half, width - 1 - half), mode="edge")
    return reduce(sliding_window_view(padded, width), axis=1)


def _compress(audio: np.ndarray, sample_rate: int) -> np.ndarray:
    frame = max(1, sample_rate * FRAME_MS // 1000)
    padded = np.pad(audio, (0, -audio.size % frame))
    rms = np.sqrt(np.mean(padded.reshape(-1, frame) ** 2, axis=1)) + 1e-9
    over = np.maximum(20 * np.log10(rms) - THRESHOLD_DB, 0)
    gain_db = _moving(-over * (1 - 1 / RATIO), max(1, SMOOTH_MS // FRAME_MS), np.mean)
    frame_centers = np.arange(gain_db.size) * frame + frame / 2
    return audio * 10 ** (np.interp(np.arange(audio.size), frame_centers, gain_db) / 20)


def _limit(audio: np.ndarray, sample_rate: int) -> np.ndarray:
    # The gain each sample needs to stay under the ceiling, held at its lowest
    # across a short window and then smoothed. Min-then-average over the same
    # width never lets the gain rise above what any sample in reach needs.
    width = max(1, sample_rate * LIMITER_MS // 1000)
    needed = np.minimum(1.0, CEILING / np.maximum(np.abs(audio), 1e-9))
    gain = _moving(_moving(needed, width, np.min), width, np.mean)
    return audio * gain


def louder(audio: np.ndarray, sample_rate: int) -> np.ndarray:
    """Takes and returns mono float audio in [-1, 1]."""
    if audio.size == 0:
        return audio
    out = _compress(audio, sample_rate)
    rms_db = 20 * np.log10(np.sqrt(np.mean(out**2)) + 1e-9)
    out = out * 10 ** (min(TARGET_RMS_DB - rms_db, MAX_BOOST_DB) / 20)
    return _limit(out, sample_rate).clip(-1, 1)
