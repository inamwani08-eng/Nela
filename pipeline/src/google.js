// Thin wrappers over Google Maps Platform web services.
// The key comes only from the GOOGLE_MAPS_API_KEY environment variable.

const KEY = process.env.GOOGLE_MAPS_API_KEY;
export const hasKey = () => !!KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function geocode(address) {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('region', 'in');
  url.searchParams.set('components', 'country:IN');
  url.searchParams.set('key', KEY);
  const res = await fetch(url);
  const j = await res.json();
  if (j.status === 'ZERO_RESULTS') return null;
  if (j.status !== 'OK') throw new Error(`Geocoding: ${j.status} ${j.error_message || ''}`);
  const r = j.results[0];
  return {
    lat: +r.geometry.location.lat.toFixed(6),
    lng: +r.geometry.location.lng.toFixed(6),
    precision: r.geometry.location_type, // ROOFTOP | RANGE_INTERPOLATED | GEOMETRIC_CENTER | APPROXIMATE
    locality: (r.address_components.find((c) => c.types.includes('sublocality_level_1')) || r.address_components.find((c) => c.types.includes('locality')) || {}).long_name || null,
  };
}

/** Places API (New) Text Search. `fields` picks the SKU: ids only is free. */
export async function textSearch(body, fields = 'places.id') {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': fields },
    body: JSON.stringify(body),
  });
  const j = await res.json();
  if (j.error) throw new Error(`Places: ${j.error.status} ${j.error.message}`);
  return j;
}

export async function throttle(ms = 120) {
  await sleep(ms);
}
