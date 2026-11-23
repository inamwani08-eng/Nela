import { useEffect, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { hasMaps } from '../lib/maps';
import { Icon } from './ui';

interface Review {
  rating: number | null;
  text: string | null;
  author: string | null;
  authorUri: string | null;
  when: string | null;
}
interface PlaceData {
  rating: number | null;
  count: number | null;
  url: string | null;
  reviews: Review[];
}

/**
 * Ratings and reviews are fetched live from Google for each view (never
 * stored), and shown with Google's attribution and each author's name.
 */
function LiveReviews({ placeId }: { placeId: string }) {
  const places = useMapsLibrary('places');
  const [data, setData] = useState<PlaceData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!places) return;
    let gone = false;
    const place = new places.Place({ id: placeId });
    place
      .fetchFields({ fields: ['rating', 'userRatingCount', 'reviews', 'googleMapsURI'] })
      .then(() => {
        if (gone) return;
        setData({
          rating: place.rating ?? null,
          count: place.userRatingCount ?? null,
          url: place.googleMapsURI ?? null,
          reviews: (place.reviews || []).slice(0, 3).map((r) => ({
            rating: r.rating ?? null,
            text: r.text ?? null,
            author: r.authorAttribution?.displayName ?? null,
            authorUri: r.authorAttribution?.uri ?? null,
            when: r.relativePublishTimeDescription ?? null,
          })),
        });
      })
      .catch(() => !gone && setFailed(true));
    return () => {
      gone = true;
    };
  }, [places, placeId]);

  if (failed) return <p className="muted">Couldn't load Google reviews right now.</p>;
  if (!data) return <div className="skeleton" style={{ height: 120 }} />;
  if (!data.count) return <p className="muted">No Google reviews yet.</p>;
  return (
    <div className="reviews">
      <div className="rating-head num">
        <span className="rating-big">{data.rating?.toFixed(1)}</span>
        <span className="stars" aria-label={`${data.rating} out of 5`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Icon.star key={i} size={16} className={i <= Math.round(data.rating || 0) ? 'star-on' : 'star-off'} />
          ))}
        </span>
        <span className="muted">{data.count.toLocaleString('en-IN')} reviews</span>
      </div>
      <ul className="review-list">
        {data.reviews.map((r, i) => (
          <li key={i}>
            <div className="review-meta">
              {r.authorUri ? (
                <a href={r.authorUri} target="_blank" rel="noopener noreferrer">{r.author}</a>
              ) : (
                <span>{r.author}</span>
              )}
              <span className="muted">· {r.rating}★ · {r.when}</span>
            </div>
            {r.text && <p>{r.text.length > 280 ? `${r.text.slice(0, 280)}…` : r.text}</p>}
          </li>
        ))}
      </ul>
      <div className="google-attr">
        <span>Reviews from Google</span>
        {data.url && (
          <a href={data.url} target="_blank" rel="noopener noreferrer">
            Read all on Google Maps <Icon.external size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

export function GoogleReviews({ placeId }: { placeId: string | null }) {
  if (!placeId) return <p className="muted">No Google reviews yet. Many new and under-construction projects don't have a Google listing.</p>;
  if (!hasMaps()) return <p className="muted">Google reviews appear once a Google Maps key is configured.</p>;
  return <LiveReviews placeId={placeId} />;
}
