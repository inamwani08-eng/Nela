import type { ReactNode, SVGProps } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useLists } from '../lib/shortlist';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 18): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
});

export const Icon = {
  search: ({ size, ...p }: IconProps) => (<svg {...base(size)} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>),
  check: ({ size, ...p }: IconProps) => (<svg {...base(size)} strokeWidth={2.6} {...p}><path d="M20 6 9 17l-5-5" /></svg>),
  clock: ({ size, ...p }: IconProps) => (<svg {...base(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>),
  bookmark: ({ size, ...p }: IconProps) => (<svg {...base(size)} {...p}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>),
  train: ({ size, ...p }: IconProps) => (<svg {...base(size)} {...p}><rect x="5" y="3" width="14" height="14" rx="3" /><path d="M5 11h14M9 21l-2-4M15 21l2-4" /><circle cx="9" cy="14" r=".6" fill="currentColor" /><circle cx="15" cy="14" r=".6" fill="currentColor" /></svg>),
  star: ({ size, ...p }: IconProps) => (<svg {...base(size)} fill="currentColor" stroke="none" {...p}><path d="m12 2 3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z" /></svg>),
  map: ({ size, ...p }: IconProps) => (<svg {...base(size)} {...p}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></svg>),
  list: ({ size, ...p }: IconProps) => (<svg {...base(size)} {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>),
  filter: ({ size, ...p }: IconProps) => (<svg {...base(size)} {...p}><path d="M3 5h18M6 12h12M10 19h4" /></svg>),
  x: ({ size, ...p }: IconProps) => (<svg {...base(size)} {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>),
  arrow: ({ size, ...p }: IconProps) => (<svg {...base(size)} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>),
  back: ({ size, ...p }: IconProps) => (<svg {...base(size)} {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>),
  external: ({ size, ...p }: IconProps) => (<svg {...base(size)} {...p}><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>),
  shield: ({ size, ...p }: IconProps) => (<svg {...base(size)} {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>),
  warn: ({ size, ...p }: IconProps) => (<svg {...base(size)} {...p}><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17h.01" /></svg>),
  building: ({ size, ...p }: IconProps) => (<svg {...base(size)} {...p}><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M2 21h20M8 7h4M8 11h4M8 15h4" /></svg>),
  car: ({ size, ...p }: IconProps) => (<svg {...base(size)} {...p}><path d="M5 17h14M5 17v2M19 17v2M3 13l2-6a2 2 0 0 1 2-1.5h10A2 2 0 0 1 19 7l2 6v4H3z" /><circle cx="7.5" cy="14" r=".8" fill="currentColor" /><circle cx="16.5" cy="14" r=".8" fill="currentColor" /></svg>),
};

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true">
      <rect width="72" height="72" rx="18" fill="var(--canopy)" />
      <path d="M20 54V32a16 16 0 0 1 32 0v22" fill="none" stroke="var(--ground)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="36" cy="40" r="5" fill="var(--marigold)" />
    </svg>
  );
}

export function Header() {
  const { shortlist } = useLists();
  return (
    <header className="site-header">
      <div className="wrap header-row">
        <Link to="/" className="brand" aria-label="nela home">
          <Logo />
          <span className="wordmark">nela</span>
        </Link>
        <nav className="main-nav" aria-label="Main">
          <NavLink to="/new">New projects</NavLink>
          <NavLink to="/resale">Resale</NavLink>
          <NavLink to="/builders">Builders</NavLink>
          <NavLink to="/about">How we check</NavLink>
        </nav>
        <Link to="/shortlist" className="shortlist-link">
          <Icon.bookmark />
          <span>Shortlist</span>
          {shortlist.length > 0 && <span className="count-pill num">{shortlist.length}</span>}
        </Link>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-row">
        <div className="footer-brand">
          <Logo size={24} />
          <span>nela</span>
        </div>
        <p>
          Project facts come from public Karnataka RERA filings, each with its date. Ratings and reviews come live from
          Google. nela does not sell flats or share your number.
        </p>
        <Link to="/about">Sources and method</Link>
      </div>
    </footer>
  );
}

type Tone = 'green' | 'laterite' | 'metro' | 'ink' | 'plain' | 'marigold';
export function Badge({ tone = 'plain', children, icon }: { tone?: Tone; children: ReactNode; icon?: ReactNode }) {
  return (
    <span className={`badge badge-${tone}`}>
      {icon}
      {children}
    </span>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'bad' }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value num ${tone ? `tone-${tone}` : ''}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
