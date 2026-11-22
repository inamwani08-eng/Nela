import { Link } from 'react-router-dom';
import type { Project } from '../lib/types';
import { bhkLabel, delayText, km, monthYear, sqftRange } from '../lib/format';
import { useLists, MAX_COMPARE } from '../lib/shortlist';
import { Badge, Icon } from './ui';

interface Props {
  p: Project;
  hubId?: string | null;
  hubName?: string;
  active?: boolean;
  onHover?: (id: string | null) => void;
}

export function Cover({ p, height = 150 }: { p: Project; height?: number }) {
  // No builder photos yet: a skyline drawn from the project's own facts
  // (tower count from RERA), so every card is distinct without stock images.
  const seed = [...p.id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 9973, 7);
  const hue = seed % 3;
  const n = Math.min(Math.max(p.towers || 2, 2), 6);
  const w = 30;
  const gap = 10;
  const x0 = 200 - (n * w + (n - 1) * gap) / 2;
  return (
    <div className={`cover cover-${hue}`} style={{ height }} aria-hidden="true">
      <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax meet" width="100%" height="100%">
        <circle cx={300 + (seed % 60)} cy={40 + (seed % 20)} r="12" className="cover-sun" />
        <rect x="0" y="150" width="400" height="10" className="cover-ground" />
        {Array.from({ length: n }).map((_, i) => {
          const h = 60 + ((seed >> i) % 6) * 14;
          const x = x0 + i * (w + gap);
          const rows = Math.floor((h - 12) / 12);
          return (
            <g key={i}>
              <rect x={x} y={150 - h} width={w} height={h} rx="3" className="cover-tower" />
              {Array.from({ length: rows }).map((__, r) => (
                <g key={r}>
                  <rect x={x + 6} y={150 - h + 8 + r * 12} width="7" height="5" rx="1" className="cover-window" />
                  <rect x={x + 17} y={150 - h + 8 + r * 12} width="7" height="5" rx="1" className="cover-window" />
                </g>
              ))}
            </g>
          );
        })}
        <path d="M0 150 Q 40 128 70 150 M330 150 Q 360 126 400 150" className="cover-tree" />
      </svg>
    </div>
  );
}

export function ProjectCard({ p, hubId, hubName, active, onHover }: Props) {
  const { compare, toggleCompare, shortlist, toggleShortlist } = useLists();
  const inCompare = compare.includes(p.id);
  const saved = shortlist.includes(p.id);
  const hubDist = hubId ? p.hubKm[hubId] : undefined;
  return (
    <article
      className={`result-card ${active ? 'is-active' : ''} ${inCompare ? 'in-compare' : ''}`}
      onMouseEnter={() => onHover?.(p.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <Link to={`/project/${p.id}`} className="result-cover" tabIndex={-1} aria-hidden="true">
        <Cover p={p} />
      </Link>
      <div className="result-body">
        <div className="badge-row">
          <Badge tone="green" icon={<Icon.check size={12} />}>RERA</Badge>
          {p.readyState === 'completed' ? <Badge tone="ink">Completed</Badge> : p.readyState === 'past-due' ? <Badge>RERA date passed</Badge> : null}
          {p.delayMonths > 0 && <Badge tone="laterite" icon={<Icon.clock size={12} />}>{delayText(p.delayMonths)}</Badge>}
          {p.metro && p.metro.km <= 2 && <Badge tone="metro" icon={<Icon.train size={12} />}>Metro {km(p.metro.km)}</Badge>}
          {p.builderStats && p.builderStats.finished >= 3 && (p.builderStats.avgDelayMonths ?? 99) <= 3 && <Badge>On-time builder</Badge>}
        </div>
        <h3 className="result-title">
          <Link to={`/project/${p.id}`}>{p.name}</Link>
        </h3>
        <div className="result-sub">
          {p.area} · {p.builder}
        </div>
        <div className="facts num">
          <div>
            <div className="fact-label">Homes</div>
            <div className="fact-value">{bhkLabel(p.bhk)}</div>
          </div>
          <div>
            <div className="fact-label">Carpet sq ft</div>
            <div className="fact-value">{sqftRange(p.carpetMin, p.carpetMax)}</div>
          </div>
          <div>
            <div className="fact-label">Possession</div>
            <div className={`fact-value ${p.readyState === 'completed' ? 'tone-good' : p.delayMonths > 0 ? 'tone-bad' : ''}`}>{p.readyState === 'completed' ? 'Completed' : monthYear(p.possession)}</div>
          </div>
          <div>
            <div className="fact-label">Size</div>
            <div className="fact-value">{p.totalUnits ? `${p.totalUnits} flats` : '—'}</div>
          </div>
        </div>
      </div>
      <div className="result-side">
        {hubDist != null ? (
          <div className="hub-dist num">
            <div className="hub-km">{hubDist < 10 ? hubDist.toFixed(1) : Math.round(hubDist)}<span> km</span></div>
            <div className="hub-label">to {hubName}</div>
          </div>
        ) : (
          <div className="hub-dist num">
            <div className="hub-km small">{p.readyState === 'completed' ? 'Done' : monthYear(p.possession)}</div>
            <div className="hub-label">{p.readyState === 'completed' ? 'completed' : 'RERA date'}</div>
          </div>
        )}
        <div className="side-actions">
          <button type="button" className={`icon-btn ${saved ? 'on' : ''}`} aria-pressed={saved} aria-label={saved ? `Remove ${p.name} from shortlist` : `Shortlist ${p.name}`} onClick={() => toggleShortlist(p.id)}>
            <Icon.bookmark />
          </button>
          <label className="compare-check">
            <input type="checkbox" checked={inCompare} disabled={!inCompare && compare.length >= MAX_COMPARE} onChange={() => toggleCompare(p.id)} />
            Compare
          </label>
        </div>
      </div>
    </article>
  );
}
