import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(here, '..', '..');
export const DATA_DIR = process.env.NELA_DATA_DIR || join(ROOT, 'data');
export const WEB_DATA_DIR = join(ROOT, 'web', 'public', 'data');

/** Google caching rules: coordinates and place details may be cached for at most 30 days. */
export const GOOGLE_CACHE_DAYS = 30;

/** Projects buyers care about: approved homes finishing from ~2.5 years ago onwards. */
export function isRelevant(p, today = new Date()) {
  if (p.status !== 'APPROVED') return false;
  if (!/Residential|Mixed/i.test(p.type || '')) return false;
  const cutoff = new Date(today);
  cutoff.setMonth(cutoff.getMonth() - 30);
  const latest = [p.completion, ...(p.extensions || [])].filter(Boolean).sort().pop();
  return !!latest && latest >= cutoff.toISOString().slice(0, 10);
}

/**
 * Places people commute to. The pipeline looks each one up with Google
 * Geocoding when the key allows it; `approx` is a fallback (landmark
 * centre, good to a few hundred metres) used only when it can't.
 */
export const HUBS = [
  { id: 'manyata', name: 'Manyata Tech Park', query: 'Manyata Tech Park, Nagavara, Bengaluru', approx: { lat: 13.0450, lng: 77.6206 } },
  { id: 'etv', name: 'Embassy Tech Village', query: 'Embassy Tech Village, Outer Ring Road, Bengaluru', approx: { lat: 12.9290, lng: 77.6870 } },
  { id: 'itpl', name: 'ITPL Whitefield', query: 'International Tech Park Bangalore, Whitefield, Bengaluru', approx: { lat: 12.9857, lng: 77.7370 } },
  { id: 'ecity', name: 'Electronic City', query: 'Infosys Electronic City Phase 1, Bengaluru', approx: { lat: 12.8456, lng: 77.6630 } },
  { id: 'bagmane', name: 'Bagmane Tech Park', query: 'Bagmane Tech Park, CV Raman Nagar, Bengaluru', approx: { lat: 12.9800, lng: 77.6620 } },
  { id: 'mgroad', name: 'MG Road', query: 'MG Road Metro Station, Bengaluru', approx: { lat: 12.9755, lng: 77.6067 } },
  { id: 'airport', name: 'Kempegowda Airport', query: 'Kempegowda International Airport, Bengaluru', approx: { lat: 13.1989, lng: 77.7068 } },
];
