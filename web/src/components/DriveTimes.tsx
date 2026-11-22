import { useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { Hub, Project } from '../lib/types';
import { hasMaps, nextWeekdayAt9 } from '../lib/maps';
import { km } from '../lib/format';
import { Icon } from './ui';

/**
 * Straight-line distances come with the data. Peak-hour drive times are
 * fetched from Google only when the visitor asks, so we don't pay for
 * lookups nobody reads.
 */
type Mins = Record<string, number | null>;

function LiveDriveButton({ p, sorted, onDone }: { p: Project; sorted: Hub[]; onDone: (m: Mins) => void }) {
  const routes = useMapsLibrary('routes');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!routes || !p.lat) return;
    setBusy(true);
    setErr(null);
    try {
      const svc = new routes.DistanceMatrixService();
      const res = await svc.getDistanceMatrix({
        origins: [{ lat: p.lat, lng: p.lng! }],
        destinations: sorted.map((h) => ({ lat: h.lat, lng: h.lng })),
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: { departureTime: nextWeekdayAt9(), trafficModel: google.maps.TrafficModel.BEST_GUESS },
      });
      const out: Mins = {};
      res.rows[0].elements.forEach((e, i) => {
        const d = e.duration_in_traffic || e.duration;
        out[sorted[i].id] = e.status === 'OK' && d ? Math.round(d.value / 60) : null;
      });
      onDone(out);
    } catch {
      setErr("Couldn't get drive times right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-quiet" onClick={load} disabled={busy || !routes}>
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
