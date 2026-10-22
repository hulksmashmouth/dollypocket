"""An East Tennessee accent applied to espeak IPA, shared by the Piper and Kokoro servers.

Neither engine ships a Southern voice, but both speak espeak phonemes, so the
accent is put straight into the phoneme string before synthesis. The target is
Dolly's own: Smoky Mountain (Southern Appalachian) English from Sevier County,
which layers mountain features on top of the general Southern Vowel Shift.
Three layers, applied in order:
  1. TEXT_RULES — word swaps on the text itself ("you all" -> "y'all").
  2. WORD_RULES — whole-word pronunciations espeak would never guess: the
     mountain forms ("cain't", "git", "purdy", "warsh", "holler") and
     first-syllable stress ("HO-tel", "PO-lice", "GEE-tar").
  3. DRAWL_RULES — sound changes across every word: the vowel shifts below,
     then "breaking", the glide on stressed short vowels that is most of what
     people hear as a drawl.

Only sounds espeak's own en-us output uses are produced (the Piper voice was
trained on nothing else, and Kokoro drops symbols outside its vocabulary), so
e.g. fronted /u/ is written "ɪu" rather than "ʉ".

espeak puts the stress mark directly before the stressed vowel ("θˈɪŋ"), so a
vowel straight after ˈ is the stressed one; after ˌ, the secondary stress.
"""

import re

# Part of the TTS servers' cache key: bump it whenever the rules change, so
# clips cached under the old accent aren't served again.
DRAWL_VERSION = 2

TEXT_RULES = [
    (re.compile(r"\byou all\b", re.I), "y'all"),
    (re.compile(r"\bgoing to\b", re.I), "gonna"),
    (re.compile(r"\bwant to\b", re.I), "wanna"),
    # "I'm about to" -> "I'm fixin' to" (only the "on the verge of" sense).
    (re.compile(r"\b(am|'m|is|'s|are|'re|was|were) about to\b", re.I), r"\1 fixin' to"),
]

# A phoneme "word" is delimited by spaces and the punctuation espeak keeps.
_START = r"(?<![^\s\"(])"
_END = r"(?=[\s,.!?;:\")]|$)"


def _word(raw: str, southern: str):
    return (re.compile(_START + re.escape(raw) + _END), southern)


WORD_RULES = [
    # Stress pulled forward onto the first syllable — a strong Southern and
    # Appalachian marker.
    _word("hoʊtˈɛl", "hˈoʊtɛl"),  # HO-tel
    _word("pəlˈiːs", "pˈoʊliːs"),  # PO-lice
    _word("ɡɪtˈɑːɹ", "ɡˈiːtɑːɹ"),  # GEE-tar
    _word("ɪnʃˈʊɹɹəns", "ˈɪnʃʊɹəns"),  # IN-surance
    _word("ʌmbɹˈɛlə", "ˈʌmbɹɛlə"),  # UM-brella
    _word("sᵻmˈɛnt", "sˈiːmɛnt"),  # SEE-ment
    _word("aɪdˈiə", "ˈaɪdiə"),  # I-dee-a
    _word("dɪtɹˈɔɪt", "dˈiːtɹɔɪt"),  # DEE-troit
    (re.compile(_START + r"dʒuːlˈaɪ(ʲ?)" + _END), r"dʒˈuːlaɪ\1"),  # JOO-ly
    # Mountain pronunciations of everyday words.
    _word("kˈænt", "kˈeɪnt"),  # cain't
    _word("pɹˈɪɾi", "pˈɜːɾi"),  # purdy
    _word("wˈɑːʃ", "wˈɔːɹʃ"),  # warsh
    _word("bɪkˈʌz", "kˈʌz"),  # 'cause
    _word("pɹˈɑːbəbli", "pɹˈɑːbli"),  # prob'ly
    (re.compile(_START + r"([ʃp])ˈʊɹ" + _END), r"\1ˈoʊɹ"),  # shore, pore (sure, poor)
    (re.compile(_START + r"ðˌ?ɛm" + _END), "əm"),  # 'em
    (re.compile(_START + r"juː" + _END), "jə"),  # ya — unstressed "you" only
    (re.compile(_START + r"jʊɹ" + _END), "jɚ"),  # yer
    # jist — left unstressed, as it's said, so breaking doesn't stretch it.
    (re.compile(_START + r"dʒ[ˈˌ]?ʌst"), "dʒɪst"),
    # get -> git, forget -> fergit, getting -> gittin'.
    (re.compile(r"ɡ([ˈˌ]?)ɛ(?=[tɾ])"), r"ɡ\1ɪ"),
    # Unstressed final -ow -> -er: holler, yeller, winder, feller, tomorrer.
    (re.compile(r"(?<=[ldɹ])oʊ" + _END), "ɚ"),
]

