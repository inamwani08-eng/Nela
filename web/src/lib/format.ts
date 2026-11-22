const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const monthYear = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const [y, m] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

export const fullDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

export const sqft = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-IN'));

export const sqftRange = (a: number | null, b: number | null) => {
  if (a == null && b == null) return '—';
  if (a === b || b == null) return sqft(a);
  if (a == null) return sqft(b);
  return `${sqft(a)}–${sqft(b)}`;
};

export const bhkLabel = (bhk: number[]) => {
  if (!bhk.length) return 'Flats';
  const names = bhk.map((b) => (b === 0 ? 'Studio' : String(b)));
  const hasStudio = bhk[0] === 0;
  const nums = hasStudio ? names.slice(1) : names;
  return [hasStudio ? 'Studio' : null, nums.length ? `${nums.join(', ')} BHK` : null].filter(Boolean).join(', ');
};

export const inr = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(n >= 1e8 ? 1 : 2).replace(/\.?0+$/, '')} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1).replace(/\.0$/, '')} L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

export const km = (n: number | null | undefined) => (n == null ? '—' : `${n < 10 ? n.toFixed(1) : Math.round(n)} km`);

export const reraCertificateUrl = (reg: string) =>
  `https://rera.karnataka.gov.in/certificate?CER_NO=${encodeURIComponent(reg)}`;

export const delayText = (months: number) =>
  months <= 0 ? 'On original date' : months < 12 ? `Extended ${months} mo` : `Extended ${(months / 12).toFixed(1).replace(/\.0$/, '')} yr`;

export const possessionText = (p: { readyState: 'completed' | 'past-due' | 'upcoming'; possession: string | null }) =>
  p.readyState === 'completed' ? 'Completed' : p.readyState === 'past-due' ? `Due ${monthYear(p.possession)}, passed` : `Due ${monthYear(p.possession)}`;

export const readyLabel = (s: 'completed' | 'past-due' | 'upcoming') =>
  s === 'completed' ? 'Completed' : s === 'past-due' ? 'RERA date passed' : 'Under construction';
