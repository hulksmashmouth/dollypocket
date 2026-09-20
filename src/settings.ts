import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const MODEL_KEY = 'dollypocket.model';
const TTS_ENABLED_KEY = 'dollypocket.ttsEnabled';
const KNOWLEDGE_ENABLED_KEY = 'dollypocket.knowledgeEnabled';

export const DEFAULT_MODEL = 'qwen2.5:3b';

// When running via Expo on the same Mac that hosts Ollama, the dev server's
// host IP (from the Metro/Expo manifest) is the phone's route back to that Mac.
function guessHost(): string | undefined {
  const hostUri =
    Constants.expoConfig?.hostUri ?? (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  return hostUri?.split(':')[0];
}

// Server URLs are auto-detected only, not user-editable (see Settings' Tech
// Specs panel, which shows these read-only rather than as input fields).
export function guessDefaultBaseUrl(): string {
  const host = guessHost();
  return host ? `http://${host}:11434` : 'http://localhost:11434';
}

export function guessDefaultTtsUrl(): string {
  const host = guessHost();
  return host ? `http://${host}:11436` : 'http://localhost:11436';
}

export function guessDefaultKnowledgeUrl(): string {
  const host = guessHost();
  return host ? `http://${host}:11435` : 'http://localhost:11435';
}

export async function getModel(): Promise<string> {
  const stored = await AsyncStorage.getItem(MODEL_KEY);
  return stored ?? DEFAULT_MODEL;
}

export async function setModel(model: string): Promise<void> {
  await AsyncStorage.setItem(MODEL_KEY, model.trim());
}

// Off by default: TTS is a fully separate server most people won't have set
// up (see deploy/pi/README.md).
export async function getTtsEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(TTS_ENABLED_KEY);
  return stored === 'true';
}

export async function setTtsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(TTS_ENABLED_KEY, String(enabled));
}

// On by default: fails silently in the background if the knowledge server
// isn't running or the base hasn't been imported yet (see
// scripts/import-knowledge.mjs), same as the old chat-history RAG did.
export async function getKnowledgeEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(KNOWLEDGE_ENABLED_KEY);
  return stored === null ? true : stored === 'true';
}

export async function setKnowledgeEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KNOWLEDGE_ENABLED_KEY, String(enabled));
}
