// Google Maps keys are read at build time from the environment and are
// never committed. Restrict the browser key to your site's domains in
// Google Cloud Console (HTTP referrer restriction).
export const MAPS_KEY: string = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
export const MAP_ID: string = import.meta.env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID';
export const hasMaps = () => !!MAPS_KEY;

export const BANGALORE = { lat: 12.9716, lng: 77.5946 };

/** Next weekday at 9:00 AM India time, for peak-hour drive estimates. */
export function nextWeekdayAt9(): Date {
  const now = new Date();
  const ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000);
  const d = new Date(ist);
  d.setHours(9, 0, 0, 0);
  if (d <= ist) d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return new Date(d.getTime() - (330 + now.getTimezoneOffset()) * 60000);
}
