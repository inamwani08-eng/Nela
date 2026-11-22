import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../lib/data';
import { Badge, Empty, Icon } from '../components/ui';
import { inr, sqft } from '../lib/format';
import type { ResaleListing } from '../lib/types';

/**
 * Resale has no public register, so listings come only from owners and
 * K-RERA registered agents. RERA doesn't apply to most older buildings, so
 * the trust filters here are the occupancy certificate and khata type.
 */
export default function Resale() {
  const { resale } = useData();
  const [sp, setSp] = useSearchParams();
  const set = (k: string, v: string | null) => {
    const n = new URLSearchParams(sp);
    if (v) n.set(k, v);
    else n.delete(k);
    setSp(n, { replace: true });
  };
  const bhk = sp.get('bhk');
  const oc = sp.get('oc') === '1';
  const khata = sp.get('khata');
  const owner = sp.get('owner') === '1';
  const q = (sp.get('q') || '').toLowerCase();

  const list = useMemo(
    () =>
      resale.filter((l: ResaleListing) => {
        if (bhk && String(l.bhk) !== bhk) return false;
        if (oc && l.occupancyCertificate !== true) return false;
        if (khata && l.khata !== khata) return false;
        if (owner && l.postedBy !== 'owner') return false;
        if (q && !`${l.title} ${l.area} ${l.society}`.toLowerCase().includes(q)) return false;
        return true;
      }),
    [resale, bhk, oc, khata, owner, q],
  );

  return (
    <div className="resale-page">
      <section className="wrap resale-head">
        <div>
          <h1 className="display-sm">Resale flats</h1>
          <p className="lede small">
            Listed by owners, or by agents registered with Karnataka RERA. Older buildings were never RERA registered, so we check the
            occupancy certificate and khata instead.
          </p>
        </div>
      </section>

      <div className="filter-bar static">
        <div className="chip-row wrap">
          {['1', '2', '3', '4'].map((b) => (
            <button key={b} type="button" className={`chip chip-filter ${bhk === b ? 'on' : ''}`} aria-pressed={bhk === b} onClick={() => set('bhk', bhk === b ? null : b)}>
              {b} BHK
            </button>
          ))}
          <button type="button" className={`chip chip-filter ${oc ? 'on' : ''}`} aria-pressed={oc} onClick={() => set('oc', oc ? null : '1')}>
            {oc && <Icon.check size={14} />} Has occupancy certificate
          </button>
          {['A', 'B'].map((k) => (
            <button key={k} type="button" className={`chip chip-filter ${khata === k ? 'on' : ''}`} aria-pressed={khata === k} onClick={() => set('khata', khata === k ? null : k)}>
              {k} khata
            </button>
          ))}
          <button type="button" className={`chip chip-filter ${owner ? 'on' : ''}`} aria-pressed={owner} onClick={() => set('owner', owner ? null : '1')}>
            Owners only
          </button>
        </div>
      </div>

      <div className="wrap resale-body">
        <main>
          {resale.length === 0 ? (
            <Empty title="The first resale listings are on their way">
              <p>
                We're starting with owners who list directly and RERA-registered agents who sign our sharing agreement. Every listing will
                show the occupancy certificate, khata type and a “documents checked” badge once we've seen the papers.
              </p>
            </Empty>
          ) : list.length === 0 ? (
            <Empty title="No resale flats match"><p>Try removing a filter.</p></Empty>
          ) : (
            <div className="resale-grid">
              {list.map((l) => (
                <article key={l.id} className="resale-card">
                  <div className="badge-row">
                    {l.documentsChecked && <Badge tone="ink">Documents checked</Badge>}
                    {l.occupancyCertificate && <Badge tone="green" icon={<Icon.check size={12} />}>OC received</Badge>}
                    {l.khata !== 'unknown' && <Badge>{l.khata} khata</Badge>}
                  </div>
                  <h3>{l.title}</h3>
                  <div className="muted small">{l.society} · {l.area}</div>
                  <div className="facts num">
                    <div><div className="fact-label">Price</div><div className="fact-value">{inr(l.priceInr)}</div></div>
                    <div><div className="fact-label">Carpet</div><div className="fact-value">{sqft(l.carpetSqft)} sq ft</div></div>
                    <div><div className="fact-label">₹ / sq ft</div><div className="fact-value">{Math.round(l.priceInr / l.carpetSqft).toLocaleString('en-IN')}</div></div>
                    <div><div className="fact-label">Built</div><div className="fact-value">{l.builtYear || '—'}</div></div>
                  </div>
                  <div className="muted small">
                    {l.postedBy === 'owner' ? 'Listed by owner' : `Listed by agent, K-RERA ${l.agentReraNo}`}
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
        <aside className="panel resale-side">
          <h2>Selling your flat?</h2>
          <p>List it free, straight from you. Buyers see your flat's facts, not your phone number, until you choose to reply.</p>
          <ul className="todo">
            <li>Occupancy certificate (if the building has one)</li>
            <li>Khata certificate and extract</li>
            <li>Latest encumbrance certificate</li>
          </ul>
          <p className="fine">We check documents privately. Only a “documents checked” badge is shown publicly, and files are shared only with signed-in buyers you approve.</p>
          <a className="btn btn-primary full" href="mailto:?subject=List%20my%20flat%20on%20nela">Tell us about your flat</a>
          <h3 className="side-h">Agents</h3>
          <p className="small">We work with agents registered with Karnataka RERA, and show your agent number on every listing.</p>
        </aside>
      </div>
    </div>
  );
}
