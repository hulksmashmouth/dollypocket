import { getAccessToken } from '../spotify/auth';

export class SpotifyError extends Error {}

export interface SpotifyTrack {
  uri: string;
  name: string;
  artist: string;
}

async function spotifyFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new SpotifyError('Spotify login expired — reconnect in Settings.');

  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (res.status === 401) throw new SpotifyError('Spotify login expired — reconnect in Settings.');
  if (res.status === 403) {
    throw new SpotifyError('Spotify refused that (playing music needs a Premium account).');
  }
  if (res.status === 429) throw new SpotifyError('Spotify says slow down — try again in a moment.');
  return res;
}

// Searches only within Dolly Parton's tracks. With no query, returns a
// spread of hers to queue up ("play some Dolly"). Development-mode apps cap
// search at 10 results, so `limit` must stay at or under that.
export async function searchDollyTracks(query: string | null, limit: number): Promise<SpotifyTrack[]> {
  const q = query ? `${query} artist:"Dolly Parton"` : 'artist:"Dolly Parton"';
  const params = new URLSearchParams({ q, type: 'track', limit: String(limit) });
  const res = await spotifyFetch(`/search?${params}`);
  if (!res.ok) throw new SpotifyError(`Spotify search failed (status ${res.status}).`);

  const data = await res.json();
  return (data.tracks?.items ?? []).map(
    (t: { uri: string; name: string; artists: { name: string }[] }) => ({
      uri: t.uri,
      name: t.name,
      artist: t.artists.map((a) => a.name).join(', '),
    })
  );
}

async function transferPlayback(deviceId: string): Promise<void> {
  const res = await spotifyFetch('/me/player', {
    method: 'PUT',
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
  });
  if (!res.ok) throw new SpotifyError(`Couldn't switch Spotify to this player (status ${res.status}).`);
}

// Starts the given tracks on our in-browser Web Playback SDK device.
export async function startPlayback(deviceId: string, uris: string[]): Promise<void> {
  const play = () =>
    spotifyFetch(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
      method: 'PUT',
      body: JSON.stringify({ uris }),
    });

  let res = await play();
  // A freshly-created SDK device isn't the "active" one yet; Spotify answers
  // 404 until playback is transferred to it, so do that once and retry.
  if (res.status === 404) {
    await transferPlayback(deviceId);
    res = await play();
  }
  if (!res.ok) throw new SpotifyError(`Spotify couldn't start playback (status ${res.status}).`);
}
