import { createAudioPlayer } from 'expo-audio';
import { useSyncExternalStore } from 'react';
import { synthesizeSpeech } from './api/tts';

export type SpeechStatus = 'idle' | 'loading' | 'playing' | 'error';

// A reply is spoken in chunks as it streams in: each completed sentence is
// sent to the TTS server straight away and played in order, so Dolly starts
// talking after the first sentence instead of after the whole reply.
// Chunks shorter than this are held back and joined with the next sentence,
// so "Oh!" doesn't become its own choppy clip.
const MIN_CHUNK = 24;
const BOUNDARY = /[.!?…]["'”’)*_]*\s+|\n+/g;

// Only one message talks at a time. The bubbles read their status from here.
let state: { messageId: string | null; status: SpeechStatus } = { messageId: null, status: 'idle' };
const listeners = new Set<() => void>();
let current: SpeechSession | null = null;

function setState(messageId: string | null, status: SpeechStatus) {
  state = { messageId, status };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSpeechStatus(messageId: string): SpeechStatus {
  return useSyncExternalStore(subscribe, () =>
    state.messageId === messageId ? state.status : 'idle'
  );
}

export class SpeechSession {
  private buffer = '';
  private consumed = 0;
  private synthChain: Promise<unknown> = Promise.resolve();
  private queue: Promise<string | null>[] = [];
  private player: ReturnType<typeof createAudioPlayer> | null = null;
  private playing = false;
  private finished = false;
  private stopped = false;

  constructor(
    private ttsUrl: string,
    private messageId: string
  ) {}

  // Feed streamed text; any completed sentences are queued for speech.
  push(delta: string) {
    if (this.stopped || this.finished) return;
    this.buffer += delta;
    for (const match of this.buffer.matchAll(BOUNDARY)) {
      const end = match.index + match[0].length;
      if (end < MIN_CHUNK) continue;
      this.enqueue(this.buffer.slice(0, end));
      this.consumed += end;
      this.buffer = this.buffer.slice(end);
      this.push('');
      return;
    }
  }

  // No more text is coming. `finalText` is the reply as it will be displayed
  // (e.g. trimmed back to its last full sentence); whatever of it hasn't been
  // spoken yet is queued. Without it, the leftover buffer is spoken as-is.
  finish(finalText?: string) {
    if (this.stopped || this.finished) return;
    this.enqueue(finalText === undefined ? this.buffer : finalText.slice(this.consumed));
    this.buffer = '';
    this.finished = true;
    if (!this.playing) this.done();
  }

  stop() {
    this.stopped = true;
    this.player?.remove();
    this.player = null;
    if (current === this) {
      current = null;
      setState(null, 'idle');
    }
  }

  private enqueue(text: string) {
    if (!text.trim()) return;
    // Synthesize one chunk at a time (a Pi can't usefully run several at
    // once), but stay ahead of playback so the next clip is usually ready.
    const audio = this.synthChain.then(() =>
      this.stopped ? null : synthesizeSpeech(this.ttsUrl, text)
    );
    this.synthChain = audio.catch(() => {});
    this.queue.push(audio);
    if (!this.playing) this.playNext();
  }

  private async playNext() {
    const next = this.queue.shift();
    if (!next) {
      this.playing = false;
      if (this.finished) this.done();
      return;
    }
    this.playing = true;
    if (state.messageId !== this.messageId || state.status === 'idle') {
      setState(this.messageId, 'loading');
    }

    let url: string | null;
    try {
      url = await next;
    } catch {
      if (this.stopped) return;
      this.stop();
      setState(this.messageId, 'error');
      return;
    }
    if (this.stopped || !url) return;

    const player = createAudioPlayer({ uri: url });
    this.player = player;
    player.addListener('playbackStatusUpdate', (status) => {
      if (!status.didJustFinish || this.player !== player) return;
      player.remove();
      this.player = null;
      if (!this.stopped) this.playNext();
    });
    player.play();
    setState(this.messageId, 'playing');
  }

  private done() {
    if (current === this) {
      current = null;
      setState(null, 'idle');
    }
  }
}

// Starts speaking for `messageId`, cutting off whatever was speaking before.
export function startSpeech(ttsUrl: string, messageId: string): SpeechSession {
  current?.stop();
  current = new SpeechSession(ttsUrl, messageId);
  setState(messageId, 'loading');
  return current;
}

export function stopSpeech() {
  current?.stop();
}
