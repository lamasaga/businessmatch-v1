import { useEffect, useMemo, useState } from 'react';
import {
  cityStagePosition,
  fetchGeoPack,
  fleetPosition,
  neighborCityIds,
  type WorldGeoPack,
} from '../../lib/fstradingGeo';

const STAGE_W = 800;
const STAGE_H = 450;

type Props = {
  configId?: string;
  world?: {
    cities?: Array<{
      city_id: string;
      name: string;
      hub?: boolean;
      geo?: { lng: number; lat: number; label_offset?: number[] };
    }>;
    routes?: Array<{
      edge_id: string;
      from_city: string;
      to_city: string;
      base_travel_ticks: number;
      move_cost: number;
    }>;
    geo?: { bbox?: number[] };
  };
  currentCity: string;
  selectedCity: string | null;
  onSelectCity: (cityId: string) => void;
  tick: number;
  transit?: { from_city?: string; to_city?: string; arrival_tick?: number } | null;
  basemapUrl?: string;
  className?: string;
};

export default function FushengjiMapStage({
  configId = 'fstrading',
  world,
  currentCity,
  selectedCity,
  onSelectCity,
  tick,
  transit,
  basemapUrl = '/assets/fushengji/v1/maps/yangtze_6-schematic.svg',
  className = '',
}: Props) {
  const [pack, setPack] = useState<WorldGeoPack | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await fetchGeoPack(configId);
        if (!cancelled) {
          setPack(p);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) setLoadError('地理包加载失败，使用对局内坐标');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configId]);

  const cities = pack?.cities?.length ? pack.cities : world?.cities ?? [];
  const routes = pack?.routes?.length ? pack.routes : world?.routes ?? [];
  const bbox = pack?.bbox?.length === 4 ? pack.bbox : world?.geo?.bbox ?? [118, 30.5, 122.5, 33.5];

  const positions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    for (const c of cities) {
      map[c.city_id] = cityStagePosition(c, bbox, STAGE_W, STAGE_H);
    }
    return map;
  }, [cities, bbox]);

  const fleet = useMemo(
    () => fleetPosition(transit, cities, routes, bbox, STAGE_W, STAGE_H, tick),
    [transit, cities, routes, bbox, tick],
  );

  const neighbors = useMemo(
    () => new Set(neighborCityIds(currentCity, routes)),
    [currentCity, routes],
  );

  const assetBasemap = pack?.assets?.basemap_schematic || basemapUrl;

  return (
    <div
      className={`relative w-full h-full min-h-[240px] rounded-xl overflow-hidden border border-border-subtle bg-background-secondary flex flex-col ${className}`}
    >
      <svg
        viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
        className="w-full h-full flex-1 block object-contain"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="长三角商路地图"
      >
        <image href={assetBasemap} x={0} y={0} width={STAGE_W} height={STAGE_H} opacity={0.85} />

        {routes.map((e) => {
          const a = positions[e.from_city];
          const b = positions[e.to_city];
          if (!a || !b) return null;
          const active =
            currentCity === e.from_city ||
            currentCity === e.to_city ||
            selectedCity === e.from_city ||
            selectedCity === e.to_city;
          return (
            <g key={e.edge_id}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={active ? 'rgb(45, 212, 191)' : 'rgb(100, 116, 139)'}
                strokeWidth={active ? 3 : 2}
                strokeOpacity={0.7}
              />
              <text
                x={(a.x + b.x) / 2}
                y={(a.y + b.y) / 2 - 6}
                textAnchor="middle"
                className="fill-foreground-muted text-[10px]"
              >
                {e.base_travel_ticks} tick
              </text>
            </g>
          );
        })}

        {cities.map((c) => {
          const p = positions[c.city_id];
          if (!p) return null;
          const isCurrent = c.city_id === currentCity;
          const isSelected = c.city_id === selectedCity;
          const isNeighbor = neighbors.has(c.city_id);
          const r = isCurrent ? 14 : isSelected ? 12 : 9;
          return (
            <g
              key={c.city_id}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectCity(c.city_id)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={r + 4}
                fill={isCurrent ? 'rgba(45, 212, 191, 0.25)' : 'rgba(15, 23, 42, 0.4)'}
                stroke={isSelected ? 'rgb(250, 204, 21)' : isNeighbor ? 'rgb(94, 234, 212)' : 'transparent'}
                strokeWidth={2}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={c.hub ? 'rgb(250, 204, 21)' : 'rgb(56, 189, 248)'}
                stroke="rgb(15, 23, 42)"
                strokeWidth={1}
              />
              <text
                x={p.x}
                y={p.y + r + 14}
                textAnchor="middle"
                className="fill-foreground text-[11px] font-medium pointer-events-none"
              >
                {c.name}
              </text>
            </g>
          );
        })}

        {fleet && (
          <g>
            <circle cx={fleet.x} cy={fleet.y} r={10} fill="rgb(251, 191, 36)" stroke="#fff" strokeWidth={2} />
            <text x={fleet.x} y={fleet.y - 14} textAnchor="middle" className="fill-warning text-[10px] font-bold">
              商队
            </text>
          </g>
        )}
      </svg>

      {loadError && (
        <p className="absolute bottom-2 left-2 text-xs text-warning bg-background/80 px-2 py-1 rounded">
          {loadError}
        </p>
      )}
      <p className="absolute bottom-2 right-2 text-[10px] text-foreground-muted bg-background/70 px-2 py-0.5 rounded">
        点击城市查看邻城 · 移动仅可选直连路网
      </p>
    </div>
  );
}
