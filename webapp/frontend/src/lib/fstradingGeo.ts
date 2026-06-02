import { api } from './api';

export interface WorldGeoCity {
  city_id: string;
  name: string;
  type?: string;
  description?: string;
  hub?: boolean;
  display_population?: number;
  geo?: {
    lng: number;
    lat: number;
    label_offset?: number[];
    stage_pct?: number[];
    stage_offset_px?: number[];
  };
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

/** 开发时改 anchors.yaml 后可在控制台调用，或依赖 geo_pack_version 自动失效 */
export function clearGeoPackCache(configId?: string): void {
  if (!configId) {
    geoCache.clear();
    return;
  }
  for (const key of geoCache.keys()) {
    if (key.startsWith(`cfg:${configId}:`)) geoCache.delete(key);
  }
}

export async function fetchGeoPack(
  configId = 'fstrading',
  options?: { force?: boolean; geoPackVersion?: string },
): Promise<WorldGeoPack> {
  const ver = options?.geoPackVersion ?? '';
  const key = `cfg:${configId}:${ver}`;
  if (!options?.force && geoCache.has(key)) return geoCache.get(key)!;
  const res = await api.get(`/api/v1/trading/game-configs/${configId}/geo-pack`);
  const pack = res.data.data as WorldGeoPack;
  const cacheKey = `cfg:${configId}:${pack.geo_pack_version ?? ver}`;
  geoCache.set(cacheKey, pack);
  return pack;
}

/** 对局内 world 切片优先（随 state 刷新）；地理包仅补全资源与缺省字段 */
export function mergeMapCities(
  packCities: WorldGeoCity[] | undefined,
  worldCities: WorldGeoCity[] | undefined,
): WorldGeoCity[] {
  const world = worldCities ?? [];
  const pack = packCities ?? [];
  if (!world.length) return pack;
  if (!pack.length) return world;
  const packById = new Map(pack.map((c) => [c.city_id, c]));
  return world.map((wc) => {
    const pc = packById.get(wc.city_id);
    if (!pc) return wc;
    const wg = wc.geo;
    const pg = pc.geo;
    if (!wg && !pg) return wc;
    if (!wg) return pc;
    if (!pg) return wc;
    return {
      ...pc,
      ...wc,
      geo: {
        ...pg,
        ...wg,
        stage_pct: wg.stage_pct ?? pg.stage_pct,
        stage_offset_px: wg.stage_offset_px ?? pg.stage_offset_px,
        label_offset: wg.label_offset ?? pg.label_offset,
      },
    };
  });
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
  const pct = g.stage_pct;
  if (pct && pct.length >= 2) {
    const off = g.label_offset || [0, 0];
    return { x: pct[0] * width + off[0], y: pct[1] * height + off[1] };
  }
  const p = projectLngLat(g.lng, g.lat, bbox, width, height);
  const off = g.label_offset || [0, 0];
  return { x: p.x + off[0], y: p.y + off[1] };
}

/** 舞台归一化坐标 0～1（用于百分比定位） */
export function cityStagePercent(city: WorldGeoCity, bbox: number[]): { x: number; y: number } {
  const g = city.geo;
  if (g?.stage_pct && g.stage_pct.length >= 2) {
    return { x: g.stage_pct[0], y: g.stage_pct[1] };
  }
  if (!g) return { x: 0.5, y: 0.5 };
  const p = projectLngLat(g.lng, g.lat, bbox, 1, 1);
  return { x: p.x, y: p.y };
}

export function cityStageOffsetPx(city: WorldGeoCity): [number, number] {
  const off = city.geo?.stage_offset_px;
  if (off && off.length >= 2) return [off[0], off[1]];
  return [0, 0];
}

/** 地图锚点：百分比 + 像素微调（与底图手工对齐） */
export function cityMapAnchorStyle(
  city: WorldGeoCity,
  bbox: number[],
): { left: string; top: string } {
  const p = cityStagePercent(city, bbox);
  const [ox, oy] = cityStageOffsetPx(city);
  return {
    left: `calc(${p.x * 100}% + ${ox}px)`,
    top: `calc(${p.y * 100}% + ${oy}px)`,
  };
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

export type FleetMarkerState = {
  xPct: number;
  yPct: number;
  offsetPx: [number, number];
  moving: boolean;
  progress: number;
  headingDeg: number;
  fromCity?: string;
  toCity?: string;
};

function cityPercentPoint(cityId: string, cities: WorldGeoCity[], bbox: number[]): { x: number; y: number; ox: number; oy: number } | null {
  const c = cities.find((x) => x.city_id === cityId);
  if (!c) return null;
  const p = cityStagePercent(c, bbox);
  const [ox, oy] = cityStageOffsetPx(c);
  return { x: p.x, y: p.y + 0.028, ox, oy };
}

/** 商队卡车：停留于 currentCity；途中在 from→to 之间插值 */
export function resolveFleetMarker(
  currentCity: string,
  transit: { from_city?: string; to_city?: string; arrival_tick?: number } | null | undefined,
  cities: WorldGeoCity[],
  routes: WorldRouteEdge[],
  bbox: number[],
  tick: number,
): FleetMarkerState | null {
  const fromId = transit?.from_city;
  const toId = transit?.to_city;
  const arrival = Number(transit?.arrival_tick ?? 0);
  const inTransit =
    Boolean(fromId && toId && fromId !== toId) && arrival > tick;

  if (inTransit && fromId && toId) {
    const p0 = cityPercentPoint(fromId, cities, bbox);
    const p1 = cityPercentPoint(toId, cities, bbox);
    if (!p0 || !p1) return null;
    const t = fleetProgress(tick, transit, routes);
    const xPct = p0.x + (p1.x - p0.x) * t;
    const yPct = p0.y + (p1.y - p0.y) * t;
    const ox = p0.ox + (p1.ox - p0.ox) * t;
    const oy = p0.oy + (p1.oy - p0.oy) * t;
    const headingDeg = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;
    return {
      xPct,
      yPct,
      offsetPx: [ox, oy],
      moving: true,
      progress: t,
      headingDeg,
      fromCity: fromId,
      toCity: toId,
    };
  }

  const anchorCity = currentCity || fromId;
  if (!anchorCity) return null;
  const p = cityPercentPoint(anchorCity, cities, bbox);
  if (!p) return null;
  return {
    xPct: p.x,
    yPct: p.y,
    offsetPx: [p.ox, p.oy],
    moving: false,
    progress: 1,
    headingDeg: 0,
  };
}

export function fleetRouteSegment(
  transit: { from_city?: string; to_city?: string; arrival_tick?: number } | null | undefined,
  cities: WorldGeoCity[],
  bbox: number[],
  tick: number,
): { x0: number; y0: number; x1: number; y1: number } | null {
  const fromId = transit?.from_city;
  const toId = transit?.to_city;
  const arrival = Number(transit?.arrival_tick ?? 0);
  if (!fromId || !toId || fromId === toId || arrival <= tick) return null;
  const p0 = cityPercentPoint(fromId, cities, bbox);
  const p1 = cityPercentPoint(toId, cities, bbox);
  if (!p0 || !p1) return null;
  return { x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y };
}
