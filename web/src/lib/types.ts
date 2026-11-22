export interface BuilderStats {
  name: string;
  projects: number;
  finished: number;
  avgDelayMonths: number | null;
  extendedShare: number | null;
}

export interface Unit {
  type: string;
  bhk: number | null;
  count: number | null;
  carpetMin: number | null;
  carpetMax: number | null;
}

export interface Project {
  id: string;
  reg: string | null;
  name: string;
  builder: string;
  builderKey: string;
  builderStats: BuilderStats | null;
  district: string;
  taluk: string;
  area: string;
  address: string | null;
  pin: string | null;
  lat: number | null;
  lng: number | null;
  coordSource: 'rera' | 'geocoded' | 'approximate' | null;
  type: string;
  subType: string | null;
  reraStatus: string | null;
  approvedOn: string | null;
  startDate: string | null;
  possession: string | null;
  possessionAtReg: string | null;
  delayMonths: number;
  extensions: number;
  ready: boolean;
  /** completed: RERA says complete. past-due: RERA date passed, not marked complete. */
  readyState: 'completed' | 'past-due' | 'upcoming';
  units: Unit[];
  bhk: number[];
  carpetMin: number | null;
  carpetMax: number | null;
  totalUnits: number | null;
  towers: number | null;
  landAcres: number | null;
  authority: string | null;
  water: string[];
  placeId: string | null;
  metro: { name: string; km: number } | null;
  hubKm: Record<string, number>;
  detailFetchedAt: string | null;
}

export interface Hub {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Meta {
  builtAt: string;
  reraListFetchedAt: string;
  counts: { reraProjectsListed: number; onSite: number; ready: number; withCoords: number; withGooglePlace: number };
  hubs: Hub[];
  metroStations: { name: string; lat: number; lng: number }[];
}

export type KhataType = 'A' | 'B' | 'E' | 'unknown';

/** Resale listings come only from owners or K-RERA registered agents. */
export interface ResaleListing {
  id: string;
  title: string;
  area: string;
  society: string;
  bhk: number;
  carpetSqft: number;
  floor: string | null;
  builtYear: number | null;
  priceInr: number;
  occupancyCertificate: boolean | null;
  khata: KhataType;
  postedBy: 'owner' | 'agent';
  agentReraNo: string | null;
  documentsChecked: boolean;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
  listedOn: string;
}
