import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Meta, Project, ResaleListing } from './types';

interface Data {
  projects: Project[];
  meta: Meta | null;
  resale: ResaleListing[];
  loading: boolean;
  error: string | null;
}

const Ctx = createContext<Data>({ projects: [], meta: null, resale: [], loading: true, error: null });

const base = import.meta.env.BASE_URL;

async function getJson<T>(path: string, fallback: T): Promise<T> {
  const res = await fetch(`${base}data/${path}`);
  if (res.status === 404) return fallback;
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  // Static hosts answer missing files with the app's HTML page.
  if (!(res.headers.get('content-type') || '').includes('json')) return fallback;
  return res.json();
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Data>({ projects: [], meta: null, resale: [], loading: true, error: null });
  useEffect(() => {
    Promise.all([
      getJson<Project[]>('projects.json', []),
      getJson<Meta | null>('meta.json', null),
      getJson<ResaleListing[]>('resale.json', []),
    ])
      .then(([projects, meta, resale]) => setState({ projects, meta, resale, loading: false, error: null }))
      .catch((e) => setState((s) => ({ ...s, loading: false, error: String(e.message || e) })));
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useData = () => useContext(Ctx);
