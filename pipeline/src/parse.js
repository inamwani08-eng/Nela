// Parsers for public Karnataka RERA pages.
// Pure functions: they take an HTML string and a DOMParser-like `parseHTML`
// so the same code runs in Node (linkedom) and in a browser.
//
// Privacy rule: we only keep project facts. Promoter PAN numbers, partner
// names, land owner names, home addresses and bank accounts are on these
// pages but are never extracted.

const SQM_TO_SQFT = 10.7639;

export function textTokens(doc) {
  doc.querySelectorAll('script,style,noscript').forEach((e) => e.remove());
  const out = [];
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        const s = child.textContent.replace(/\s+/g, ' ').trim();
        if (s && s !== ':') out.push(s.replace(/\s*:$/, '').trim());
      } else if (child.nodeType === 1) {
        walk(child);
      }
    }
  };
  walk(doc.body || doc);
  return out;
}

const clean = (s) => (s == null ? '' : String(s).replace(/\s+/g, ' ').trim());

/** "28/02/2022", "28-02-2022" -> "2022-02-28" */
export function toIsoDate(s) {
  const m = clean(s).match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Last date in a string like "31-05-2021 - 28-02-2022" */
function lastIsoDate(s) {
  const all = clean(s).match(/\d{1,2}[/-]\d{1,2}[/-]\d{4}/g);
  return all ? toIsoDate(all[all.length - 1]) : null;
}

/** 12°59'45.61"N -> 12.99600 ; also accepts plain decimals */
export function parseCoord(s) {
  const str = clean(s);
  if (!str) return null;
  const dec = str.match(/^-?\d{1,3}\.\d+$/);
  if (dec) return parseFloat(str);
  const m = str.match(/(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*([\d.]+)?/);
  if (!m) return null;
  return +(+m[1] + +m[2] / 60 + (m[3] ? +m[3] / 3600 : 0)).toFixed(6);
}

function num(s) {
  const m = clean(s).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function normStatus(s) {
  const m = clean(s).toUpperCase().match(/APPROVED|REJECTED|WITHDRAWN|REVOKED|TRANSFERED|LAPSED/);
  return m ? m[0] : clean(s).split(' ')[0] || null;
}

/**
 * Parse the result table from POST /projectViewDetails (one district).
 * Returns one row per project, with only public project-level fields.
 */
export function parseProjectList(html, parseHTML) {
  const doc = parseHTML(html);
  const rows = [...doc.querySelectorAll('#approvedTable tbody tr')];
  const T = (c) => clean(c && c.textContent);
  return rows
    .map((r) => {
      const c = r.querySelectorAll('td');
      if (c.length < 16) return null;
      const link = c[3].querySelector('a[id]');
      const completionAtReg = toIsoDate(T(c[12]));
      const extensions = [T(c[13]), T(c[14]), T(c[15])].map(lastIsoDate).filter(Boolean);
      return {
        reraId: link ? link.getAttribute('id') : null,
        ackNo: T(c[1]),
        regNo: T(c[2]) || null,
        promoter: T(c[4]),
        name: T(c[5]),
        status: normStatus(T(c[6])),
        district: T(c[7]),
        taluk: T(c[8]),
        type: T(c[9]),
        approvedOn: toIsoDate(T(c[10])),
        completion: toIsoDate(T(c[11])),
        completionAtReg,
        extensions,
      };
    })
    .filter(Boolean);
}

/**
 * Parse POST /projectDetails (action=<reraId>). Handles both the older
 * (2017-2019) layout and the current one.
 */
export function parseProjectDetail(html, parseHTML) {
  const t = textTokens(parseHTML(html));
  // The tab bar also says "Project Details"; the section is the later one.
  const heads = t.map((x, i) => (/^Project$/.test(x) && t[i + 1] === 'Details') || x === 'Project Details' ? i : -1).filter((i) => i >= 0);
  const start = heads.length > 1 ? heads[1] : heads[0] || 0;

  const find = (labels, opts = {}) => {
    const set = labels.map((l) => l.toLowerCase());
    for (let i = start; i < t.length - 1; i++) {
      if (set.includes(t[i].toLowerCase())) {
        const v = t[i + 1];
        if (opts.test && !opts.test(v)) continue;
        return v;
      }
    }
    return null;
  };
  const isDate = (v) => /\d{1,2}[/-]\d{1,2}[/-]\d{4}/.test(v);
  const isNum = (v) => /^-?[\d.,]+\s*(SqMtr)?$/i.test(v);

  // Unit mix
  const units = [];
  const tableAt = t.findIndex((x, i) => i > start && x === 'Type of Inventory' && t[i + 1] === 'No. of Inventory');
  if (tableAt > 0) {
    let k = t.indexOf('Area of exclusive open Terrace (Sq Mtr)', tableAt);
    if (k > 0) {
      k++;
      while (k + 5 < t.length && /^\d+$/.test(t[k]) && !/^TOTAL$/i.test(t[k + 1])) {
        units.push({ type: t[k + 1], count: num(t[k + 2]), carpetSqm: num(t[k + 3]), balconySqm: num(t[k + 4]) || 0 });
        k += 6;
      }
    }
  } else {
    for (let i = start; i < t.length - 7; i++) {
      if (t[i] === 'Type of Inventory' && t[i + 2] === 'No of Inventory') {
        units.push({
          type: t[i + 1],
          count: num(t[i + 3]),
          carpetSqm: t[i + 4].startsWith('Carpet Area') ? num(t[i + 5]) : null,
          balconySqm: t[i + 6] && t[i + 6].startsWith('Area of exclusive balcony') ? num(t[i + 7]) || 0 : 0,
        });
      }
    }
  }

  {
    const seen = new Set();
    for (let i = units.length - 1; i >= 0; i--) {
      const key = `${units[i].type}|${units[i].count}|${units[i].carpetSqm}`;
      if (seen.has(key)) units.splice(i, 1);
      else seen.add(key);
    }
  }

  // Per-unit carpet areas, when the newer layout lists every flat.
  const unitSizes = {};
  const perUnitAt = t.findIndex((x, i) => i > start && x === 'Unit Type' && t[i + 1] === 'Carpet Area');
  if (perUnitAt > 0) {
    let k = t.indexOf('No of parking lots', perUnitAt);
    if (k > 0) {
      k++;
      while (k + 8 < t.length && /^\d+$/.test(t[k])) {
        const type = t[k + 3];
        const area = num(t[k + 4]);
        if (type && area) {
          const s = (unitSizes[type] ||= { min: Infinity, max: 0 });
          s.min = Math.min(s.min, area);
          s.max = Math.max(s.max, area);
        }
        k += 9;
      }
    }
  }

  let lat = parseCoord(find(['Latitude']));
  let lng = parseCoord(find(['Longitude']));
  if (lat == null) {
    const lats = ['North Latitude', 'East Latitude', 'South Latitude'].map((l) => parseCoord(find([l]))).filter((v) => v && v > 8 && v < 20);
    const lngs = ['North Longitude', 'East Longitude', 'South Longitude'].map((l) => parseCoord(find([l]))).filter((v) => v && v > 70 && v < 80);
    if (lats.length) lat = +(lats.reduce((a, b) => a + b, 0) / lats.length).toFixed(6);
    if (lngs.length) lng = +(lngs.reduce((a, b) => a + b, 0) / lngs.length).toFixed(6);
  }
  if (!(lat > 11.5 && lat < 14.5)) lat = null;
  if (!(lng > 76.5 && lng < 78.5)) lng = null;

  const rawStatus = find(['Project Status']);
  const address = find(['Project Address'], { test: (v) => v.length > 8 && v !== 'Project Address' });
  // Pin: from the address, else the "Pin Code" label right after it (later
  // "Pin Code" labels belong to architects and engineers).
  let pin = (address && address.match(/\b5[67]\d{4}\b/)) ? address.match(/\b5[67]\d{4}\b/)[0] : null;
  if (!pin) {
    const at = t.indexOf('Project Address', start);
    if (at > 0) {
      for (let i = at; i < Math.min(at + 16, t.length - 1); i++) {
        if (t[i] === 'Pin Code' && /^\d{6}$/.test(t[i + 1])) { pin = t[i + 1]; break; }
      }
    }
  }
  return {
    name: find(['Project Name']),
    description: find(['Project Description']),
    projectStatus: rawStatus,
    subType: find(['Project Sub Type']),
    startDate: toIsoDate(find(['Project Start Date'])),
    completion: toIsoDate(find(['Proposed Completion Date', 'Proposed Project Completion Date'], { test: isDate })),
    address,
    pin,
    lat,
    lng,
    authority: find(['Approving Authority']),
    totalUnits: num(find(['Total Number of Inventories/Flats/Villas'], { test: isNum })),
    landSqm: num(find(['Total Area Of Land (Sq Mtr) (A1+A2)', 'Total Area Of Land (Sq Mtr)'], { test: isNum })),
    towers: num(find(['Number of Towers'], { test: isNum })),
    water: find(['Source of Water'], { test: (v) => v !== 'Source of Water' }),
    units: units.map((u) => {
      const s = unitSizes[u.type];
      const avg = u.carpetSqm && u.count ? u.carpetSqm / u.count : null;
      return {
        type: u.type,
        count: u.count,
        // Total carpet is for all units of the type; also report a per-flat figure.
        carpetSqftAvg: avg ? Math.round(avg * SQM_TO_SQFT) : null,
        carpetSqftMin: s ? Math.round(s.min * SQM_TO_SQFT) : null,
        carpetSqftMax: s ? Math.round(s.max * SQM_TO_SQFT) : null,
      };
    }),
  };
}

/** "3 BHK", "3BHK + Study", "Three Bedroom" -> 3 ; plots/shops -> null */
export function bhkOf(type) {
  const s = clean(type).toUpperCase();
  const m = s.match(/(\d)(\.5)?\s*-?\s*(BHK|BR|BED)/);
  if (m) return +m[1];
  if (/STUDIO|1\s*RK/.test(s)) return 0;
  const words = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  const w = s.match(/\b(ONE|TWO|THREE|FOUR|FIVE)\s+(BHK|BED)/);
  return w ? words[w[1]] : null;
}
