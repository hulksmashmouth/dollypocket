# Dolly Pocket

A Dolly Parton–flavored chat companion built with React Native (Expo) on top of
a local [Ollama](https://ollama.com) model. Everything runs on your own
hardware — no cloud LLM, no cloud TTS.

It runs three ways:

- **Raspberry Pi kiosk** (primary target): the web build, fullscreen in a
  Polly-Pocket-style case on a small 480×800 screen. See
  [`deploy/pi/README.md`](deploy/pi/README.md) for the full Pi setup.
- **Web** in any browser (`npm run web`) — required for Spotify playback.
- **iPhone** via Expo Go, talking to Ollama on your Mac over Wi-Fi.

## Features

- **Dolly's persona** — warm, witty, Southern, and brief: replies are kept to a
  couple of sentences (see [Reply length](#reply-length)).
- **Streaming chat** against any installed Ollama model, picked from a list in
  Settings (default `qwen2.5:3b`).
- **Fresh chat on every launch**, behind a Win95-style loading splash screen.
  Past chats are autosaved and live in "The Gabbin' Cabinet" side drawer.
- **Prompt suggestions** — Dolly-themed conversation starters, reshuffled for
  every new chat.
- **Knowledge base** — optional Wikipedia retrieval so answers about Dolly are
  grounded in real facts.
- **Dolly's Voice** — replies read aloud by a local TTS server (Piper, or
  Kokoro with a blended voice and a Southern drawl).
- **Spotify** — `play Jolene` in the chat plays it (web build, Premium only).
- **Look** — flat pastel Win95 UI with hard bevels, pixel-art hearts and
  butterflies, a pixel-art mouse cursor and themed scrollbars on web, and a
  "dollz"-style Dolly peeking over the chat.

## Stack

- Expo SDK 54 (managed workflow) + TypeScript, React Native 0.81, React 19
- No navigation library — one chat screen with a Settings sheet and a custom
  left drawer for past chats
- `@react-native-async-storage/async-storage` for preferences and conversation
  history
- Streaming via `XMLHttpRequest` (React Native's `fetch` doesn't expose a
  readable `response.body`, so NDJSON from Ollama's `/api/chat` is read with
  XHR `onprogress` — the standard RN workaround)
- Small local Node/Python servers for knowledge retrieval, TTS, and serving the
  static web build

## 1. Make Ollama reachable

By default `ollama serve` only listens on `127.0.0.1`. That's fine for the Pi
kiosk and local web, but a phone on the same Wi-Fi can't reach it. To expose
it on your LAN:

```sh
# If you run the Ollama.app menu-bar app on macOS:
launchctl setenv OLLAMA_HOST 0.0.0.0
# then quit and reopen the Ollama app

# If you run it from the CLI instead:
OLLAMA_HOST=0.0.0.0 ollama serve
```

Pull the default model:

```sh
ollama pull qwen2.5:3b
```

Any other installed model can be chosen in Settings. For a phone, make sure
your Mac's firewall allows incoming connections on port 11434 and that both
devices are on the same Wi-Fi network.

## 2. Run the app

```sh
npm install
npx expo start      # scan the QR code with your iPhone's Camera → Expo Go
npm run web         # or run it in a browser
```

All server URLs (Ollama, knowledge, TTS) are auto-detected from the Expo dev
server's host — see `guessDefaultBaseUrl()` and friends in `src/settings.ts`.
They aren't editable in the app; Settings shows them read-only in its Tech
Specs panel. If a guess is wrong for your setup, edit those functions.

To serve a production web build (what the Pi kiosk runs):

```sh
npx expo export --platform web
npm run serve-web   # serves dist/ on http://localhost:8080
```

## 3. Optional: give it a knowledge base (Wikipedia retrieval)

Dolly Pocket can retrieve real background on a topic — starting with Dolly
Parton's actual history — and feed it to Ollama as context before answering,
instead of relying on whatever a small local model happens to remember from
pretraining. This runs entirely locally.

**Pull an embedding model:**

```sh
ollama pull nomic-embed-text
```

**Import a topic** (fetches each Wikipedia page's plain-text extract, chunks
it, and embeds every chunk via Ollama). Three ways to feed it pages, mixable
in one run — explicit titles, a whole Wikipedia category (recurses one level
into subcategories, so `Category:Dolly Parton` pulls in its songs/albums/
Dollywood subcategories too — this is the one that gets you real breadth),
or a local text file you have legal rights to use (`--file`):

```sh
# broad, recommended: pulls in ~265 pages — every song, album, award,
# filmography entry, and Dollywood page Wikipedia has on her
npm run import-knowledge -- "Dolly Parton" --category "Dolly Parton"

# narrower / explicit, if you'd rather hand-pick:
npm run import-knowledge -- "Dolly Parton" \
  "Dolly Parton" "Dollywood" "Dolly Parton's Imagination Library"
```

The first argument is always a topic label (your own bookkeeping). Re-run any
time — with a new topic to add it, or the same topic to refresh it (existing
chunks for that topic are replaced, others left alone). This writes
`server/data/knowledge.json`, which is git-ignored.

Note on scope: this pulls real facts (biography, discography, chart history,
awards, filmography) — it deliberately can't pull song **lyrics**, since
those are copyrighted works Wikipedia itself excludes. If you want lyrics in
here, the only legitimate path is typing excerpts yourself from something you
own and feeding them in via `--file`.

A ~265-page category import makes a lot of Wikipedia + Ollama-embed calls —
expect it to take a while (the script backs off automatically if Wikipedia
rate-limits it, rather than failing).

**Run the knowledge server** alongside Ollama:

```sh
npm run knowledge-server
```

It listens on port 11435. On a Mac serving a phone, it needs the same firewall
exception Ollama did:

```sh
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add "$(which node)"
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp "$(which node)"
```

In Settings, **Use knowledge base** is on by default; tap **Check knowledge
base** to confirm it found your imported chunks. Relevant excerpts are then
silently injected as context on every message — they never show up as chat
bubbles.

## 4. Optional: read replies aloud (Dolly's Voice)

Each assistant reply can be spoken by a fully local TTS server — no cloud
service, no API key. **Dolly's Voice** is on by default in Settings: replies
are read aloud as soon as they finish, and each bubble's speaker button
replays or stops them (it shows a warning icon until a TTS server is running).

There are two interchangeable servers. Both listen on port 11436 with the same
API, so the app works with either — run one, not both.

### Kokoro (recommended — Southern accent)

[Kokoro](https://github.com/thewh1teagle/kokoro-onnx) has no Southern voice out
of the box, so Dolly's is built in two layers (`server/kokoro_voice.py`):

- **Timbre** — a weighted blend of Kokoro's stock voices, e.g.
  `af_heart:0.6,af_bella:0.4`.
- **Accent** — Southern US pronunciation applied directly to the phonemes:
  "I" → "Ah" ("time" → "tahm"), "-ing" → "-in'", the pin/pen merger ("ten" →
  "tin"), and drawled short vowels ("yes" → "yeh-us"). She also speaks ~10%
  slower.

**Install** (needs Python 3.12 — Kokoro's dependencies don't install on 3.14):

```sh
cd server
python3.12 -m venv kokoro-venv
kokoro-venv/bin/pip install kokoro-onnx
mkdir -p kokoro && cd kokoro
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

**Audition voices.** This renders a Southern test line in several candidate
blends to `server/data/auditions/`; pass your own blends as arguments to try
others:

```sh
cd server
kokoro-venv/bin/python kokoro_audition.py
for f in data/auditions/*.wav; do echo "$f"; afplay "$f"; done
```

**Run the server:**

```sh
KOKORO_VOICE="af_heart:0.6,af_bella:0.4" npm run kokoro-tts-server
```

| Variable       | Default                     | Meaning                                  |
| -------------- | --------------------------- | ---------------------------------------- |
| `KOKORO_VOICE` | `af_heart:0.6,af_bella:0.4` | Voice blend (weights are normalized)     |
| `KOKORO_SPEED` | `0.9`                       | Speaking rate; `1.0` is Kokoro's default |
| `KOKORO_DRAWL` | `1`                         | `0` turns off the Southern accent        |

### Piper

[Piper](https://github.com/OHF-Voice/piper1-gpl) is lighter and faster, but its
voices are neutral American — no Southern accent.

```sh
cd server
python3 -m venv piper-venv
piper-venv/bin/pip install piper-tts
piper-venv/bin/python3 -m piper.download_voices en_US-amy-medium --data-dir voices
cd ..
PYTHON_BIN=$(pwd)/server/piper-venv/bin/python3 npm run tts-server
```

Either way, tap **Test connection** under Dolly's Voice in Settings to confirm
the app can reach it.

## 5. Optional: play Dolly's music (Spotify, web version only)

Type `play Jolene` (or `play some Dolly`) in the chat and the page plays it
through Spotify's Web Playback SDK — the browser tab becomes a Spotify device.
Web only (the SDK is browser-only, so Expo Go/native is unsupported), and it
needs **Spotify Premium** plus Widevine DRM support in the browser. Searches
are limited to tracks by Dolly Parton.

1. Create an app in the [Spotify developer dashboard](https://developer.spotify.com/dashboard)
   and register the redirect URI(s) exactly as `http://127.0.0.1:8081/`
   (`npm run web`) and, for the Pi kiosk, `http://127.0.0.1:8080/`. Spotify
   rejects `localhost` — **open the app at `http://127.0.0.1:8081`, not
   `localhost:8081`**. (Since Feb 2026, new dev-mode apps need the owner to
   have Premium and are capped at 5 users.)
2. `cp .env.example .env.local` and paste your client ID into
   `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` (public by design — the app uses PKCE, so
   there is no client secret). Restart `npm run web`.
3. Open Settings → Spotify → **Connect Spotify**, log in, and you'll land
   back in the app with a now-playing bar above the chat input.

Anything you type that starts with `play ` is handled by Spotify instead of
being sent to the language model, whenever Spotify is available (web build
with a client ID set). When it's connected, a "play" starter is added to the
prompt suggestions too.

## Reply length

Replies are kept short because they're read aloud and shown on a tiny screen:

- The persona prompt (`src/persona.ts`) asks for two or three sentences,
  longer only when the user asks for steps or detail.
- `MAX_REPLY_TOKENS` (200, in the same file) is a hard cap passed to Ollama as
  `num_predict`. A reply that hits it is trimmed back to its last complete
  sentence, so Dolly never trails off mid-word.

## Project layout

```
App.tsx                    entry point: safe area, background doll, ChatScreen,
                            splash overlay, web cursor/scrollbar styles
src/
  types.ts                 ChatMessage type
  persona.ts               Dolly's system prompt + MAX_REPLY_TOKENS
  theme.ts                 colors (WCAG AA-checked), bevels, header gradient, font
  settings.ts              AsyncStorage-backed model / knowledge / TTS toggles
                            (server URLs are auto-detected only, not stored)
  conversations.ts         AsyncStorage-backed conversation history (list/save/
                            delete + auto-titling from the first user message)
  techSpecs.ts             versions/device info for Settings' Tech Specs panel
  webCursor.ts             pixel-art mouse cursor (web only)
  webScrollbar.ts          themed scrollbars (web only)
  api/
    ollama.ts              streamChat() (with token cap) + listModels() + version
    knowledge.ts           searchKnowledge() + checkKnowledgeHealth()
    tts.ts                 synthesizeSpeech() + checkTtsHealth()
    spotify.ts             searchDollyTracks() + startPlayback()
  spotify/
    pkce.ts                PKCE verifier/challenge helpers (RFC 7636)
    auth.ts                login redirect, token exchange/refresh/storage
    useSpotify.ts          loads the Web Playback SDK, owns the in-page player
  components/
    SplashScreen.tsx       Win95 "loading" dialog shown on launch, then fades out
    MessageBubble.tsx      renders replies + the per-bubble speaker button
    ChatInput.tsx
    PromptSuggestions.tsx  conversation starters shown on an empty chat
    SettingsModal.tsx
    ConversationDrawer.tsx "The Gabbin' Cabinet" — past-chats side drawer
    ModelPicker.tsx        lists installed Ollama models to pick from
    NowPlayingBar.tsx      track + transport controls for Spotify playback
    DollyDoll.tsx          decorative "dollz"-style Dolly image
    PixelArt.tsx           pixel-art heart + butterfly sprites
    Panel.tsx              flat pastel panel with a hard Win95-style bevel border
    IconButton.tsx         small raised-bevel box wrapping a vector icon
    Checkbox.tsx           boxy sunken-well toggle (replaces native Switch)
    Disclosure.tsx         collapsible "hider panel" (progressive disclosure)
  screens/
    ChatScreen.tsx         message list, streaming, conversation persistence,
                            wiring
server/
  knowledge-server.mjs     embeds the query via Ollama, cosine-similarity search
                            over data/knowledge.json (port 11435)
  tts-server.mjs           Piper TTS server (port 11436)
  kokoro-tts-server.py     Kokoro TTS server, same API and port as tts-server.mjs
  kokoro_voice.py          Kokoro voice blending + Southern drawl phoneme rules
  kokoro_audition.py       renders candidate voice blends to compare by ear
  static-server.mjs        serves the exported web build from dist/ (port 8080)
  data/                    git-ignored: knowledge base, TTS cache, auditions
  voices/, piper-venv/     git-ignored: Piper voice models + venv
  kokoro/, kokoro-venv/    git-ignored: Kokoro model files + venv
scripts/
  import-knowledge.mjs     fetches Wikipedia extracts, chunks + embeds them into
                            server/data/knowledge.json
deploy/pi/                 Raspberry Pi kiosk guide + systemd service files
```

## Notes

- `app.json` sets `NSAllowsLocalNetworking` so iOS permits plain-HTTP requests
  to your local servers (App Transport Security otherwise blocks them).
- The app always opens on a fresh chat; earlier conversations persist in
  AsyncStorage and are reopened from the drawer.
- The Pi kiosk guide in `deploy/pi/` still sets up Piper for TTS; switching
  the kiosk to Kokoro means swapping the `dollypocket-tts` service's command
  for `kokoro-tts-server.py`.