# Order matters: later rules see what earlier ones produced.
DRAWL_RULES = [
    # /aɪ/ flattening before r: fire -> "far", tired -> "tard".
    (re.compile(r"aɪɚ"), "aːɹ"),
    # /aɪ/ glide flattening — the signature Southern vowel: I -> "Ah",
    # time -> "tahm". In the mountains it happens before voiceless consonants
    # too ("nahs rahd" for "nice ride"), not just at word ends.
    (re.compile(r"aɪ"), "aː"),
    # /ɔɪ/ before l: oil -> "awl", boil -> "bawl".
    (re.compile(r"ɔɪl"), "ɔːl"),
    # Fill-feel and sale-sell mergers before l: feel -> "fill", real -> "rill",
    # sale -> "sell" (then broken below into "say-ul").
    (re.compile(r"(?<=[ˈˌ])iːʲ?ə?l"), "ɪəl"),
    (re.compile(r"(?<=[ˈˌ])eɪl"), "ɛl"),
    # -ing -> -in' ("fixin'", "singin'"); only unstressed word-final.
    (re.compile(r"(?<=[^ˈˌ\s])ɪŋ" + _END), "ɪn"),
    # Stressed -ing/-ink raises: thing -> "thang", think -> "thank".
    (re.compile(r"(?<=[ˈˌ])ɪŋ"), "eɪŋ"),
    # Pin-pen merger: "ten" -> "tin", "when" -> "win", "Tennessee" -> "Tinnessee".
    (re.compile(r"ɛ(?=[nm])"), "ɪ"),
    # Southern Vowel Shift: /eɪ/ drops toward "eh-ee" (day -> "deh-ee"),
    # /oʊ/ and /aʊ/ front (go -> "geh-oo", down -> "dæwn"), and /u/ fronts
    # after tongue-tip consonants (new -> "nyew", do -> "dyew").
    (re.compile(r"(?<=[ˈˌ])eɪ"), "ɛɪ"),
    (re.compile(r"(?<=[ˈˌ])oʊ(?!ɹ)"), "əʊ"),
    (re.compile(r"aʊ"), "æʊ"),
    (re.compile(r"(?<=[tdnszlʃ])([ˈˌ])uː"), r"\1ɪu"),
    # /ɑr/ rounds: hard -> "hord", far -> "for".
    (re.compile(r"ɑːɹ"), "ɔːɹ"),
    # Drawl "breaking": stressed short vowels stretch into a two-part glide —
    # yes -> "yeh-us", hand -> "hay-and", him -> "hee-um", song -> "sah-ong",
    # good -> "goo-ud". Each skips vowels already shifted above (ɛɪ, æʊ, ɪu,
    # ɪə, ɔː) or followed by r.
    (re.compile(r"(?<=ˈ)ɛ(?![ɹəːɪʊ])"), "ɛːə"),
    (re.compile(r"(?<=ˈ)æ(?![ʊːɛ])"), "æːɛ"),
    (re.compile(r"(?<=ˈ)ɪ(?![ɹəŋu])"), "ɪə"),
    (re.compile(r"(?<=ˈ)ɔ(?![ɹɪː])"), "ɑɔ"),
    (re.compile(r"(?<=ˈ)ʊ(?![ɹə])"), "ʊə"),
]


def southern_text(text: str) -> str:
    for pattern, replacement in TEXT_RULES:
        text = pattern.sub(replacement, text)
    return text


def drawl(phonemes: str) -> str:
    for pattern, replacement in WORD_RULES + DRAWL_RULES:
        phonemes = pattern.sub(replacement, phonemes)
    return phonemes
