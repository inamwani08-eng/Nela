import { useState } from 'react';
import type { Hub, Project } from '../lib/types';
import { hasMaps, MAPS_KEY, nextWeekdayAt9 } from '../lib/maps';
import { km } from '../lib/format';
import { Icon } from './ui';

/**
 * Straight-line distances come with the data. Peak-hour drive times are
 * fetched from Google only when the visitor asks, so we don't pay for
 * lookups nobody reads.
 */
type Mins = Record<string, number | null>;

const pt = (lat: number, lng: number) => ({ waypoint: { location: { latLng: { latitude: lat, longitude: lng } } } });

/** Peak-hour drive times from Google's Routes API (the old Distance Matrix API is closed to new projects). */
async function routeMatrix(p: Project, hubs: Hub[]): Promise<Mins> {
  const res = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': MAPS_KEY,
      'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,condition',
    },
    body: JSON.stringify({
      origins: [pt(p.lat!, p.lng!)],
      destinations: hubs.map((h) => pt(h.lat, h.lng)),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
      departureTime: nextWeekdayAt9().toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`Routes API ${res.status}`);
  const rows: { destinationIndex?: number; duration?: string; condition?: string }[] = await res.json();
  const out: Mins = {};
  for (const r of rows) {
    const h = hubs[r.destinationIndex ?? 0];
    out[h.id] = r.condition === 'ROUTE_EXISTS' && r.duration ? Math.round(parseInt(r.duration, 10) / 60) : null;
  }
  return out;
}

function LiveDriveButton({ p, sorted, onDone }: { p: Project; sorted: Hub[]; onDone: (m: Mins) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!p.lat) return;
    setBusy(true);
    setErr(null);
    try {
      onDone(await routeMatrix(p, sorted));
    } catch {
      setErr("Couldn't get drive times right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-quiet" onClick={load} disabled={busy}>
        <Icon.car /> {busy ? 'Checking traffic…' : 'Show 9 AM drive times'}
      </button>
      {err && <p className="fine tone-bad">{err}</p>}
    </>
  );
}

export function DriveTimes({ p, hubs }: { p: Project; hubs: Hub[] }) {
  const [mins, setMins] = useState<Mins | null>(null);
  const sorted = [...hubs].sort((a, b) => (p.hubKm[a.id] ?? 999) - (p.hubKm[b.id] ?? 999));
  return (
    <div className="commute">
      <ul className="commute-list num">
        {sorted.map((h) => (
          <li key={h.id}>
            <span>{h.name}</span>
            <span className="commute-vals">
              <span className="muted">{km(p.hubKm[h.id])}</span>
              {mins && <b>{mins[h.id] != null ? `${mins[h.id]} min` : '—'}</b>}
            </span>
          </li>
        ))}
        {p.metro && (
          <li>
            <span className="metro-name">
              <Icon.train size={16} /> {p.metro.name} metro
            </span>
            <span className="commute-vals">
              <b className="tone-metro">{km(p.metro.km)}</b>
            </span>
          </li>
        )}
      </ul>
      <p className="fine">Distances are straight-line. {mins ? 'Drive times: Google estimate for the next weekday, leaving 9 AM.' : ''}</p>
      {!mins && hasMaps() && p.lat && <LiveDriveButton p={p} sorted={sorted} onDone={setMins} />}
    </div>
  );
}
