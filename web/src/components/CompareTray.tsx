import { Link } from 'react-router-dom';
import { useData } from '../lib/data';
import { useLists, MAX_COMPARE } from '../lib/shortlist';
import { Icon } from './ui';

export function CompareTray() {
  const { compare, toggleCompare, clearCompare } = useLists();
  const { projects } = useData();
  if (!compare.length) return null;
  const picked = compare.map((id) => projects.find((p) => p.id === id)).filter(Boolean);
  return (
    <div className="compare-tray" role="region" aria-label="Compare">
      <span className="tray-title num">Compare {compare.length} of {MAX_COMPARE}</span>
      <ul className="tray-items">
        {picked.map((p) => (
          <li key={p!.id}>
            {p!.name}
            <button type="button" aria-label={`Remove ${p!.name}`} onClick={() => toggleCompare(p!.id)}>
              <Icon.x size={14} />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="link-btn light" onClick={clearCompare}>Clear</button>
      <Link to="/compare" className={`btn btn-marigold ${compare.length < 2 ? 'disabled' : ''}`} aria-disabled={compare.length < 2}>
        Compare side by side
      </Link>
    </div>
  );
}
