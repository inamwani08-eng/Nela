import { Link } from 'react-router-dom';
import { useData } from '../lib/data';
import { fullDate } from '../lib/format';

export default function About() {
  const { meta } = useData();
  return (
    <div className="wrap section prose">
      <h1 className="display-sm">How we check every project</h1>
      <p className="lede small">
        nela is a research tool, not a classifieds board. Every fact on a project page comes from a public record, and we say which one.
      </p>

      <h2>Karnataka RERA</h2>
      <p>
        We read the public project register at rera.karnataka.gov.in for Bengaluru Urban and Bengaluru Rural, slowly, every night:
        registration number, status, possession dates and every extension, carpet area by flat type, and location. We keep project facts only. Personal details in filings (such as partners' and land owners' names, PAN and
        addresses) are never stored or shown.
      </p>
      {meta && (
        <p className="muted">
          Last checked with RERA on {fullDate(meta.reraListFetchedAt.slice(0, 10))}. {meta.counts.reraProjectsListed.toLocaleString('en-IN')} filings
          read, {meta.counts.onSite.toLocaleString('en-IN')} housing projects shown (approved, residential, finishing in the last 2½ years or later).
        </p>
      )}

      <h2>Possession dates and delays</h2>
      <p>
        “Promised” is the completion date the builder gave when the project was registered. “Current” is the latest date on RERA after
        COVID, Section 6 and further extensions. A builder's average delay is worked out the same way across all their Bangalore RERA
        projects.
      </p>

      <h2>Google</h2>
      <p>
        Ratings and reviews are fetched live from Google when you open a project, and shown with Google's attribution. Many projects
        under construction have no Google listing yet; we say so rather than show a nearby place. Drive times are Google's estimate for
        the next weekday at 9 AM. Where RERA lacks coordinates we locate the project from its RERA address with Google, and mark the
        location as approximate. Metro stations are from Google Maps.
      </p>

      <h2>What we don't have yet</h2>
      <p>
        Prices and photos aren't on RERA. They'll come from builders who agree to share them. Resale listings come only from owners and
        Karnataka RERA registered agents.
      </p>
      <p><Link to="/new">Start searching</Link></p>
    </div>
  );
}
