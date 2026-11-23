import { Link } from 'react-router-dom';
import { useData } from '../lib/data';
import { useLists } from '../lib/shortlist';
import { Empty, Icon } from '../components/ui';
import { bhkLabel, delayText, km, possessionText, sqftRange } from '../lib/format';
import type { Project } from '../lib/types';

type Row = { label: string; get: (p: Project) => string; best?: (ps: Project[]) => string | null };

export default function Compare() {
  const { projects, meta } = useData();
  const { compare, toggleCompare } = useLists();
  const ps = compare.map((id) => projects.find((p) => p.id === id)).filter(Boolean) as Project[];
  if (ps.length < 2) {
    return (
      <div className="wrap section">
        <Empty title="Pick two to four projects to compare">
          <p>Tick “Compare” on any project in search results.</p>
          <Link to="/new" className="btn btn-primary">Find projects</Link>
        </Empty>
      </div>
    );
  }
  const minBy = (f: (p: Project) => number | null) => (list: Project[]) => {
    const vals = list.map((p) => ({ id: p.id, v: f(p) })).filter((x) => x.v != null) as { id: string; v: number }[];
    if (vals.length < 2) return null;
    const m = Math.min(...vals.map((x) => x.v));
    return vals.filter((x) => x.v === m).length === 1 ? vals.find((x) => x.v === m)!.id : null;
  };
  const rows: Row[] = [
    { label: 'Area', get: (p) => `${p.area}, ${p.taluk}` },
    { label: 'Builder', get: (p) => p.builder },
    { label: 'Homes', get: (p) => bhkLabel(p.bhk) },
    { label: 'Carpet area (sq ft)', get: (p) => sqftRange(p.carpetMin, p.carpetMax) },
    { label: 'Possession', get: (p) => possessionText(p), best: minBy((p) => (p.ready ? 0 : Date.parse(p.possession || '2100-01-01'))) },
    { label: 'Extensions', get: (p) => delayText(p.delayMonths), best: minBy((p) => p.delayMonths) },
    { label: "Builder's average delay", get: (p) => (p.builderStats?.avgDelayMonths != null ? `${p.builderStats.avgDelayMonths} months` : '—'), best: minBy((p) => p.builderStats?.avgDelayMonths ?? null) },
    { label: 'Nearest metro', get: (p) => (p.metro ? `${p.metro.name}, ${km(p.metro.km)}` : '—'), best: minBy((p) => p.metro?.km ?? null) },
    ...(meta?.hubs || []).slice(0, 5).map((h) => ({ label: `To ${h.name}`, get: (p: Project) => km(p.hubKm[h.id]), best: minBy((p) => p.hubKm[h.id] ?? null) })),
    { label: 'Total flats', get: (p) => (p.totalUnits ? String(p.totalUnits) : '—') },
    { label: 'Land', get: (p) => (p.landAcres ? `${p.landAcres} acres` : '—') },
    { label: 'Plan approved by', get: (p) => p.authority || '—' },
  ];
  return (
    <div className="wrap section compare-page">
      <h1 className="display-sm">Side by side</h1>
      <p className="muted">Marigold marks the best of the row where there's a clear winner.</p>
      <div className="table-scroll">
        <table className="compare-table num">
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Detail</span></th>
              {ps.map((p) => (
                <th key={p.id} scope="col">
                  <Link to={`/project/${p.id}`}>{p.name}</Link>
                  <button type="button" className="icon-btn small" aria-label={`Remove ${p.name}`} onClick={() => toggleCompare(p.id)}>
                    <Icon.x size={14} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const best = r.best?.(ps);
              return (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  {ps.map((p) => (
                    <td key={p.id} className={best === p.id ? 'best' : ''}>{r.get(p)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
