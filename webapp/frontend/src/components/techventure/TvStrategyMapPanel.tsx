import { Cpu, Users, Megaphone, Compass, MapPin } from 'lucide-react';
import type { RouteId } from '../../types/techventure';

const ROUTE_ICONS: Record<string, typeof Cpu> = {
  TECH: Cpu,
  USER: Users,
  BRAND: Megaphone,
  PATHFINDER: Compass,
};

const ROUTE_RING: Record<string, string> = {
  TECH: 'rgb(96, 165, 250)',
  USER: 'rgb(74, 222, 128)',
  BRAND: 'rgb(244, 114, 182)',
  PATHFINDER: 'rgb(250, 204, 21)',
};

/** 三城示意布局（南京 / 合肥 / 杭州） */
const CITY_POS: Record<string, { x: number; y: number }> = {
  南京: { x: 200, y: 320 },
  合肥: { x: 120, y: 140 },
  杭州: { x: 380, y: 140 },
};

type CityCfg = { label?: string; scale?: number };
type RouteCfg = { label?: string; tagline?: string };

type Props = {
  citiesCfg: Record<string, CityCfg>;
  routesCfg: Record<string, RouteCfg>;
  route: RouteId;
  openedCities: string[];
  lockedCities: string[];
  canInteract: boolean;
  onSelectRoute: (r: RouteId) => void;
  onToggleCity: (cityId: string) => void;
};

export default function TvStrategyMapPanel({
  citiesCfg,
  routesCfg,
  route,
  openedCities,
  lockedCities,
  canInteract,
  onSelectRoute,
  onToggleCity,
}: Props) {
  const cityIds = Object.keys(citiesCfg).length ? Object.keys(citiesCfg) : Object.keys(CITY_POS);

  return (
    <div className="relative w-full h-full min-h-[240px] rounded-xl overflow-hidden border border-border-subtle bg-background-secondary flex flex-col">
      <svg viewBox="0 0 500 400" className="w-full h-full flex-1 block" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="tvMapBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(15, 23, 42)" />
            <stop offset="100%" stopColor="rgb(30, 41, 59)" />
          </linearGradient>
        </defs>
        <rect width={500} height={400} fill="url(#tvMapBg)" />

        {/* 三角商路 */}
        {[
          ['南京', '合肥'],
          ['合肥', '杭州'],
          ['杭州', '南京'],
        ].map(([a, b]) => {
          const p0 = CITY_POS[a] || { x: 250, y: 200 };
          const p1 = CITY_POS[b] || { x: 250, y: 200 };
          return (
            <line
              key={`${a}-${b}`}
              x1={p0.x}
              y1={p0.y}
              x2={p1.x}
              y2={p1.y}
              stroke="rgb(100, 116, 139)"
              strokeWidth={2}
              strokeOpacity={0.6}
            />
          );
        })}

        {cityIds.map((id) => {
          const p = CITY_POS[id] || { x: 250, y: 200 };
          const open = openedCities.includes(id);
          const locked = lockedCities.includes(id);
          const label = citiesCfg[id]?.label || id;
          return (
            <g
              key={id}
              style={{ cursor: canInteract && !locked ? 'pointer' : 'default' }}
              onClick={() => canInteract && !locked && onToggleCity(id)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={open ? 28 : 22}
                fill={open ? 'rgba(45, 212, 191, 0.2)' : 'rgba(15, 23, 42, 0.6)'}
                stroke={open ? 'rgb(45, 212, 191)' : 'rgb(148, 163, 184)'}
                strokeWidth={open ? 3 : 2}
              />
              <text
                x={p.x}
                y={p.y + 44}
                textAnchor="middle"
                className="fill-foreground text-[11px] font-medium"
              >
                {label.split('·')[0]?.trim() || id}
              </text>
              {locked && (
                <text x={p.x} y={p.y + 4} textAnchor="middle" className="fill-foreground-muted text-[9px]">
                  已布局
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5">
        {(Object.keys(routesCfg) as RouteId[]).map((rid) => {
          const Icon = ROUTE_ICONS[rid] || Compass;
          const active = route === rid;
          return (
            <button
              key={rid}
              type="button"
              disabled={!canInteract}
              onClick={() => onSelectRoute(rid)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-colors ${
                active
                  ? 'border-primary bg-primary/20 text-foreground'
                  : 'border-border-subtle bg-background/80 text-foreground-muted hover:border-foreground-muted'
              } disabled:opacity-50`}
              style={active ? { boxShadow: `0 0 0 1px ${ROUTE_RING[rid]}` } : undefined}
            >
              <Icon className="w-3 h-3" style={{ color: active ? ROUTE_RING[rid] : undefined }} />
              {routesCfg[rid]?.label || rid}
            </button>
          );
        })}
      </div>

      <p className="absolute top-2 right-2 text-[10px] text-foreground-muted bg-background/70 px-2 py-0.5 rounded flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        点击城市开拓 · 底部切换路线
      </p>
    </div>
  );
}
