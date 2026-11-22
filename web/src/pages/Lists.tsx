import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useData } from '../lib/data';
import { useLists } from '../lib/shortlist';
import { ProjectCard } from '../components/ProjectCard';
import { CompareTray } from '../components/CompareTray';
import { Empty, Stat } from '../components/ui';
import { monthYear } from '../lib/format';

export function Shortlist() {
  const { projects } = useData();
  const { shortlist } = useLists();
  const ps = shortlist.map((id) => projects.find((p) => p.id === id)).filter(Boolean);
  return (
    <div className="wrap section narrow">
      <h1 className="display-sm">Your shortlist</h1>
      <p className="muted">Saved in this browser only. No account needed.</p>
      {ps.length === 0 ? (
        <Empty title="Nothing saved yet">
          <p>Tap the bookmark on any project to keep it here.</p>
          <Link className="btn btn-primary" to="/new">Find projects</Link>
        </Empty>
      ) : (
        <div className="result-list">{ps.map((p) => <ProjectCard key={p!.id} p={p!} />)}</div>
      )}
      <CompareTray />
    </div>
  );
}

export function Builders() {
  const { projects } = useData();
  const [q, setQ] = useState('');
  const builders = useMemo(() => {
    const m = new Map<string, { key: string; name: string; live: number; stats: (typeof projects)[number]['builderStats'] }>();
    for (const p of projects) {
      const e = m.get(p.builderKey) || { key: p.builderKey, name: p.builder, live: 0, stats: p.builderStats };
      e.live++;
      m.set(p.builderKey, e);
    }
    return [...m.values()]
      .filter((b) => b.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (b.stats?.projects || 0) - (a.stats?.projects || 0));
  }, [projects, q]);
  return (
    <div className="wrap section narrow">
      <h1 className="display-sm">Builders, by their record</h1>
      <p className="muted">Worked out from every Bangalore project each builder has registered with Karnataka RERA: how often they asked for more time, and how much.</p>
      <label className="sr-only" htmlFor="bq">Find a builder</label>
      <input id="bq" className="text-input" placeholder="Find a builder" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="table-scroll">
        <table className="builders num">
          <thead>
            <tr><th scope="col">Builder</th><th scope="col">RERA projects</th><th scope="col">Got an extension</th><th scope="col">Average delay</th><th scope="col">Listed now</th></tr>
          </thead>
          <tbody>
            {builders.slice(0, 200).map((b) => (
              <tr key={b.key}>
                <td><Link to={`/builders/${encodeURIComponent(b.key)}`}>{b.name}</Link></td>
                <td>{b.stats?.projects ?? '—'}</td>
                <td>{b.stats?.extendedShare != null ? `${b.stats.extendedShare}%` : '—'}</td>
                <td className={b.stats?.avgDelayMonths != null && b.stats.avgDelayMonths > 12 ? 'tone-bad' : ''}>{b.stats?.avgDelayMonths != null ? `${b.stats.avgDelayMonths} mo` : '—'}</td>
                <td>{b.live}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BuilderPage() {
  const { key } = useParams();
  const { projects } = useData();
  const ps = projects.filter((p) => p.builderKey === key);
  const s = ps[0]?.builderStats;
  if (!ps.length) return <div className="wrap section"><Empty title="No current projects from this builder"><Link to="/builders">All builders</Link></Empty></div>;
  return (
    <div className="wrap section narrow">
      <Link to="/builders" className="small">All builders</Link>
      <h1 className="display-sm">{ps[0].builder}</h1>
      {s && (
        <div className="stat-grid">
          <Stat label="RERA projects in Bangalore" value={s.projects} />
          <Stat label="Got an extension" value={s.extendedShare != null ? `${s.extendedShare}%` : '—'} />
          <Stat label="Average delay" value={s.avgDelayMonths != null ? `${s.avgDelayMonths} mo` : '—'} tone={s.avgDelayMonths != null && s.avgDelayMonths <= 3 ? 'good' : s.avgDelayMonths != null && s.avgDelayMonths > 12 ? 'bad' : undefined} />
        </div>
      )}
      <h2>Current and recent projects</h2>
      <p className="muted small">Due between {monthYear(ps[0].possession)} and {monthYear(ps[ps.length - 1].possession)}</p>
      <div className="result-list">{ps.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
      <CompareTray />
    </div>
  );
}
