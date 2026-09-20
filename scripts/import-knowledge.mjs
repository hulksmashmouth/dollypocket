#!/usr/bin/env node
// One-time (per topic) import: pulls plain-text article extracts from
// Wikipedia's API (no HTML scraping/deps needed), chunks them, embeds each
// chunk via Ollama, and merges them into server/data/knowledge.json — the
// local knowledge base server/knowledge-server.mjs searches over.
//
// Usage:
//   node scripts/import-knowledge.mjs "Dolly Parton" \
//     "Dolly Parton" "Dollywood" "Dolly Parton's Imagination Library" \
//     "Dolly Parton discography"
//
// First arg is a topic label (stored alongside each chunk, purely for your
// own bookkeeping); the rest are Wikipedia page titles to import under it.
// Re-run any time to add more topics — existing chunks for a topic are
// replaced, others are left alone.

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'server', 'data', 'knowledge.json');
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const EMBED_MODEL = process.env.EMBED_MODEL ?? 'nomic-embed-text';
const CHUNK_SIZE = 800;

const [topic, ...pageTitles] = process.argv.slice(2);

if (!topic || pageTitles.length === 0) {
  console.error(
    'Usage: node scripts/import-knowledge.mjs <topic> <wikipedia-page-title> [more titles...]'
  );
  process.exit(1);
}

async function fetchArticleText(title) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    prop: 'extracts',
    explaintext: '1',
    format: 'json',
    redirects: '1',
    titles: title,
  }).toString();

  const res = await fetch(url, { headers: { 'User-Agent': 'dollypocket-import/1.0' } });
  if (!res.ok) throw new Error(`Wikipedia request failed for "${title}" (status ${res.status})`);
  const data = await res.json();
  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) {
    throw new Error(`No Wikipedia page found for "${title}"`);
  }
  return { title: page.title, text: page.extract ?? '' };
}

// Chunks on paragraph boundaries, grouping consecutive paragraphs up to
// CHUNK_SIZE rather than hard-cutting mid-sentence; a lone paragraph longer
// than CHUNK_SIZE is kept whole rather than mangled.
function chunkText(text) {
  const paragraphs = text
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !p.startsWith('==')); // drop section-heading lines

  const chunks = [];
  let current = '';
  for (const para of paragraphs) {
    if (current && current.length + para.length + 2 > CHUNK_SIZE) {
      chunks.push(current);
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function embed(text) {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`Ollama embed request failed (status ${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.embeddings[0];
}

async function loadExisting() {
  try {
    return JSON.parse(await readFile(DATA_PATH, 'utf8'));
  } catch {
    return [];
  }
}

async function main() {
  const existing = await loadExisting();
  const keptChunks = existing.filter((c) => c.topic !== topic);

  const newChunks = [];
  for (const title of pageTitles) {
    console.log(`Fetching "${title}"...`);
    const { title: resolvedTitle, text } = await fetchArticleText(title);
    if (!text) {
      console.warn(`  (no extract text returned for "${title}", skipping)`);
      continue;
    }
    const pieces = chunkText(text);
    console.log(`  ${pieces.length} chunks, embedding...`);
    for (let i = 0; i < pieces.length; i++) {
      const embedding = await embed(pieces[i]);
      newChunks.push({
        id: `${topic}:${resolvedTitle}:${i}`,
        topic,
        title: resolvedTitle,
        text: pieces[i],
        embedding,
      });
    }
  }

  const merged = [...keptChunks, ...newChunks];
  await mkdir(path.dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(merged));
  console.log(
    `Wrote ${merged.length} total chunks (${newChunks.length} for "${topic}") to ${DATA_PATH}`
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
