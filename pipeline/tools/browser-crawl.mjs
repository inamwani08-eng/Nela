// Manual RERA refresh through a browser in India (RERA blocks servers abroad).
//
//   node tools/browser-crawl.mjs > /tmp/nela-crawl.js
//
// Paste the output into the devtools console (or run it with a browser
// automation tool) on any rera.karnataka.gov.in page. It reads both district
// lists, fetches detail pages only for projects that are new or changed since
// the committed data (one every 3 s), then downloads nela-rera-update.json.
// Progress: window.__nela. Then:
//
//   node tools/import-browser-crawl.mjs <downloaded file>
//   npm run build
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_DIR, isRelevant } from '../src/config.js';

const here = new URL('.', import.meta.url);
const parseSrc = (await readFile(new URL('../src/parse.js', here), 'utf8')).replace(/^export /gm, '');
const sig = (r) => [r.status, r.completion, (r.extensions || []).join(',')].join('|');
// Short FNV-1a hash of id + signature, so the pasted script stays small.
const h = (s) => { let x = 0x811c9dc5; for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 0x01000193) >>> 0; return x.toString(36); };

const list = JSON.parse(await readFile(join(DATA_DIR, 'rera-list.json'), 'utf8')).projects;
const have = new Set((await readdir(join(DATA_DIR, 'details'))).map((f) => f.replace(/\.json$/, '')));
const known = list.filter((p) => have.has(p.reraId)).map((p) => h(p.reraId + '#' + sig(p))).join(' ');

process.stdout.write(`(async () => {
${parseSrc}
const isRelevant = ${isRelevant.toString()};
const sig = ${sig.toString()};
const h = ${h.toString()};
const known = new Set(${JSON.stringify(known)}.split(' '));
const P = (html) => new DOMParser().parseFromString(html, 'text/html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function post(path, form) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } catch (e) { if (i >= 4) throw e; await sleep(30000 * i); }
  }
}
const S = (window.__nela = { phase: 'list', done: 0, fail: 0, todo: 0, details: {} });
const fetchedAt = new Date().toISOString();
let rows = [];
for (const district of ['Bengaluru Urban', 'Bengaluru  Rural']) {
  const html = await post('/projectViewDetails', { project: '', firm: '', appNo: '', regNo: '', district, subdistrict: '0', btn1: 'Search' });
  rows.push(...parseProjectList(html, P).map((r) => ({ ...r, district: r.district.replace(/\\s+/g, ' ') })));
  await sleep(3000);
}
if (rows.length < 1000) { S.phase = 'error'; S.error = 'Only ' + rows.length + ' projects parsed'; return; }
const todo = rows.filter((r) => r.reraId && isRelevant(r) && !known.has(h(r.reraId + '#' + sig(r))));
Object.assign(S, { phase: 'details', listed: rows.length, todo: todo.length });
for (const r of todo) {
  try { S.details[r.reraId] = parseProjectDetail(await post('/projectDetails', { action: r.reraId }), P); S.done++; }
  catch (e) { S.fail++; S.lastErr = String(e); }
  await sleep(3000);
}
const blob = new Blob([JSON.stringify({ fetchedAt, list: rows, details: S.details })], { type: 'application/json' });
const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'nela-rera-update.json' });
document.body.appendChild(a); a.click();
S.phase = 'done';
})().catch((e) => { window.__nela = { ...(window.__nela || {}), phase: 'error', error: String(e) }; });
'started';
`);
