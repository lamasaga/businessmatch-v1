import { api } from './api';

export interface WorldGeoCity {
  city_id: string;
  name: string;
  type?: string;
  description?: string;
  hub?: boolean;
  display_population?: number;
  geo?: { lng: number; lat: number; label_offset?: number[] };
}

export interface WorldRouteEdge {
  edge_id: string;
  from_city: string;
  to_city: string;
  base_travel_ticks: number;
  move_cost: number;
}

export interface WorldGeoPack {
  region_id: string;
  geo_pack_version: string;
  world_pack_version?: string;
  bbox: number[];
  projection: string;
  stage_aspect: string;
  assets: Record<string, string>;
  attribution: string[];
  cities: WorldGeoCity[];
  routes: WorldRouteEdge[];
}

export interface WorldTradeSlice {
  region_id?: string;
  geo_pack_version?: string;
  world_pack_version?: string;
  hub_cities?: string[];
  cities?: WorldGeoCity[];
  routes?: WorldRouteEdge[];
  geo?: WorldGeoPack['assets'] extends never ? never : {
    bbox?: number[];
    projection?: string;
    stage_aspect?: string;
    assets?: Record<string, string>;
    attribution?: string[];
  };
  behavior_pack?: string;
}

const geoCache = new Map<string, WorldGeoPack>();

export async function fetchGeoPack(configId = 'fstrading'): Promise<WorldGeoPack> {
  const key = `cfg:${configId}`;
  if (geoCache.has(key)) return geoCache.get(key)!;
  const res = await api.get(`/api/v1/trading/game-configs/${configId}/geo-pack`);
  const pack = res.data.data as WorldGeoPack;
  geoCache.set(key, pack);
  return pack;
}

export function projectLngLat(
  lng: number,
  lat: number,
  bbox: number[],
  width: number,
  height: number,
): { x: number; y: number } {
  const [west, south, east, north] = bbox;
  const x = ((lng - west) / (east - west)) * width;
  const y = (1 - (lat - south) / (north - south)) * height;
  return { x, y };
}

export function cityStagePosition(
  city: WorldGeoCity,
  bbox: number[],
  width: number,
  height: number,
): { x: number; y: number } {
  const g = city.geo;
  if (!g) return { x: width / 2, y: height / 2 };
  const p = projectLngLat(g.lng, g.lat, bbox, width, height);
  const off = g.label_offset || [0, 0];
  return { x: p.x + off[0], y: p.y + off[1] };
}

export function neighborCityIds(
  currentCity: string,
  routes: WorldRouteEdge[],
): string[] {
  const set = new Set<string>();
  for (const e of routes) {
    if (e.from_city === currentCity) set.add(e.to_city);
    if (e.to_city === currentCity) set.add(e.from_city);
  }
  return Array.from(set);
}

export function edgeBetween(
  a: string,
  b: string,
  routes: WorldRouteEdge[],
): WorldRouteEdge | undefined {
  const key = a < b ? `${a}-${b}` : `${b}-${a}`;
  return routes.find((e) => e.edge_id === key);
}

export function fleetProgress(
  tick: number,
  transit: { from_city?: string; to_city?: string; arrival_tick?: number } | null | undefined,
  routes: WorldRouteEdge[],
): number {
  if (!transit?.from_city || !transit.to_city) return 0;
  const arrival = Number(transit.arrival_tick ?? 0);
  if (arrival <= tick) return 1;
  const edge = edgeBetween(transit.from_city, transit.to_city, routes);
  const travel = edge?.base_travel_ticks ?? Math.max(1, arrival - tick);
  const depart = arrival - travel;
  return Math.max(0, Math.min(1, (tick - depart) / Math.max(1, travel)));
}

export function fleetPosition(
  transit: { from_city?: string; to_city?: string; arrival_tick?: number } | null | undefined,
  cities: WorldGeoCity[],
  routes: WorldRouteEdge[],
  bbox: number[],
  width: number,
  height: number,
  tick: number,
): { x: number; y: number } | null {
  if (!transit?.from_city || !transit.to_city) return null;
  const from = cities.find((c) => c.city_id === transit.from_city);
  const to = cities.find((c) => c.city_id === transit.to_city);
  if (!from?.geo || !to?.geo) return null;
  const p0 = cityStagePosition(from, bbox, width, height);
  const p1 = cityStagePosition(to, bbox, width, height);
  const t = fleetProgress(tick, transit, routes);
  return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
}
