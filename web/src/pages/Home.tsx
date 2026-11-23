import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../lib/data';
import { EMPTY, parseQuery, toParams } from '../lib/filters';
import { Badge, Icon } from '../components/ui';
import { Cover } from '../components/ProjectCard';
import { bhkLabel, monthYear, sqftRange } from '../lib/format';

const ZONES = [
  { zone: 'North', title: 'Manyata, Hebbal', sub: 'Thanisandra, Yelahanka, Hennur', hub: 'manyata' },
  { zone: 'East', title: 'Whitefield, ITPL', sub: 'KR Puram, Varthur, Budigere', hub: 'itpl' },
  { zone: 'Outer Ring Road', title: 'Bellandur, Marathahalli', sub: 'Sarjapur Road, HSR, Kadubeesanahalli', hub: 'etv' },
  { zone: 'South', title: 'Electronic City', sub: 'Hosur Road, Bommasandra, Chandapura', hub: 'ecity' },
];

const EXAMPLES = ['Ready to move, Whitefield', '2 BHK near metro', '3 BHK near Manyata, by 2027', 'Sarjapur'];

export default function Home() {
  const { projects, meta } = useData();
  const nav = useNavigate();
  const [tab, setTab] = useState<'new' | 'resale'>('new');
  const [q, setQ] = useState('');

  function go(text: string) {
    if (tab === 'resale') return nav(`/resale${text ? `?q=${encodeURIComponent(text)}` : ''}`);
    const parsed = parseQuery(text, meta?.hubs || []);
    nav(`/new?${toParams({ ...EMPTY, ...parsed, sort: parsed.hub ? 'hub' : 'possession' })}`);
  }
  const submit = (e: FormEvent) => {
    e.preventDefault();
    go(q);
  };

  const picks = useMemo(() => {
    const ready = projects.filter((p) => p.readyState === 'completed' && p.lat && p.carpetMin && p.bhk.length && p.delayMonths === 0);
    return ready.sort((a, b) => (b.totalUnits || 0) - (a.totalUnits || 0)).slice(0, 3);
  }, [projects]);

  return (
    <>
      <section className="hero wrap">
        <div className="hero-copy">
          <Badge tone="green" icon={<Icon.shield size={14} />}>Every project checked against Karnataka RERA</Badge>
          <h1 className="display">
            Every Bangalore flat,
            <br />
            <span className="canopy">checked</span> before
            <br />
            you visit.
          </h1>
          <p className="lede">
            Real carpet area, the actual possession date, the builder's delivery record and your commute. No brokers
            calling you, ever.
          </p>
          <form className="search-panel" onSubmit={submit} role="search">
            <div className="seg" role="tablist" aria-label="What are you looking for">
              <button type="button" role="tab" aria-selected={tab === 'new'} className={tab === 'new' ? 'on' : ''} onClick={() => setTab('new')}>
                New projects
              </button>
              <button type="button" role="tab" aria-selected={tab === 'resale'} className={tab === 'resale' ? 'on' : ''} onClick={() => setTab('resale')}>
                Resale
              </button>
            </div>
            <div className="search-row">
              <label htmlFor="home-q" className="sr-only">Describe the flat you want</label>
              <input id="home-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="3 BHK near Manyata, ready by 2027" autoComplete="off" />
              <button type="submit" className="btn btn-primary">
                <Icon.search /> Search
              </button>
            </div>
          </form>
          <div className="try-row">
            <span>Try:</span>
            {EXAMPLES.map((x) => (
              <button key={x} type="button" className="chip" onClick={() => go(x)}>
                {x}
              </button>
            ))}
          </div>
        </div>
        <HeroMap />
      </section>

      {meta && (
        <section className="wrap proof-strip num" aria-label="What's on nela">
          <div><b>{meta.counts.onSite.toLocaleString('en-IN')}</b><span>RERA projects you can search</span></div>
          <div><b>{meta.counts.ready.toLocaleString('en-IN')}</b><span>ready to move</span></div>
          <div><b>{meta.counts.reraProjectsListed.toLocaleString('en-IN')}</b><span>Bangalore filings read</span></div>
          <div><b>{monthYear(meta.reraListFetchedAt.slice(0, 10))}</b><span>last checked with RERA</span></div>
        </section>
      )}

      <section className="wrap section">
        <div className="section-head">
          <h2>Start from where you work</h2>
          <span className="muted">Distance rings from your office, live 9 AM traffic on every project</span>
        </div>
        <div className="zone-grid">
          {ZONES.map((z) => (
            <Link key={z.hub} className="zone-card" to={`/new?hub=${z.hub}&hubkm=10`}>
              <span className="eyebrow">{z.zone}</span>
              <span className="zone-title">{z.title}</span>
              <span className="muted">{z.sub}</span>
              <Icon.arrow className="zone-arrow" />
            </Link>
          ))}
        </div>
      </section>

      <section className="ink-band">
        <div className="wrap promise-grid">
          <div>
            <h3>Carpet area, not “super” area</h3>
            <p>We show RERA carpet area, the space you actually live in, so flats in different projects compare fairly.</p>
          </div>
          <div>
            <h3>Possession dates that tell the truth</h3>
            <p>See the date first promised to RERA, every extension filed since, and how late this builder's other projects ran.</p>
          </div>
          <div>
            <h3>Your number stays yours</h3>
            <p>Browse, shortlist and compare without signing up. Nothing you do here is passed to a builder or broker.</p>
          </div>
        </div>
      </section>

      {picks.length > 0 && (
        <section className="wrap section">
          <div className="section-head">
            <h2>Completed, with no extensions</h2>
            <Link to="/new?ready=1&ontime=1">See all</Link>
          </div>
          <div className="pick-grid">
            {picks.map((p) => (
              <Link key={p.id} to={`/project/${p.id}`} className="pick-card">
                <div className="pick-cover">
                  <Cover p={p} height={170} />
                  <Badge tone="green" icon={<Icon.check size={12} />}>RERA registered</Badge>
                </div>
                <div className="pick-body">
                  <div className="pick-title">{p.name}</div>
                  <div className="muted small">{p.area} · {p.builder}</div>
                  <div className="num small">{bhkLabel(p.bhk)} · {sqftRange(p.carpetMin, p.carpetMax)} sq ft carpet</div>
                  <div className="pick-foot">
                    <span className="num">{p.totalUnits ? `${p.totalUnits} flats` : ''}</span>
                    <span className="tone-good">Completed</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function HeroMap() {
  // Illustrative, drawn rather than a live map so the page loads instantly.
  return (
    <div className="hero-art" aria-hidden="true">
      <svg viewBox="0 0 500 500" width="100%" height="100%">
        <rect width="500" height="500" fill="var(--ink)" />
        <path d="M40 120 C140 90 220 160 300 130 S440 80 480 140" stroke="#24352E" strokeWidth="14" fill="none" />
        <path d="M60 380 C150 330 260 400 340 350 S450 300 490 340" stroke="#24352E" strokeWidth="14" fill="none" />
        <path d="M250 20 L250 480" stroke="var(--metro)" strokeWidth="4" />
        <path d="M20 260 L480 230" stroke="#3F9C6E" strokeWidth="4" />
        <circle className="ring r3" cx="280" cy="170" r="150" />
        <circle className="ring r2" cx="280" cy="170" r="95" />
        <circle className="ring r1" cx="280" cy="170" r="45" />
        <circle cx="280" cy="170" r="9" fill="var(--marigold)" />
        {[[330, 220], [210, 120], [360, 130]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="7" fill="var(--ground)" />)}
        {[[160, 300], [400, 330]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="7" fill="#55625C" />)}
      </svg>
      <div className="hero-art-label">
        <b>Your office</b>
        <span>Rings at 5, 10 and 15 km</span>
      </div>
      <div className="hero-art-card">
        <div className="hero-art-thumb" />
        <div>
          <b>RERA date vs promise</b>
          <span className="muted">Every extension, in one line</span>
        </div>
        <div className="num hero-art-km">
          <b>On time</b>
          <span className="muted">or flagged</span>
        </div>
      </div>
    </div>
  );
}
