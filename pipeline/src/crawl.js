// Slow, polite crawl of the public Karnataka RERA registry.
//
//   node src/crawl.js            # list + details for new/changed projects
//   node src/crawl.js --list     # only refresh the project list
//
// Etiquette: one request at a time, a fixed pause between requests
// (CRAWL_DELAY_MS, default 3000), a clear User-Agent, long back-off on
// errors, and details are only fetched for projects that are new or whose
// list row changed since the last run. RERA has no robots.txt (404).

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseHTML as linkedom } from 'linkedom';
import { parseProjectList, parseProjectDetail } from './parse.js';
import { DATA_DIR, isRelevant } from './config.js';

const BASE = 'https://rera.karnataka.gov.in';
const DISTRICTS = ['Bengaluru Urban', 'Bengaluru  Rural']; // RERA's spelling has two spaces
const DELAY = Number(process.env.CRAWL_DELAY_MS || 3000);
const MAX_DETAILS = Number(process.env.CRAWL_MAX_DETAILS || Infinity);
const UA = process.env.CRAWL_USER_AGENT || 'NelaBot/0.1 (flat research site; slow crawl of public RERA pages)';

const parseHTML = (html) => linkedom(html).document;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, form, attempt = 1) {
  try {
    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
      body: new URLSearchParams(form),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    if (attempt >= 4) throw err;
    const wait = 30_000 * attempt;
    console.warn(`  ${path} failed (${err.message}); retrying in ${wait / 1000}s`);
    await sleep(wait);
    return post(path, form, attempt + 1);
  }
}

const exists = (p) => access(p).then(() => true, () => false);
const readJson = async (p, fallback) => (await exists(p)) ? JSON.parse(await readFile(p, 'utf8')) : fallback;

/** A stable signature of the list row: if it changes, re-fetch details. */
const signature = (r) => [r.status, r.completion, r.extensions.join(',')].join('|');

async function crawlList() {
  const all = [];
  for (const district of DISTRICTS) {
    console.log(`List: ${district.replace(/\s+/g, ' ')}`);
    const html = await post('/projectViewDetails', {
      project: '', firm: '', appNo: '', regNo: '', district, subdistrict: '0', btn1: 'Search',
    });
    const rows = parseProjectList(html, parseHTML).map((r) => ({ ...r, district: r.district.replace(/\s+/g, ' ') }));
    console.log(`  ${rows.length} projects`);
    all.push(...rows);
    await sleep(DELAY);
  }
  if (all.length < 1000) throw new Error(`Only ${all.length} projects parsed; the page layout may have changed`);
  return all;
}

async function main() {
  await mkdir(join(DATA_DIR, 'details'), { recursive: true });
  const listPath = join(DATA_DIR, 'rera-list.json');
  const previous = await readJson(listPath, { projects: [] });
  const prevSig = new Map(previous.projects.map((p) => [p.reraId, signature(p)]));

  const projects = await crawlList();
  await writeFile(listPath, JSON.stringify({ fetchedAt: new Date().toISOString(), projects }, null, 0));
  if (process.argv.includes('--list')) return;

  const todo = [];
  for (const p of projects) {
    if (!p.reraId || !isRelevant(p)) continue;
    const file = join(DATA_DIR, 'details', `${p.reraId}.json`);
    if (!(await exists(file)) || prevSig.get(p.reraId) !== signature(p)) todo.push(p);
  }
  console.log(`Details to fetch: ${todo.length} (delay ${DELAY} ms)`);

  let n = 0;
  for (const p of todo.slice(0, MAX_DETAILS)) {
    try {
      const html = await post('/projectDetails', { action: p.reraId });
      const detail = parseProjectDetail(html, parseHTML);
      await writeFile(
        join(DATA_DIR, 'details', `${p.reraId}.json`),
        JSON.stringify({ fetchedAt: new Date().toISOString(), ...detail }),
      );
    } catch (err) {
      console.warn(`  detail ${p.reraId} (${p.name}) skipped: ${err.message}`);
    }
    if (++n % 50 === 0) console.log(`  ${n}/${todo.length}`);
    await sleep(DELAY);
  }
  console.log('Crawl done');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
