// Geometry helpers. Distances are straight-line ("as the crow flies");
// the site labels them that way and fetches live drive times on demand.

export const inBangalore = (lat, lng) => lat > 12.6 && lat < 13.45 && lng > 77.2 && lng < 78.0;

export function km(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearest(point, places) {
  let best = null;
  for (const p of places) {
    const d = km(point, p);
    if (!best || d < best.km) best = { ...p, km: d };
  }
  return best;
}
