import { ChatMessage } from '../types';

export class OllamaError extends Error {}

interface OllamaChatChunk {
  message?: { content?: string };
  done?: boolean;
  error?: string;
}

/**
 * Streams a chat completion from Ollama's /api/chat endpoint.
 *
 * React Native's fetch doesn't expose a readable response.body stream, so we
 * use XHR and read the growing responseText on each progress event instead
 * (the standard RN workaround for consuming NDJSON/SSE streams).
 */
export function streamChat(
  baseUrl: string,
  model: string,
  messages: ChatMessage[],
  onToken: (delta: string) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let readOffset = 0;

    const abortHandler = () => xhr.abort();
    signal?.addEventListener('abort', abortHandler);

    const cleanup = () => signal?.removeEventListener('abort', abortHandler);

    const consume = () => {
      const chunk = xhr.responseText.slice(readOffset);
      readOffset = xhr.responseText.length;
      const lines = chunk.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const parsed: OllamaChatChunk = JSON.parse(line);
          if (parsed.error) throw new OllamaError(parsed.error);
          const delta = parsed.message?.content;
          if (delta) onToken(delta);
        } catch (err) {
          if (err instanceof OllamaError) throw err;
          // Ignore partial/incomplete JSON lines still being streamed in.
        }
      }
    };

    xhr.onprogress = () => {
      try {
        consume();
      } catch (err) {
        cleanup();
        xhr.abort();
        reject(err);
      }
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new OllamaError(`Ollama responded with status ${xhr.status}: ${xhr.responseText}`));
        return;
      }
      try {
        consume();
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    xhr.onerror = () => {
      cleanup();
      reject(new OllamaError(`Could not reach Ollama at ${baseUrl}. Is it running and on the same network?`));
    };

    xhr.onabort = () => {
      cleanup();
      resolve();
    };

    xhr.open('POST', `${baseUrl}/api/chat`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(
      JSON.stringify({
        model,
        messages: messages.map(({ role, content }) => ({ role, content })),
        stream: true,
      })
    );
  });
}

export async function listModels(baseUrl: string): Promise<string[]> {
  const res = await fetch(`${baseUrl}/api/tags`);
  if (!res.ok) throw new OllamaError(`Failed to list models (status ${res.status})`);
  const data = await res.json();
  return (data.models ?? []).map((m: { name: string }) => m.name);
}

export async function getOllamaVersion(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/version`);
  if (!res.ok) throw new OllamaError(`Failed to read Ollama version (status ${res.status})`);
  const data = await res.json();
  return data.version;
}
