import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../lib/data';
import { activeCount, applyFilters, EMPTY, fromParams, parseQuery, toParams, type Filters } from '../lib/filters';
import { ProjectCard } from '../components/ProjectCard';
import { MapView } from '../components/MapView';
import { CompareTray } from '../components/CompareTray';
import { Empty, Icon } from '../components/ui';

const PAGE = 30;
const YEAR = new Date().getFullYear();

function Pop({ label, on, children }: { label: ReactNode; on: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  return (
    <details className="pop" ref={ref}>
      <summary className={`chip chip-filter ${on ? 'on' : ''}`}>
        {label} <span aria-hidden="true">▾</span>
      </summary>
      <div className="pop-body">{children}</div>
    </details>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`chip chip-filter ${on ? 'on' : ''}`} aria-pressed={on} onClick={onClick}>
      {on && <Icon.check size={14} />} {children}
    </button>
  );
}

export default function Search() {
  const { projects, meta, loading, error } = useData();
  const [sp, setSp] = useSearchParams();
  const f = useMemo(() => fromParams(sp), [sp]);
  const set = (patch: Partial<Filters>) => setSp(toParams({ ...f, ...patch }), { replace: true });
  const [text, setText] = useState(f.q);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [hover, setHover] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => setLimit(PAGE), [sp]);

  const hubs = meta?.hubs || [];
  const hub = hubs.find((h) => h.id === f.hub) || null;
  const results = useMemo(() => applyFilters(projects, f), [projects, f]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseQuery(text, hubs);
    setSp(toParams({ ...f, ...parsed, sort: parsed.hub ? 'hub' : f.sort }), { replace: true });
    setText(parsed.q || '');
  };

  const carpetLabel = f.cmin || f.cmax ? `${f.cmin || 0}–${f.cmax || '∞'} sq ft` : 'Carpet area';

  return (
    <div className="search-page">
      <div className="filter-bar">
        <form className="filter-search" onSubmit={onSearch} role="search">
          <label htmlFor="sq" className="sr-only">Search projects</label>
          <Icon.search />
          <input id="sq" value={text} onChange={(e) => setText(e.target.value)} placeholder="Project, area, builder, or “3 BHK near Whitefield”" />
        </form>
        <div className="chip-row">
          <Pop label={f.by ? `Possession by ${f.by}` : 'Possession'} on={!!f.by}>
            <div className="opt-grid">
              {[YEAR, YEAR + 1, YEAR + 2, YEAR + 3, YEAR + 4].map((y) => (
                <button key={y} type="button" className={`opt ${f.by === y ? 'on' : ''}`} onClick={() => set({ by: f.by === y ? null : y })}>
                  By Dec {y}
                </button>
              ))}
            </div>
          </Pop>
          <Toggle on={f.ready} onClick={() => set({ ready: !f.ready })}>Ready or due now</Toggle>
          <Pop label={f.bhk.length ? `${f.bhk.map((b) => (b === 0 ? 'Studio' : b)).join(', ')} BHK` : 'BHK'} on={f.bhk.length > 0}>
            <div className="opt-grid">
              {[1, 2, 3, 4, 5].map((b) => (
                <button key={b} type="button" className={`opt ${f.bhk.includes(b) ? 'on' : ''}`} aria-pressed={f.bhk.includes(b)}
                  onClick={() => set({ bhk: f.bhk.includes(b) ? f.bhk.filter((x) => x !== b) : [...f.bhk, b].sort() })}>
                  {b === 5 ? '5+' : b} BHK
                </button>
              ))}
            </div>
          </Pop>
          <Pop label={carpetLabel} on={!!(f.cmin || f.cmax)}>
            <div className="range-form">
              <label>Min sq ft<input type="number" inputMode="numeric" min={0} step={50} defaultValue={f.cmin ?? ''} onBlur={(e) => set({ cmin: +e.target.value || null })} /></label>
              <label>Max sq ft<input type="number" inputMode="numeric" min={0} step={50} defaultValue={f.cmax ?? ''} onBlur={(e) => set({ cmax: +e.target.value || null })} /></label>
            </div>
            <p className="fine">RERA carpet area: the usable floor inside your walls.</p>
          </Pop>
          <Pop label={hub ? `≤ ${f.hubKm || 10} km to ${hub.name}` : 'Near my office'} on={!!hub}>
            <div className="opt-list">
              {hubs.map((h) => (
                <button key={h.id} type="button" className={`opt ${f.hub === h.id ? 'on' : ''}`} onClick={() => set(f.hub === h.id ? { hub: null, hubKm: null, sort: 'possession' } : { hub: h.id, hubKm: f.hubKm || 10, sort: 'hub' })}>
                  {h.name}
                </button>
              ))}
            </div>
            {hub && (
              <label className="slider">
                Within {f.hubKm || 10} km
                <input type="range" min={3} max={30} step={1} value={f.hubKm || 10} onChange={(e) => set({ hubKm: +e.target.value })} />
              </label>
            )}
          </Pop>
          <Toggle on={!!f.metroKm} onClick={() => set({ metroKm: f.metroKm ? null : 2 })}>Metro within 2 km</Toggle>
          <Toggle on={f.onTime} onClick={() => set({ onTime: !f.onTime })}>No extensions</Toggle>
          {activeCount(f) > 0 && (
            <button type="button" className="link-btn" onClick={() => { setText(''); setSp(toParams(EMPTY)); }}>
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="results-layout">
        <main className={`results-col ${view === 'map' ? 'hide-mobile' : ''}`}>
          <div className="results-head">
            <div>
              <span className="results-count num">{loading ? 'Loading…' : `${results.length.toLocaleString('en-IN')} projects`}</span>
              {!loading && <span className="muted"> match, RERA registered</span>}
            </div>
            <label className="sort">
              Sort
              <select value={f.sort} onChange={(e) => set({ sort: e.target.value as Filters['sort'] })}>
                <option value="possession">Ready first, then soonest</option>
                {f.hub && <option value="hub">Closest to {hub?.name}</option>}
                <option value="builder">Builder's delivery record</option>
                <option value="carpet">Largest carpet area</option>
                <option value="newest">Newest RERA approval</option>
              </select>
            </label>
          </div>
          {error && <Empty title="Couldn't load projects">{error}</Empty>}
          {!loading && !error && results.length === 0 && (
            <Empty title="No projects match all of that">
              <p>Try a later possession year, a wider distance, or fewer filters.</p>
            </Empty>
          )}
          <div className="result-list">
            {results.slice(0, limit).map((p) => (
              <ProjectCard key={p.id} p={p} hubId={f.hub} hubName={hub?.name} active={hover === p.id} onHover={setHover} />
            ))}
          </div>
          {results.length > limit && (
            <button type="button" className="btn btn-quiet more-btn" onClick={() => setLimit((l) => l + PAGE)}>
              Show {Math.min(PAGE, results.length - limit)} more
            </button>
          )}
        </main>
        <aside className={`map-col ${view === 'list' ? 'hide-mobile' : ''}`} aria-label="Map of results">
          <MapView projects={results} hub={hub} hubKm={f.hubKm} activeId={hover} onHover={setHover} />
        </aside>
      </div>

      <button type="button" className="view-toggle" onClick={() => setView(view === 'list' ? 'map' : 'list')}>
        {view === 'list' ? <><Icon.map /> Map</> : <><Icon.list /> List</>}
      </button>
      <CompareTray />
    </div>
  );
}
