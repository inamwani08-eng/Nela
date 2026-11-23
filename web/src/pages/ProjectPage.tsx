import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../lib/data';
import { useLists, MAX_COMPARE } from '../lib/shortlist';
import { Badge, Empty, Icon, Stat } from '../components/ui';
import { Cover } from '../components/ProjectCard';
import { MapView } from '../components/MapView';
import { GoogleReviews } from '../components/GoogleReviews';
import { DriveTimes } from '../components/DriveTimes';
import { CompareTray } from '../components/CompareTray';
import { bhkLabel, delayText, fullDate, km, monthYear, reraCertificateUrl, readyLabel, sqftRange } from '../lib/format';
import type { Project } from '../lib/types';

function Timeline({ p }: { p: Project }) {
  const start = p.startDate || p.approvedOn;
  const points = [
    { label: 'Construction start', date: start },
    { label: 'Promised at RERA registration', date: p.possessionAtReg },
    ...(p.delayMonths > 0 ? [{ label: 'Current RERA date', date: p.possession, late: true }] : []),
  ].filter((x) => x.date) as { label: string; date: string; late?: boolean }[];
  const today = new Date().toISOString().slice(0, 10);
  const all = [...points.map((x) => x.date), today].sort();
  const t0 = Date.parse(all[0]);
  const t1 = Date.parse(all[all.length - 1]);
  const pos = (d: string) => (t1 === t0 ? 0 : ((Date.parse(d) - t0) / (t1 - t0)) * 100);
  return (
    <div className="timeline" role="img" aria-label={`Promised ${monthYear(p.possessionAtReg)}, current date ${monthYear(p.possession)}`}>
      <div className="tl-track">
        <div className="tl-fill" style={{ width: `${Math.min(100, pos(today))}%` }} />
        {p.delayMonths > 0 && p.possessionAtReg && p.possession && (
          <div className="tl-late" style={{ left: `${pos(p.possessionAtReg)}%`, width: `${pos(p.possession) - pos(p.possessionAtReg)}%` }} />
        )}
        {points.map((x) => (
          <div key={x.label} className={`tl-dot ${x.late ? 'late' : ''}`} style={{ left: `${pos(x.date)}%` }} />
        ))}
        <div className="tl-today" style={{ left: `${pos(today)}%` }}><span>Today</span></div>
      </div>
      <div className="tl-labels">
        {points.map((x) => (
          <div key={x.label} className={x.late ? 'tone-bad' : ''}>
            <span className="muted small">{x.label}</span>
            <b className="num">{monthYear(x.date)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { projects, meta, loading } = useData();
  const { shortlist, toggleShortlist, compare, toggleCompare } = useLists();
  const p = projects.find((x) => x.id === id);
  useEffect(() => {
    if (p) document.title = `${p.name}, ${p.area} · nela`;
    window.scrollTo(0, 0);
  }, [p]);

  if (loading) return <div className="wrap section"><div className="skeleton" style={{ height: 320 }} /></div>;
  if (!p) return <div className="wrap section"><Empty title="We couldn't find that project"><Link to="/new">Back to search</Link></Empty></div>;

  const b = p.builderStats;
  const saved = shortlist.includes(p.id);
  const inCompare = compare.includes(p.id);
  const hubs = meta?.hubs || [];
  const unitsOk = p.units.filter((u) => u.carpetMin);

  return (
    <div className="project-page">
      <div className="wrap crumbs">
        <button type="button" className="link-btn" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/new'))}>
          <Icon.back size={16} /> Back to results
        </button>
      </div>

      <section className="wrap project-head">
        <div className="project-title">
          <div className="badge-row">
            {p.reg && (
              <a className="badge badge-green" href={reraCertificateUrl(p.reg)} target="_blank" rel="noopener noreferrer">
                <Icon.check size={12} /> RERA {p.reg} <Icon.external size={12} />
              </a>
            )}
            {p.metro && p.metro.km <= 3 && <Badge tone="metro" icon={<Icon.train size={12} />}>{p.metro.name} metro · {km(p.metro.km)}</Badge>}
            <Badge tone={p.readyState === 'completed' ? 'ink' : 'plain'}>{readyLabel(p.readyState)}</Badge>
          </div>
          <h1 className="display-sm">{p.name}</h1>
          <p className="muted">
            {p.area}, {p.taluk} · by {p.builder}
            {p.landAcres ? ` · ${p.landAcres} acres` : ''}
            {p.towers ? ` · ${p.towers} tower${p.towers > 1 ? 's' : ''}` : ''}
            {p.totalUnits ? ` · ${p.totalUnits} flats` : ''}
          </p>
        </div>
        <div className="project-actions">
          <button type="button" className={`btn ${saved ? 'btn-primary' : 'btn-quiet'}`} aria-pressed={saved} onClick={() => toggleShortlist(p.id)}>
            <Icon.bookmark /> {saved ? 'Shortlisted' : 'Shortlist'}
          </button>
          <button type="button" className="btn btn-quiet" aria-pressed={inCompare} disabled={!inCompare && compare.length >= MAX_COMPARE} onClick={() => toggleCompare(p.id)}>
            {inCompare ? 'In compare' : 'Add to compare'}
          </button>
        </div>
      </section>

      <section className="wrap project-hero-grid">
        <div className="project-cover"><Cover p={p} height={300} /></div>
        <div className="project-map">
          {p.lat ? (
            <MapView projects={[p]} center={{ lat: p.lat, lng: p.lng! }} zoom={14} height={300} />
          ) : (
            <div className="map-fallback" style={{ height: 300 }}><p>RERA doesn't list this project's location yet.</p></div>
          )}
          {p.coordSource === 'approximate' && <p className="fine">Location approximate, from the RERA address.</p>}
        </div>
      </section>

      <div className="wrap project-layout">
        <main className="project-main">
          <section className="panel">
            <div className="panel-head">
              <h2>When will it be ready?</h2>
              <span className="muted small">From RERA filings{p.detailFetchedAt ? ` · checked ${fullDate(p.detailFetchedAt.slice(0, 10))}` : ''}</span>
            </div>
            <Timeline p={p} />
            <div className="stat-grid">
              <Stat label="RERA possession date" value={p.readyState === 'completed' ? 'Completed' : monthYear(p.possession)} tone={p.readyState === 'completed' ? 'good' : undefined} sub={p.reraStatus ? `RERA status: ${p.reraStatus}` : undefined} />
              <Stat label="Extensions filed" value={p.extensions ? `${p.extensions}` : 'None'} tone={p.delayMonths > 0 ? 'bad' : 'good'} sub={delayText(p.delayMonths)} />
              <Stat label="Builder's average delay" value={b && b.avgDelayMonths != null ? `${b.avgDelayMonths} mo` : '—'} tone={b && b.avgDelayMonths != null ? (b.avgDelayMonths <= 3 ? 'good' : b.avgDelayMonths > 12 ? 'bad' : undefined) : undefined} sub={b ? `Across ${b.projects} RERA project${b.projects > 1 ? 's' : ''}` : undefined} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Homes in this project</h2>
              <span className="muted small">Carpet area as filed with RERA</span>
            </div>
            {unitsOk.length ? (
              <div className="table-scroll">
                <table className="units num">
                  <thead>
                    <tr><th scope="col">Type</th><th scope="col">Flats</th><th scope="col">Carpet area (sq ft)</th></tr>
                  </thead>
                  <tbody>
                    {unitsOk.map((u, i) => (
                      <tr key={i}><td>{u.type}</td><td>{u.count ?? '—'}</td><td>{sqftRange(u.carpetMin, u.carpetMax)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">The builder's RERA filing doesn't break down flat sizes.</p>
            )}
            <p className="fine">Prices aren't on RERA. Ask the builder for the price per sq ft of carpet area, and compare it with the “super built-up” price they quote.</p>
          </section>

          <div className="two-col">
            <section className="panel">
              <h2>Distance from work</h2>
              <DriveTimes p={p} hubs={hubs} />
            </section>
            <section className="panel">
              <h2>What residents say</h2>
              <GoogleReviews placeId={p.placeId} />
            </section>
          </div>

          <section className="panel builder-panel">
            <div>
              <h2>{p.builder}</h2>
              {b ? (
                <p className="muted">
                  {b.projects} project{b.projects > 1 ? 's' : ''} registered with Karnataka RERA in Bangalore · {b.finished} past their completion date
                </p>
              ) : (
                <p className="muted">No other RERA projects on record.</p>
              )}
              <Link to={`/builders/${encodeURIComponent(p.builderKey)}`}>See all their projects</Link>
            </div>
            {b && (
              <div className="stat-grid">
                <Stat label="Projects" value={b.projects} />
                <Stat label="Got an extension" value={b.extendedShare != null ? `${b.extendedShare}%` : '—'} />
                <Stat label="Average delay" value={b.avgDelayMonths != null ? `${b.avgDelayMonths} mo` : '—'} />
              </div>
            )}
          </section>
        </main>

        <aside className="project-side">
          <section className="panel sticky">
            <div className="muted small">{bhkLabel(p.bhk)}</div>
            <div className="side-big num">{sqftRange(p.carpetMin, p.carpetMax)}<span> sq ft carpet</span></div>
            <h3 className="side-h">Checks</h3>
            <ul className="checks">
              <li><span>RERA registration</span><b className="tone-good"><Icon.check size={14} /> Approved {p.approvedOn ? monthYear(p.approvedOn) : ''}</b></li>
              <li><span>Possession date</span>{p.delayMonths > 0 ? <b className="tone-bad">{delayText(p.delayMonths)}</b> : <b className="tone-good">Unchanged</b>}</li>
              <li><span>Plan approved by</span><b>{p.authority || '—'}</b></li>
              <li><span>Water source</span><b>{p.water.length ? p.water.join(', ') : '—'}</b></li>
              <li><span>Occupancy certificate</span><b>{p.ready ? 'Ask the builder for a copy' : 'Due at possession'}</b></li>
            </ul>
            {p.reg && (
              <a className="btn btn-quiet full" href={reraCertificateUrl(p.reg)} target="_blank" rel="noopener noreferrer">
                View RERA certificate <Icon.external size={14} />
              </a>
            )}
            <p className="fine">
              Source: Karnataka RERA{p.address ? `. Address filed: ${p.address}` : ''}{p.pin && !p.address?.includes(p.pin) ? ` ${p.pin}` : ''}. RERA registration {p.reg}. Always verify on rera.karnataka.gov.in before paying.
            </p>
          </section>
          <section className="panel">
            <h3 className="side-h">Before you pay a token amount</h3>
            <ul className="todo">
              <li>Pay only into the project's RERA escrow account, named on the RERA page.</li>
              <li>Get the carpet area for your exact flat in the sale agreement.</li>
              <li>Check the khata type and bank approvals for loans.</li>
            </ul>
          </section>
        </aside>
      </div>
      <CompareTray />
    </div>
  );
}
