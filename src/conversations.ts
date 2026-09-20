import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from './types';

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

const CONVERSATIONS_KEY = 'dollypocket.conversations';
const ACTIVE_ID_KEY = 'dollypocket.activeConversationId';

export async function getConversations(): Promise<Conversation[]> {
  const raw = await AsyncStorage.getItem(CONVERSATIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Conversation[];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

// Upserts by id and persists the whole list — conversation histories are
// small enough (personal chat use, not enterprise scale) that this is
// simpler and safer than trying to patch one entry in place.
export async function saveConversation(conversation: Conversation): Promise<void> {
  const all = await getConversations();
  const idx = all.findIndex((c) => c.id === conversation.id);
  if (idx >= 0) all[idx] = conversation;
  else all.unshift(conversation);
  await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(all));
}

export async function deleteConversation(id: string): Promise<void> {
  const all = await getConversations();
  await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(all.filter((c) => c.id !== id)));
}

export async function getActiveConversationId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_ID_KEY);
}

export async function setActiveConversationId(id: string | null): Promise<void> {
  if (id) await AsyncStorage.setItem(ACTIVE_ID_KEY, id);
  else await AsyncStorage.removeItem(ACTIVE_ID_KEY);
}

// Titles a conversation from its first user message, since there's no chat
// title input anywhere in the UI — matches how most chat apps auto-title.
export function titleFromMessages(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage?.content.trim()) return 'New chat';
  const trimmed = firstUserMessage.content.trim().replace(/\s+/g, ' ');
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
}
