import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// Shortlist and compare live in this browser only. No sign-up needed.
interface Lists {
  shortlist: string[];
  compare: string[];
  toggleShortlist: (id: string) => void;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
}

const MAX_COMPARE = 4;
const Ctx = createContext<Lists>({ shortlist: [], compare: [], toggleShortlist: () => {}, toggleCompare: () => {}, clearCompare: () => {} });

function load(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
function save(key: string, v: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode: keep in memory */
  }
}

export function ListsProvider({ children }: { children: ReactNode }) {
  const [shortlist, setShortlist] = useState<string[]>(() => load('nela.shortlist'));
  const [compare, setCompare] = useState<string[]>(() => load('nela.compare'));
  useEffect(() => save('nela.shortlist', shortlist), [shortlist]);
  useEffect(() => save('nela.compare', compare), [compare]);

  const toggleShortlist = useCallback((id: string) => setShortlist((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])), []);
  const toggleCompare = useCallback(
    (id: string) => setCompare((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX_COMPARE ? s : [...s, id])),
    [],
  );
  const clearCompare = useCallback(() => setCompare([]), []);
  return <Ctx.Provider value={{ shortlist, compare, toggleShortlist, toggleCompare, clearCompare }}>{children}</Ctx.Provider>;
}

export const useLists = () => useContext(Ctx);
export { MAX_COMPARE };
