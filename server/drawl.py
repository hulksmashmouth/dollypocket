"""A Southern drawl applied to espeak IPA, shared by the Piper and Kokoro servers.

Neither engine ships a Southern voice, but both speak espeak phonemes, so the
accent is put straight into the phoneme string before synthesis. Two layers:
  1. TEXT_RULES — word swaps on the text itself ("you all" -> "y'all").
  2. DRAWL_RULES — Southern US vowel shifts on the phonemes, e.g. "tˈaɪm" -> "tˈaːm".
"""

import re

TEXT_RULES = [
    (re.compile(r"\byou all\b", re.I), "y'all"),
    (re.compile(r"\bgoing to\b", re.I), "gonna"),
    (re.compile(r"\bwant to\b", re.I), "wanna"),
]

# Order matters: later rules see what earlier ones produced (pin-pen turns
# "ten" into "tɪn" before breaking turns that into "tɪən").
DRAWL_RULES = [
    # /aɪ/ glide flattening — the signature Southern vowel: I -> "Ah", time -> "tahm".
    (re.compile(r"aɪ"), "aː"),
    # -ing -> -in' ("fixin'", "singin'"); only unstressed word-final, so "sing" keeps its ŋ.
    (re.compile(r"(?<=[^ˈˌ\s])ɪŋ(?=[\s,.!?;:]|$)"), "ɪn"),
    # Pin-pen merger: "ten" -> "tin", "when" -> "win", "remember" -> "rimimber".
    (re.compile(r"ɛ(?=[nm])"), "ɪ"),
    # /aʊ/ fronting: "down" -> "dæʊn", "house" -> "hæʊs".
    (re.compile(r"aʊ"), "æʊ"),
    # Drawl "breaking": stressed short vowels stretch into a little two-part
    # glide — "yes" -> "yeh-us", "hand" -> "hay-and", "him" -> "hee-um",
    # "song" -> "sah-ong". This is most of what makes it sound like a twang.
    (re.compile(r"(?<=ˈ)([^ˈˌ\s]*?)ɛ(?![ɹəː])"), r"\1ɛːə"),
    (re.compile(r"(?<=ˈ)([^ˈˌ\s]*?)æ(?![ʊː])"), r"\1æːɛ"),
    (re.compile(r"(?<=ˈ)([^ˈˌ\s]*?)ɪ(?![ɹəŋ])"), r"\1ɪə"),
    (re.compile(r"(?<=ˈ)([^ˈˌ\s]*?)ɔ(?![ɹɪː])"), r"\1ɑɔ"),
]


def southern_text(text: str) -> str:
    for pattern, replacement in TEXT_RULES:
        text = pattern.sub(replacement, text)
    return text


def drawl(phonemes: str) -> str:
    for pattern, replacement in DRAWL_RULES:
        phonemes = pattern.sub(replacement, phonemes)
    return phonemes
