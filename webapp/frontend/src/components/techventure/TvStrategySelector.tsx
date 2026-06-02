import { Compass, Cpu, MapPin, Megaphone, Users } from 'lucide-react';
import type { RouteId, TvCityConfig, TvRouteConfig } from '../../types/techventure';

const ROUTE_ICON: Record<RouteId, typeof Cpu> = {
  TECH: Cpu,
  USER: Users,
  BRAND: Megaphone,
  PATHFINDER: Compass,
};

const ROUTE_ACCENT: Record<RouteId, string> = {
  TECH: 'text-blue-400',
  USER: 'text-success',
  BRAND: 'text-pink-400',
  PATHFINDER: 'text-warning',
};

type Props = {
  routesCfg: Record<string, TvRouteConfig>;
  citiesCfg: Record<string, TvCityConfig>;
  route: RouteId;
  openedCities: string[];
  lockedCities: string[];
  canInteract: boolean;
  cityExpandCost: number;
  routeSwitchCost: number;
  onSelectRoute: (r: RouteId) => void;
  onToggleCity: (cityId: string) => void;
};

export default function TvStrategySelector({
  routesCfg,
  citiesCfg,
  route,
  openedCities,
  lockedCities,
  canInteract,
  cityExpandCost,
  routeSwitchCost,
  onSelectRoute,
  onToggleCity,
}: Props) {
  const routeIds = (Object.keys(routesCfg) as RouteId[]).length
    ? (Object.keys(routesCfg) as RouteId[])
    : (['TECH', 'USER', 'BRAND', 'PATHFINDER'] as RouteId[]);

  const cityIds = Object.keys(citiesCfg);

  return (
    <section className="glass-card overflow-hidden">
      <div className="shrink-0 px-3 py-2 border-b border-border-subtle flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-purple-400" />
          战略选择
        </h2>
        <span className="text-[10px] text-foreground-muted">非地图化 · 只保留决策入口</span>
      </div>

      <div className="p-3 space-y-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground-muted">路线（本轮可切换）</p>
          <div className="grid grid-cols-2 gap-2">
            {routeIds.map((rid) => {
              const Icon = ROUTE_ICON[rid] || Compass;
              const active = rid === route;
              const cfg = routesCfg[rid];
              return (
                <button
                  key={rid}
                  type="button"
                  disabled={!canInteract}
                  onClick={() => onSelectRoute(rid)}
                  className={`text-left rounded-xl border p-2 transition-colors ${
                    active
                      ? 'border-primary/50 bg-primary/15'
                      : 'border-border-subtle bg-background-secondary hover:bg-background-hover'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${ROUTE_ACCENT[rid]}`} />
                    <span className="text-xs font-semibold">{cfg?.label || rid}</span>
                  </div>
                  <p className="text-[10px] text-foreground-muted mt-1 line-clamp-2">
                    {cfg?.tagline || '选择本轮主策略方向'}
                  </p>
                  {active && routeSwitchCost > 0 && (
                    <p className="text-[10px] text-foreground-muted mt-1">
                      切换成本：{routeSwitchCost} 万（若与上轮不同）
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground-muted">城市开拓（最多 3 城）</p>
          <div className="space-y-1">
            {cityIds.map((id) => {
              const label = citiesCfg[id]?.label || id;
              const locked = lockedCities.includes(id);
              const open = openedCities.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!canInteract || locked}
                  onClick={() => onToggleCity(id)}
                  className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 border text-xs transition-colors ${
                    open
                      ? 'border-success/50 bg-success/10'
                      : 'border-border-subtle bg-background-secondary hover:bg-background-hover'
                  } disabled:opacity-60`}
                >
                  <span className="truncate">{label}</span>
                  <span className="text-[10px] text-foreground-muted shrink-0">
                    {locked ? '已布局' : open ? `本轮开拓（+${cityExpandCost}万）` : `未开拓（+${cityExpandCost}万）`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

