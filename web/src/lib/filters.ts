import type { Hub, Project } from './types';

export interface Filters {
  q: string;
  by: number | null; // possession by end of this year
  ready: boolean;
  bhk: number[];
  cmin: number | null;
  cmax: number | null;
  hub: string | null;
  hubKm: number | null;
  metroKm: number | null;
  onTime: boolean;
  sort: 'possession' | 'hub' | 'carpet' | 'builder' | 'newest';
}

export const EMPTY: Filters = {
  q: '', by: null, ready: false, bhk: [], cmin: null, cmax: null, hub: null, hubKm: null, metroKm: null, onTime: false, sort: 'possession',
};

const num = (v: string | null) => (v && !isNaN(+v) ? +v : null);

export function fromParams(sp: URLSearchParams): Filters {
  const sort = sp.get('sort') as Filters['sort'] | null;
  return {
    q: sp.get('q') || '',
    by: num(sp.get('by')),
    ready: sp.get('ready') === '1',
    bhk: (sp.get('bhk') || '').split(',').filter(Boolean).map(Number).filter((n) => !isNaN(n)),
    cmin: num(sp.get('cmin')),
    cmax: num(sp.get('cmax')),
    hub: sp.get('hub'),
    hubKm: num(sp.get('hubkm')),
    metroKm: num(sp.get('metro')),
    onTime: sp.get('ontime') === '1',
    sort: sort && ['possession', 'hub', 'carpet', 'builder', 'newest'].includes(sort) ? sort : sp.get('hub') ? 'hub' : 'possession',
  };
}

export function toParams(f: Filters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.q) sp.set('q', f.q);
  if (f.by) sp.set('by', String(f.by));
  if (f.ready) sp.set('ready', '1');
  if (f.bhk.length) sp.set('bhk', f.bhk.join(','));
  if (f.cmin) sp.set('cmin', String(f.cmin));
  if (f.cmax) sp.set('cmax', String(f.cmax));
  if (f.hub) sp.set('hub', f.hub);
  if (f.hubKm) sp.set('hubkm', String(f.hubKm));
  if (f.metroKm) sp.set('metro', String(f.metroKm));
  if (f.onTime) sp.set('ontime', '1');
  if (f.sort !== 'possession' && !(f.sort === 'hub' && f.hub)) sp.set('sort', f.sort);
  return sp;
}

const HUB_WORDS: Record<string, string[]> = {
  manyata: ['manyata', 'hebbal', 'nagawara', 'nagavara'],
  etv: ['embassy tech', 'etv', 'bellandur', 'orr', 'outer ring', 'marathahalli', 'sarjapur'],
  itpl: ['itpl', 'whitefield'],
  ecity: ['electronic city', 'e-city', 'ecity', 'hosur road'],
  bagmane: ['bagmane', 'cv raman', 'indiranagar'],
  mgroad: ['mg road', 'cbd', 'central'],
  airport: ['airport', 'devanahalli'],
};

/**
 * Turn "3 BHK near Manyata, ready by 2027" into filters. Whatever isn't
 * understood stays as free text matched against name, area and builder.
 */
