#!/usr/bin/env node
// Serves nearest-neighbor search over the chunks produced by
// scripts/import-knowledge.mjs, so Dolly Pocket can retrieve relevant
// background (starting with Dolly Parton's real history) as context before
// calling Ollama's chat model. Vector math stays here, not on-device.

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, 'data', 'knowledge.json');
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const EMBED_MODEL = process.env.EMBED_MODEL ?? 'nomic-embed-text';
const PORT = Number(process.env.PORT ?? 11435);

let chunks = [];
try {
  chunks = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  const topics = [...new Set(chunks.map((c) => c.topic))];
  console.log(`Loaded ${chunks.length} chunks (topics: ${topics.join(', ') || 'none'}) from ${DATA_PATH}`);
} catch {
  console.warn(`No knowledge base found at ${DATA_PATH} — run "node scripts/import-knowledge.mjs <topic> <wikipedia-title>..." first.`);
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function embedQuery(text) {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`Ollama embed request failed (status ${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.embeddings[0];
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) });
  res.end(json);
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    const topics = [...new Set(chunks.map((c) => c.topic))];
    return send(res, 200, { status: 'ok', chunks: chunks.length, topics });
  }

  if (req.method === 'POST' && req.url === '/search') {
    let body = '';
    for await (const piece of req) body += piece;

    try {
      const { query, topK = 5 } = JSON.parse(body);
      if (!query || typeof query !== 'string') return send(res, 400, { error: 'query is required' });
      if (chunks.length === 0) return send(res, 200, { results: [] });

      const queryEmbedding = await embedQuery(query);
      const scored = chunks
        .map((chunk) => ({ ...chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map(({ embedding, ...rest }) => rest);

      return send(res, 200, { results: scored });
    } catch (err) {
      return send(res, 500, { error: err instanceof Error ? err.message : 'search failed' });
    }
  }

  send(res, 404, { error: 'not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Knowledge server listening on http://0.0.0.0:${PORT}`);
});
