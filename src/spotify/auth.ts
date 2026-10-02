import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { codeChallenge, randomString } from './pkce';

// The client ID is public by design (PKCE has no client secret), so an
// EXPO_PUBLIC_ env var is the right home for it — see .env.example. Expo only
// inlines it when accessed with static dot notation.
const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';

// `streaming` + the two user-read scopes are what the Web Playback SDK
// requires; the modify/read-playback scopes let us start playback on it.
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
].join(' ');

const TOKENS_KEY = 'dollypocket.spotify.tokens';
const PKCE_KEY = 'dollypocket.spotify.pkce';

interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// null means Spotify playback is available; otherwise, why it isn't.
export function spotifyUnavailableReason(): string | null {
  if (Platform.OS !== 'web') {
    return 'Spotify playback only works in the web version (the Web Playback SDK is browser-only).';
  }
  if (!CLIENT_ID) {
    return 'Add EXPO_PUBLIC_SPOTIFY_CLIENT_ID to .env.local and rebuild (see README).';
  }
  return null;
}

function redirectUri(): string {
  return `${window.location.origin}/`;
}

// Spotify rejects http redirects to anything but a loopback IP literal, and
// specifically rejects the `localhost` hostname.
function redirectProblem(): string | null {
  const { protocol, hostname, port } = window.location;
  if (protocol === 'https:' || hostname === '127.0.0.1' || hostname === '[::1]') return null;
  return `Spotify won't redirect to "${hostname}". Open this page at http://127.0.0.1${port ? `:${port}` : ''} instead.`;
}

export async function startLogin(): Promise<void> {
  const problem = redirectProblem();
  if (problem) throw new Error(problem);

  const verifier = randomString(64);
  const state = randomString(16);
  await AsyncStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state }));

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: await codeChallenge(verifier),
    state,
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${params}`);
}

async function requestTokens(body: Record<string, string>): Promise<Tokens> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...body }),
  });
  if (!res.ok) {
    throw new Error(`Spotify token request failed (status ${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  const previous = await loadTokens();
  const tokens: Tokens = {
    accessToken: data.access_token,
    // A refresh response may omit a new refresh token; keep the old one then.
    refreshToken: data.refresh_token ?? previous?.refreshToken ?? '',
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  return tokens;
}

async function loadTokens(): Promise<Tokens | null> {
  const raw = await AsyncStorage.getItem(TOKENS_KEY);
  return raw ? (JSON.parse(raw) as Tokens) : null;
}

// If we've just been redirected back from Spotify (?code=...), finish the
// login. Memoized so a double-invoked effect can't exchange the code twice.
let redirectResult: Promise<boolean> | null = null;
export function completeLoginIfRedirected(): Promise<boolean> {
  if (!redirectResult) redirectResult = finishRedirect();
  return redirectResult;
}

async function finishRedirect(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');
  if (!code && !error) return false;

  // Drop the one-time params from the address bar right away.
  window.history.replaceState({}, '', window.location.pathname);
  if (error) throw new Error(`Spotify login was cancelled or failed (${error}).`);

  const raw = await AsyncStorage.getItem(PKCE_KEY);
  await AsyncStorage.removeItem(PKCE_KEY);
  if (!raw) throw new Error('Spotify login expired — press Connect again.');
  const saved = JSON.parse(raw) as { verifier: string; state: string };
  if (saved.state !== state) throw new Error('Spotify login state mismatch — press Connect again.');

  await requestTokens({
    grant_type: 'authorization_code',
    code: code!,
    redirect_uri: redirectUri(),
    code_verifier: saved.verifier,
  });
  return true;
}

export async function hasSession(): Promise<boolean> {
  return (await loadTokens()) !== null;
}

// A still-valid access token, refreshing it first when it's about to expire.
// Returns null (and forgets the session) if the refresh token was rejected.
export async function getAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) return null;
  if (tokens.expiresAt - 60_000 > Date.now()) return tokens.accessToken;

  try {
    const refreshed = await requestTokens({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
    });
    return refreshed.accessToken;
  } catch {
    await logout();
    return null;
  }
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(TOKENS_KEY);
}
