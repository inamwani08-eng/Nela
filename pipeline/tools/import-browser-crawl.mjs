// Merge a file downloaded by tools/browser-crawl.mjs into data/.
//   node tools/import-browser-crawl.mjs <file>
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_DIR } from '../src/config.js';

const src = process.argv[2];
if (!src) throw new Error('Usage: node tools/import-browser-crawl.mjs <file>');
const d = JSON.parse(await readFile(src, 'utf8'));
if (!Array.isArray(d.list) || d.list.length < 1000) throw new Error('File has no full project list');
await mkdir(join(DATA_DIR, 'details'), { recursive: true });
const projects = d.list.map(({ hasComplaints, ...r }) => r);
await writeFile(join(DATA_DIR, 'rera-list.json'), JSON.stringify({ fetchedAt: d.fetchedAt, projects }));
let n = 0;
for (const [id, v] of Object.entries(d.details || {})) {
  if (!/^\d+$/.test(id)) continue;
  await writeFile(join(DATA_DIR, 'details', `${id}.json`), JSON.stringify({ fetchedAt: d.fetchedAt, ...v }));
  n++;
}
console.log(`${projects.length} projects listed, ${n} detail pages updated`);
