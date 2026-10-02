import { useCallback, useEffect, useRef, useState } from 'react';
import { searchDollyTracks, SpotifyTrack, startPlayback } from '../api/spotify';
import {
  completeLoginIfRedirected,
  getAccessToken,
  hasSession,
  logout,
  spotifyUnavailableReason,
  startLogin,
} from './auth';

// Minimal typings for the parts of the Web Playback SDK (loaded from
// sdk.scdn.co at runtime) that we use.
interface SdkPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, callback: (data: any) => void): boolean;
  activateElement(): Promise<void>;
  togglePlay(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
}

export interface NowPlaying {
  title: string;
  artist: string;
  paused: boolean;
}

let sdkLoad: Promise<void> | null = null;
function loadSdk(): Promise<void> {
  if (!sdkLoad) {
    sdkLoad = new Promise((resolve, reject) => {
      (window as any).onSpotifyWebPlaybackSDKReady = () => resolve();
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.onerror = () => reject(new Error("Couldn't load Spotify's player script."));
      document.body.appendChild(script);
    });
  }
  return sdkLoad;
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

export function useSpotify() {
  const unavailableReason = spotifyUnavailableReason();
  const supported = unavailableReason === null;

  const [connected, setConnected] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<SdkPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;

    (async () => {
      try {
        await completeLoginIfRedirected();
      } catch (err) {
        setError(errorMessage(err));
      }
      if (cancelled || !(await hasSession())) return;
      setConnected(true);

      try {
        await loadSdk();
      } catch (err) {
        setError(errorMessage(err));
        return;
      }
      if (cancelled) return;

      const player: SdkPlayer = new (window as any).Spotify.Player({
        name: 'Dolly Pocket',
        volume: 0.8,
        getOAuthToken: (callback: (token: string) => void) => {
          getAccessToken().then((token) => token && callback(token));
        },
      });

      player.addListener('ready', ({ device_id }) => {
        deviceIdRef.current = device_id;
      });
      player.addListener('not_ready', () => {
        deviceIdRef.current = null;
      });
      player.addListener('player_state_changed', (state) => {
        const track = state?.track_window?.current_track;
        setNowPlaying(
          track
            ? {
                title: track.name,
                artist: track.artists.map((a: { name: string }) => a.name).join(', '),
                paused: state.paused,
              }
            : null
        );
      });
      player.addListener('initialization_error', () =>
        setError("This browser can't play Spotify (usually missing Widevine DRM support).")
      );
      player.addListener('authentication_error', () =>
        setError('Spotify login expired — reconnect in Settings.')
      );
      player.addListener('account_error', () =>
        setError('Playing music here needs a Spotify Premium account.')
      );
      player.addListener('playback_error', ({ message }) => setError(message));

      playerRef.current = player;
      await player.connect();
      if (cancelled) player.disconnect();
    })();

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [supported]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      await startLogin();
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  const disconnect = useCallback(async () => {
    playerRef.current?.disconnect();
    playerRef.current = null;
    deviceIdRef.current = null;
    await logout();
    setConnected(false);
    setNowPlaying(null);
    setError(null);
  }, []);

  // Searches Dolly's tracks and plays them. With no query, queues up a spread
  // of her songs. Resolves with what's now playing (empty if nothing matched).
  const playDolly = useCallback(async (query: string | null): Promise<SpotifyTrack[]> => {
    // Browsers only let audio start from a user gesture; this must run
    // synchronously before the first await (the caller is a button press).
    playerRef.current?.activateElement();

    const deviceId = deviceIdRef.current;
    if (!deviceId) {
      throw new Error(
        error ?? 'The Spotify player is still warming up — try again in a few seconds.'
      );
    }
    const tracks = await searchDollyTracks(query, query ? 1 : 10);
    if (tracks.length > 0) {
      setError(null);
      await startPlayback(
        deviceId,
        tracks.map((t) => t.uri)
      );
    }
    return tracks;
  }, [error]);

  return {
    supported,
    unavailableReason,
    connected,
    nowPlaying,
    error,
    connect,
    disconnect,
    playDolly,
    togglePlay: () => playerRef.current?.togglePlay(),
    nextTrack: () => playerRef.current?.nextTrack(),
    previousTrack: () => playerRef.current?.previousTrack(),
  };
}
