export interface KnowledgeResult {
  id: string;
  topic: string;
  title: string;
  text: string;
  score: number;
}

export async function searchKnowledge(
  knowledgeUrl: string,
  query: string,
  topK = 5,
  timeoutMs = 5000
): Promise<KnowledgeResult[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${knowledgeUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Knowledge search failed (status ${res.status})`);
    const data = await res.json();
    return data.results ?? [];
  } finally {
    clearTimeout(timer);
  }
}

export async function checkKnowledgeHealth(
  knowledgeUrl: string
): Promise<{ chunks: number; topics: string[]; model?: string }> {
  let res: Response;
  try {
    res = await fetch(`${knowledgeUrl}/health`);
  } catch {
    // A network-level failure surfaces as a bare "Failed to fetch"; say what
    // it actually means and what to do about it.
    throw new Error(
      `Couldn't reach the knowledge server at ${knowledgeUrl}. Is "npm run knowledge-server" running?`
    );
  }
  if (!res.ok) throw new Error(`Knowledge server responded with status ${res.status}`);
  return res.json();
}
