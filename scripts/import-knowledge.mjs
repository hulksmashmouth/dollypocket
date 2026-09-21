#!/usr/bin/env node
// One-time (per topic) import: pulls plain-text article extracts from
// Wikipedia's API (no HTML scraping/deps needed), chunks them, embeds each
// chunk via Ollama, and merges them into server/data/knowledge.json — the
// local knowledge base server/knowledge-server.mjs searches over.
//
// Three ways to feed it pages, freely mixable in one run:
//
//   Explicit titles:
//     node scripts/import-knowledge.mjs "Dolly Parton" "Dolly Parton" "Dollywood"
//
//   A whole Wikipedia category (recurses one level into subcategories, so
//   e.g. Category:Dolly Parton pulls in its "Dolly Parton songs"/"albums"/
//   "Dollywood" subcategories too — this is the one that gets you real
//   breadth: discography, every song/album page, awards, filmography, etc.):
//     node scripts/import-knowledge.mjs "Dolly Parton" --category "Dolly Parton"
//
//   A local text file you have legal rights to use (e.g. your own notes, or
//   excerpts you've typed from something you own) — NOT a way to bulk-import
//   copyrighted material like song lyrics, which this script deliberately
//   has no support for (Wikipedia excludes full lyrics for the same reason:
//   they're copyrighted works, not freely licensed facts):
//     node scripts/import-knowledge.mjs "Dolly Parton" --file ./my-notes.txt
//
// First arg is always a topic label (stored alongside each chunk, purely for
// your own bookkeeping). Re-run any time to add more — existing chunks for a
// topic are replaced, others are left alone.

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'server', 'data', 'knowledge.json');
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const EMBED_MODEL = process.env.EMBED_MODEL ?? 'nomic-embed-text';
const CHUNK_SIZE = 800;

const [topic, ...rest] = process.argv.slice(2);

if (!topic || rest.length === 0) {
  console.error(
    'Usage: node scripts/import-knowledge.mjs <topic> [<wikipedia-page-title> ...] [--category <name>] [--file <path>]'
  );
  process.exit(1);
}

// Parse the mixed title / --category / --file argument list into typed jobs.
function parseSources(args) {
  const jobs = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--category') {
      const name = args[++i];
      if (!name) throw new Error('--category requires a Wikipedia category name');
      jobs.push({ kind: 'category', name });
    } else if (arg === '--file') {
      const filePath = args[++i];
      if (!filePath) throw new Error('--file requires a path');
      jobs.push({ kind: 'file', filePath });
    } else {
      jobs.push({ kind: 'title', title: arg });
    }
  }
  return jobs;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A category like "Dolly Parton" expands into ~250 requests once
// subcategories are pulled in, which reliably trips Wikipedia's rate limit
// if fired back to back — space every call out a bit and back off on 429s
// (respecting Retry-After when the API sends one) rather than failing the
// whole import over a transient throttle.
async function wikiApi(params, attempt = 1) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({ format: 'json', ...params }).toString();
  const res = await fetch(url, { headers: { 'User-Agent': 'dollypocket-import/1.0' } });

  if (res.status === 429) {
    if (attempt > 5) throw new Error('Wikipedia rate limit (429) persisted after 5 retries');
    const retryAfter = Number(res.headers.get('retry-after'));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt;
    console.warn(`  rate-limited by Wikipedia, waiting ${Math.round(delay / 1000)}s...`);
    await sleep(delay);
    return wikiApi(params, attempt + 1);
  }

  if (!res.ok) throw new Error(`Wikipedia request failed (status ${res.status})`);
  await sleep(150); // stay well clear of the limit on the next call
  return res.json();
}

async function fetchArticleText(title) {
  const data = await wikiApi({
    action: 'query',
    prop: 'extracts',
    explaintext: '1',
    redirects: '1',
    titles: title,
  });
  const page = Object.values(data.query?.pages ?? {})[0];
  if (!page || page.missing !== undefined) {
    throw new Error(`No Wikipedia page found for "${title}"`);
  }
  return { title: page.title, text: page.extract ?? '' };
}

// Lists a category's members, recursing one level into subcategories (but no
// deeper — enough to pull in e.g. "Dolly Parton songs"/"albums" under
// "Dolly Parton" without risking runaway recursion on broader categories).
async function expandCategory(name, depth = 0) {
  const data = await wikiApi({
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Category:${name}`,
    cmlimit: '500',
    cmtype: 'page|subcat',
  });
  const members = data.query?.categorymembers ?? [];
  const titles = [];
  for (const member of members) {
    if (member.ns === 14) {
      if (depth === 0) {
        const subcatName = member.title.replace(/^Category:/, '');
        console.log(`  descending into subcategory "${subcatName}"...`);
        titles.push(...(await expandCategory(subcatName, depth + 1)));
      }
    } else {
      titles.push(member.title);
    }
  }
  return titles;
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

async function embedIntoChunks(id, title, text, sink) {
  const pieces = chunkText(text);
  console.log(`  ${pieces.length} chunks, embedding...`);
  for (let i = 0; i < pieces.length; i++) {
    const embedding = await embed(pieces[i]);
    sink.push({ id: `${id}:${i}`, topic, title, text: pieces[i], embedding });
  }
}

async function main() {
  const jobs = parseSources(rest);

  // Resolve --category jobs into plain titles up front, deduping against
  // anything explicitly listed too, so a page never gets fetched twice.
  const seenTitles = new Set();
  const titleJobs = [];
  for (const job of jobs) {
    if (job.kind === 'category') {
      console.log(`Expanding category "${job.name}"...`);
      const titles = await expandCategory(job.name);
      console.log(`  found ${titles.length} pages`);
      for (const title of titles) {
        if (!seenTitles.has(title)) {
          seenTitles.add(title);
          titleJobs.push(title);
        }
      }
    } else if (job.kind === 'title') {
      if (!seenTitles.has(job.title)) {
        seenTitles.add(job.title);
        titleJobs.push(job.title);
      }
    }
  }

  const existing = await loadExisting();
  const keptChunks = existing.filter((c) => c.topic !== topic);
  const newChunks = [];

  for (const title of titleJobs) {
    console.log(`Fetching "${title}"...`);
    try {
      const { title: resolvedTitle, text } = await fetchArticleText(title);
      if (!text) {
        console.warn(`  (no extract text returned, skipping)`);
        continue;
      }
      await embedIntoChunks(`${topic}:${resolvedTitle}`, resolvedTitle, text, newChunks);
    } catch (err) {
      console.warn(`  skipping "${title}": ${err.message}`);
    }
  }

  for (const job of jobs.filter((j) => j.kind === 'file')) {
    console.log(`Reading "${job.filePath}"...`);
    const text = await readFile(job.filePath, 'utf8');
    await embedIntoChunks(`${topic}:${job.filePath}`, path.basename(job.filePath), text, newChunks);
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
