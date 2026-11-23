// Merge the RERA crawl with Google lookups into the site's dataset:
//   web/public/data/projects.json   one record per project
//   web/public/data/meta.json       hubs, metro stations, freshness, counts
//
// Everything here is derived from public RERA filings except coordinates
// that RERA lacks (Google Geocoding), metro stations and place IDs (Google).

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DATA_DIR, WEB_DATA_DIR, HUBS, isRelevant } from './config.js';
import { bhkOf } from './parse.js';
import { km, nearest, inBangalore } from './geo.js';

const readJson = (p, f) => readFile(p, 'utf8').then(JSON.parse, () => f);
const r1 = (x) => Math.round(x * 10) / 10;

export const monthsBetween = (a, b) => {
  if (!a || !b) return null;
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma) + (db - da) / 30;
};

const latestDate = (p) => [p.completion, ...(p.extensions || [])].filter(Boolean).sort().pop() || null;

/** "PRESTIGE ESTATES PROJECTS LIMITED" and "Prestige Estates Projects Ltd." group together. */
export const builderKey = (name) =>
  (name || '')
    .toUpperCase()
    .replace(/\b(PRIVATE|PVT|LIMITED|LTD|LLP|CO|COMPANY|INDIA|THE|AND|&|M\/S|MS)\b\.?/g, ' ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

const titleCase = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\b(Llp|Bhk|Ii|Iii|Iv|Snn|Psr|Dlf|Ksdb)\b/g, (m) => m.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();

/** A short, human locality from RERA's survey-number style address. */
export function localityOf(address, taluk, geocodedLocality) {
  if (geocodedLocality) return geocodedLocality;
  const a = address || '';
  const v = a.match(/([A-Za-z][A-Za-z .]{2,40}?)\s+(?:Village|Grama)\b/i);
  if (v) return titleCase(v[1].replace(/^.*\b(of|at|in)\s+/i, ''));
  const road = a.match(/([A-Za-z][A-Za-z .]{2,30}?)\s+(?:Main Road|Road)\b/i);
  if (road) return titleCase(road[1]);
  return taluk;
}

export function builderStats(projects, today) {
  const byKey = new Map();
  for (const p of projects) {
    if (p.status !== 'APPROVED' && p.status !== 'TRANSFERED') continue;
    const k = builderKey(p.promoter);
    if (!k) continue;
    if (!byKey.has(k)) byKey.set(k, { name: titleCase(p.promoter), projects: 0, finished: 0, delays: [], extended: 0 });
    const b = byKey.get(k);
    b.projects++;
    const last = latestDate(p);
    if (last && last < today) b.finished++;
    const d = monthsBetween(p.completionAtReg, last);
    if (d != null) {
      b.delays.push(Math.max(0, d));
      if (d > 1) b.extended++;
    }
  }
  const out = {};
  for (const [k, b] of byKey) {
    const avg = b.delays.length ? b.delays.reduce((x, y) => x + y, 0) / b.delays.length : null;
    out[k] = {
      name: b.name,
      projects: b.projects,
      finished: b.finished,
      avgDelayMonths: avg == null ? null : r1(avg),
      extendedShare: b.delays.length ? Math.round((100 * b.extended) / b.delays.length) : null,
    };
  }
  return out;
}

const RESIDENTIAL = /flat|apartment|villa|row ?house|residential|duplex|simplex|penthouse|studio|bhk|bed/i;
const PLAUSIBLE = (x) => x != null && x >= 150 && x <= 15000;

/**
 * RERA filings are typed by builders and older ones mix up "total carpet
 * area for this type" with "carpet area of one flat". Keep what makes sense:
 *  - per-flat = total / count when that's plausible
 *  - otherwise assume the figure was for one flat
 *  - per-unit min/max only when plausible and consistent with the above
 * and drop rows that are parking or internal codes ("C20b").
 */
export function cleanUnits(raw) {
  const out = [];
  for (const u of raw) {
    if (!u.type || /^TOTAL$/i.test(u.type) || /^\d+$/.test(u.type)) continue;
    const bhk = bhkOf(u.type);
    if (bhk == null && !RESIDENTIAL.test(u.type)) continue;
    if (/shop|office|commercial|retail|plot|site|parking/i.test(u.type)) continue;
    // Largest believable carpet area per flat for this type; bigger numbers are
    // totals for the whole block or typos (e.g. 9,505 sq ft for a 2 BHK).
    const ceil = bhk == null ? 5000 : [1200, 1200, 2200, 3500, 6000, 10000][Math.min(bhk, 5)];
    const ok = (v) => PLAUSIBLE(v) && v <= ceil;
    let per = u.carpetSqftAvg;
    if (!ok(per) && per && u.count && per < 180) {
      const alt = per * u.count; // the total was really one flat's area
      per = ok(alt) ? Math.round(alt) : null;
    } else if (!ok(per)) per = null;
    let min = ok(u.carpetSqftMin) ? u.carpetSqftMin : null;
    let max = ok(u.carpetSqftMax) ? u.carpetSqftMax : null;
    if (min && max && min > max) [min, max] = [max, min];
    if (min && max) {
      // A per-flat table beats an average derived from totals.
      if (per && (per < min * 0.5 || per > max * 2)) per = Math.round((min + max) / 2);
    } else {
      min = max = per;
    }
    if (!min && !max) {
      if (bhk == null && !u.count) continue;
    }
    // Avoid absurd sizes for a given BHK (e.g. a 2 BHK filed as 3,000 sq ft per unit is fine, 60 sq ft is not).
    if (bhk != null && min && min < 180 + bhk * 60) min = max = null;
    out.push({ type: titleCase(u.type.replace(/\s*-\s*\d{3,5}$/, '')).replace(/(\d(?:\.5)?)\s*BHK/gi, '$1 BHK'), bhk, count: u.count || null, carpetMin: min, carpetMax: max });
  }
  // Merge duplicates created by the "3 BHK - 1615" style rows.
  const merged = new Map();
  for (const u of out) {
    const k = u.type.toUpperCase();
    const m = merged.get(k);
    if (!m) merged.set(k, { ...u });
    else {
      m.count = (m.count || 0) + (u.count || 0) || null;
      m.carpetMin = [m.carpetMin, u.carpetMin].filter(Boolean).reduce((a, b) => Math.min(a, b), Infinity);
      m.carpetMax = [m.carpetMax, u.carpetMax].filter(Boolean).reduce((a, b) => Math.max(a, b), 0);
      if (m.carpetMin === Infinity) m.carpetMin = null;
      if (!m.carpetMax) m.carpetMax = null;
    }
  }
  return [...merged.values()];
}

export function buildProject(p, d, ctx) {
  const { today, geo, places, hubs, stations, builders } = ctx;
  let lat = d?.lat;
  let lng = d?.lng;
  let coordSource = 'rera';
  let geoLocality = null;
  if (!(lat && lng && inBangalore(lat, lng))) {
    const g = geo[`p:${p.reraId}`];
    if (g && g.lat) {
      lat = g.lat;
      lng = g.lng;
      coordSource = g.precision === 'ROOFTOP' ? 'geocoded' : 'approximate';
      geoLocality = g.locality;
    } else {
      lat = lng = null;
      coordSource = null;
    }
  }

  const units = cleanUnits(d?.units || []);
  const carpets = units.flatMap((u) => [u.carpetMin, u.carpetMax]).filter((x) => x && x > 150 && x < 15000);
  const possession = latestDate(p);
  const delayMonths = monthsBetween(p.completionAtReg, possession);
  const statusText = (d?.projectStatus || '').toLowerCase();
  // "completed": RERA status says so. "past-due": the RERA completion date
  // has passed but the builder hasn't marked it complete (ask for the OC).
  const readyState = /complet/.test(statusText) ? 'completed' : possession && possession <= today ? 'past-due' : 'upcoming';
  const ready = readyState !== 'upcoming';

  const point = lat ? { lat, lng } : null;
  const metro = point && stations.length ? nearest(point, stations) : null;
  const hubKm = {};
  if (point) for (const h of hubs) hubKm[h.id] = r1(km(point, h));

  const bKey = builderKey(p.promoter);
  return {
    id: p.reraId,
    reg: p.regNo,
    name: titleCase(d?.name || p.name),
    builder: titleCase(p.promoter),
    builderKey: bKey,
    builderStats: builders[bKey] || null,
    district: p.district,
    taluk: p.taluk,
    area: localityOf(d?.address, p.taluk, geoLocality),
    address: d?.address || null,
    pin: d?.pin || null,
    lat: lat == null ? null : +lat.toFixed(6),
    lng: lng == null ? null : +lng.toFixed(6),
    coordSource,
    type: p.type,
    subType: d?.subType || null,
    reraStatus: d?.projectStatus || null,
    approvedOn: p.approvedOn,
    startDate: d?.startDate || null,
    possession,
    possessionAtReg: p.completionAtReg,
    delayMonths: delayMonths != null && delayMonths > 0.5 ? Math.round(delayMonths) : 0,
    extensions: (p.extensions || []).length,
    ready,
    readyState,
    units,
    bhk: [...new Set(units.map((u) => u.bhk).filter((x) => x != null))].sort(),
    carpetMin: carpets.length ? Math.min(...carpets) : null,
    carpetMax: carpets.length ? Math.max(...carpets) : null,
    totalUnits: d?.totalUnits || units.reduce((s, u) => s + (u.count || 0), 0) || null,
    towers: d?.towers || null,
    landAcres: d?.landSqm ? r1(d.landSqm / 4046.86) : null,
    authority: d?.authority ? d.authority.split(' - ')[0] : null,
    water: d?.water ? d.water.replace(/,\s*$/, '').split(',').map((s) => s.trim()).filter(Boolean) : [],
    placeId: places[p.reraId]?.placeId || null,
    metro: metro ? { name: metro.name, km: r1(metro.km) } : null,
    hubKm,
    detailFetchedAt: d?.fetchedAt || null,
  };
}

export async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const list = await readJson(join(DATA_DIR, 'rera-list.json'), null);
  if (!list) throw new Error('Run the crawl first: data/rera-list.json is missing');
  const geo = await readJson(join(DATA_DIR, 'google', 'geocode.json'), {});
  const places = await readJson(join(DATA_DIR, 'google', 'places.json'), {});
  const metro = await readJson(join(DATA_DIR, 'google', 'metro.json'), { stations: [] });
  const hubs = HUBS.map((h) => ({ ...h, ...(h.approx || {}), ...(geo[`hub:${h.id}`]?.lat ? geo[`hub:${h.id}`] : {}) })).filter((h) => h.lat);
  const builders = builderStats(list.projects, today);

  const detailFiles = new Set(await readdir(join(DATA_DIR, 'details')).catch(() => []));
  const out = [];
  for (const p of list.projects) {
    if (!p.reraId || !isRelevant(p)) continue;
    const d = detailFiles.has(`${p.reraId}.json`) ? await readJson(join(DATA_DIR, 'details', `${p.reraId}.json`), null) : null;
    if (!d) continue; // list-only rows lack unit sizes; they appear after the next crawl
    out.push(buildProject(p, d, { today, geo, places, hubs, stations: metro.stations, builders }));
  }
  out.sort((a, b) => (a.possession || '').localeCompare(b.possession || ''));

  await mkdir(WEB_DATA_DIR, { recursive: true });
  await writeFile(join(WEB_DATA_DIR, 'projects.json'), JSON.stringify(out));
  const meta = {
    builtAt: new Date().toISOString(),
    reraListFetchedAt: list.fetchedAt,
    counts: {
      reraProjectsListed: list.projects.length,
      onSite: out.length,
      ready: out.filter((p) => p.ready).length,
      withCoords: out.filter((p) => p.lat).length,
      withGooglePlace: out.filter((p) => p.placeId).length,
    },
    hubs: hubs.map(({ id, name, lat, lng }) => ({ id, name, lat, lng })),
    metroStations: metro.stations,
  };
  await writeFile(join(WEB_DATA_DIR, 'meta.json'), JSON.stringify(meta, null, 1));
  console.log(`Built ${out.length} projects`, meta.counts);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
