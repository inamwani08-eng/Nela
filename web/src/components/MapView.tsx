import { useEffect, useMemo } from 'react';
import { AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps';
import { useNavigate } from 'react-router-dom';
import type { Hub, Project } from '../lib/types';
import { BANGALORE, MAP_ID, hasMaps } from '../lib/maps';
import { monthYear } from '../lib/format';

interface Props {
  projects: Project[];
  hub?: Hub | null;
  hubKm?: number | null;
  activeId?: string | null;
  onHover?: (id: string | null) => void;
  height?: number | string;
  zoom?: number;
  center?: { lat: number; lng: number };
}

function Rings({ hub, km }: { hub: Hub; km: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !window.google) return;
    const circles = [km, km * 0.6, km * 0.3].map(
      (r, i) =>
        new google.maps.Circle({
          map,
          center: hub,
          radius: r * 1000,
          strokeOpacity: 0,
          fillColor: '#0E6B4E',
          fillOpacity: [0.08, 0.1, 0.14][i],
          clickable: false,
        }),
    );
    return () => circles.forEach((c) => c.setMap(null));
  }, [map, hub, km]);
  return null;
}

function FitTo({ projects }: { projects: Project[] }) {
  const map = useMap();
  const key = projects.map((p) => p.id).join(',');
  useEffect(() => {
    if (!map || !window.google || !projects.length) return;
    const b = new google.maps.LatLngBounds();
    projects.forEach((p) => p.lat && b.extend({ lat: p.lat, lng: p.lng! }));
    map.fitBounds(b, 48);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export function MapView({ projects, hub, hubKm, activeId, onHover, height = '100%', zoom = 11, center }: Props) {
  const nav = useNavigate();
  const pins = useMemo(() => projects.filter((p) => p.lat && p.lng).slice(0, 400), [projects]);
  if (!hasMaps()) {
    return (
      <div className="map-fallback" style={{ height }}>
        <p>The map appears once a Google Maps key is configured for this site.</p>
      </div>
    );
  }
  return (
    <div className="map-box" style={{ height }}>
      <Map
        mapId={MAP_ID}
        defaultCenter={center || hub || BANGALORE}
        defaultZoom={zoom}
        gestureHandling="cooperative"
        disableDefaultUI
        zoomControl
        clickableIcons={false}
      >
        {!center && pins.length > 1 && <FitTo projects={pins} />}
        {hub && hubKm && <Rings hub={hub} km={hubKm} />}
        {hub && (
          <AdvancedMarker position={hub} zIndex={1000} title={hub.name}>
            <div className="hub-pin">{hub.name}</div>
          </AdvancedMarker>
        )}
        {pins.map((p) => (
          <AdvancedMarker
            key={p.id}
            position={{ lat: p.lat!, lng: p.lng! }}
            title={p.name}
            zIndex={p.id === activeId ? 999 : undefined}
            onClick={() => nav(`/project/${p.id}`)}
          >
            <div
              className={`map-pin num ${p.id === activeId ? 'is-active' : ''} ${p.readyState === 'completed' ? 'is-ready' : ''}`}
              onMouseEnter={() => onHover?.(p.id)}
              onMouseLeave={() => onHover?.(null)}
            >
              {p.readyState === 'completed' ? 'Done' : monthYear(p.possession).replace(/^\w+ /, '')}
            </div>
          </AdvancedMarker>
        ))}
      </Map>
    </div>
  );
}