export function parseQuery(text: string, hubs: Hub[]): Partial<Filters> {
  let rest = ` ${text.toLowerCase()} `;
  const out: Partial<Filters> = {};
  const bhks = [...rest.matchAll(/(\d)\s*(?:,|or|\/|&)?\s*(?=(?:\d\s*(?:,|or|\/|&)?\s*)*bhk)/g)].map((m) => +m[1]);
  const bhkOne = rest.match(/(\d)\s*bhk/);
  if (bhks.length) out.bhk = [...new Set(bhks)].sort();
  else if (bhkOne) out.bhk = [+bhkOne[1]];
  rest = rest.replace(/(\d\s*(,|or|\/|&)?\s*)+bhk/g, ' ');
  if (/ready to move|ready-to-move|\bready\b(?! by)|\brtm\b/.test(rest)) {
    out.ready = true;
    rest = rest.replace(/ready to move|ready-to-move|\bready\b(?! by)|\brtm\b/g, ' ');
  }
  const by = rest.match(/(?:by|before|in|possession)\s*(?:dec(?:ember)?\s*)?(20\d\d)/);
  if (by) {
    out.by = +by[1];
    rest = rest.replace(by[0], ' ').replace(/\bready\b/g, ' ');
  }
  for (const h of hubs) {
    const words = HUB_WORDS[h.id] || [h.name.toLowerCase()];
    const w = words.find((x) => rest.includes(x));
    if (w) {
      out.hub = h.id;
      out.hubKm = 10;
      rest = rest.replace(new RegExp(`(near|close to|around)?\\s*${w}`), ' ');
      break;
    }
  }
  const metro = /near (?:a |the )?metro|metro nearby|close to metro/;
  if (metro.test(rest)) {
    out.metroKm = 2;
    rest = rest.replace(metro, ' ');
  }
  rest = rest.replace(/\b(under|below|flats?|apartments?|homes?|in|near|at|bangalore|bengaluru|,)\b/g, ' ').replace(/[₹]?\d+(\.\d+)?\s*(cr|crore|l|lakh|lakhs)\b/g, ' ');
  out.q = rest.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  return out;
}

export function applyFilters(projects: Project[], f: Filters): Project[] {
  const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  const res = projects.filter((p) => {
    if (f.ready && !p.ready) return false;
    if (f.by && !p.ready && (!p.possession || p.possession > `${f.by}-12-31`)) return false;
    if (f.bhk.length && !p.bhk.some((b) => f.bhk.includes(b))) return false;
    if (f.cmin && (p.carpetMax == null || p.carpetMax < f.cmin)) return false;
    if (f.cmax && (p.carpetMin == null || p.carpetMin > f.cmax)) return false;
    if (f.hub && f.hubKm && !(p.hubKm[f.hub] <= f.hubKm)) return false;
    if (f.metroKm && !(p.metro && p.metro.km <= f.metroKm)) return false;
    if (f.onTime && p.delayMonths > 0) return false;
    if (words.length) {
      const hay = `${p.name} ${p.area} ${p.taluk} ${p.builder} ${p.address || ''} ${p.pin || ''}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const by = f.sort;
  const hub = f.hub;
  res.sort((a, b) => {
    if (by === 'hub' && hub) return (a.hubKm[hub] ?? 999) - (b.hubKm[hub] ?? 999);
    if (by === 'carpet') return (b.carpetMax ?? 0) - (a.carpetMax ?? 0);
    if (by === 'builder') return (a.builderStats?.avgDelayMonths ?? 99) - (b.builderStats?.avgDelayMonths ?? 99);
    if (by === 'newest') return (b.approvedOn || '').localeCompare(a.approvedOn || '');
    // possession: ready first, then soonest
    if (a.ready !== b.ready) return a.ready ? -1 : 1;
    // Projects with flat sizes on file are more useful, so they lead within each group.
    const full = (p: Project) => (p.carpetMin && p.bhk.length ? 0 : 1);
    if (a.ready) {
      // Completed first, then the most recently due (long-overdue ones sink).
      if ((a.readyState === 'completed') !== (b.readyState === 'completed')) return a.readyState === 'completed' ? -1 : 1;
      if (full(a) !== full(b)) return full(a) - full(b);
      return (b.possession || '').localeCompare(a.possession || '');
    }
    const ya = (a.possession || '9999').slice(0, 4), yb = (b.possession || '9999').slice(0, 4);
    if (ya !== yb) return ya.localeCompare(yb);
    if (full(a) !== full(b)) return full(a) - full(b);
    return (a.possession || '9999').localeCompare(b.possession || '9999');
  });
  return res;
}

export const activeCount = (f: Filters) =>
  [f.by, f.ready, f.bhk.length, f.cmin || f.cmax, f.hub, f.metroKm, f.onTime].filter(Boolean).length;
