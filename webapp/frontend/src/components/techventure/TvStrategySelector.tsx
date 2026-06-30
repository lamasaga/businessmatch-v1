import { Compass, Cpu, MapPin, Megaphone, Users, Check, Zap } from 'lucide-react';
import type { RouteId, TvCityConfig, TvRouteConfig } from '../../types/techventure';

const ROUTE_META: Record<RouteId, { icon: typeof Cpu; color: string; gradient: string; badge: string }> = {
  TECH: {
    icon: Cpu,
    color: 'text-tv-tech',
    gradient: 'from-blue-500/20 to-blue-600/5',
    badge: '技术驱动',
  },
  USER: {
    icon: Users,
    color: 'text-tv-user',
    gradient: 'from-slate-400/20 to-slate-500/5',
    badge: '用户至上',
  },
  BRAND: {
    icon: Megaphone,
    color: 'text-tv-brand',
    gradient: 'from-amber-500/20 to-amber-600/5',
    badge: '品牌声量',
  },
  PATHFINDER: {
    icon: Compass,
    color: 'text-tv-pathfinder',
    gradient: 'from-yellow-500/20 to-yellow-600/5',
    badge: '蓝海探索',
  },
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
    <section className="glass-card overflow-hidden border-t-2 border-t-tv-primary">
      <div className="shrink-0 px-3 py-2 border-b border-border-subtle flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-tv-primary" />
          战略路线
        </h2>
        <span className="text-[10px] text-foreground-muted">选择主路线，分配资金迭代产品数据</span>
      </div>

      <div className="p-3 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {routeIds.map((rid) => {
            const Icon = ROUTE_META[rid].icon || Compass;
            const active = rid === route;
            const cfg = routesCfg[rid];
            const meta = ROUTE_META[rid];

            return (
              <button
                key={rid}
                type="button"
                disabled={!canInteract}
                onClick={() => onSelectRoute(rid)}
                className={`relative text-left rounded-xl border p-3 transition-all duration-300 ${
                  active
                    ? 'border-tv-primary bg-gradient-to-br from-tv-primary/15 to-white shadow-[0_10px_26px_rgba(37,99,235,0.14)]'
                    : 'border-border-subtle bg-background-secondary/60 hover:border-tv-primary/30 hover:bg-background-hover'
                } disabled:opacity-50`}
              >
                {active && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-tv-primary flex items-center justify-center shadow-[0_0_8px_rgba(37,99,235,0.35)]">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-background/60 ${meta.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">{cfg?.label || rid}</div>
                    <div className={`text-[9px] px-1 py-0.5 rounded bg-background/60 ${meta.color} inline-block`}>{meta.badge}</div>
                  </div>
                </div>
                <p className="text-[10px] text-foreground-muted line-clamp-2 mb-1.5">
                  {cfg?.tagline || '选择本轮主策略方向'}
                </p>
                <p className="text-[10px] leading-relaxed text-foreground-secondary">
                  {routeIntro(rid, cfg)}
                </p>
                {active && routeSwitchCost > 0 && (
                  <p className="text-[9px] text-tv-primary mt-2">切换成本：{routeSwitchCost} 万</p>
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground-muted flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> 数据维度 · 城市开拓
            </p>
            <span className="text-[10px] text-foreground-muted">+{cityExpandCost} 万/城</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
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
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border transition-all ${
                    locked
                      ? 'border-tv-user/30 bg-tv-user/10 text-tv-user'
                      : open
                        ? 'border-tv-primary/50 bg-tv-primary/10 text-tv-primary shadow-[0_8px_18px_rgba(37,99,235,0.12)]'
                        : 'border-border-subtle bg-background-secondary text-foreground-muted hover:border-tv-primary/30'
                  } disabled:opacity-60`}
                >
                  <MapPin className="w-3 h-3" />
                  <span>{label}</span>
                  {locked && <span className="text-[9px]">已布局</span>}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-foreground-muted">开拓城市可让 Fit/Show 投入在该市场生效，提高 BQI 与注意力。</p>
        </div>
      </div>
    </section>
  );
}

function routeIntro(route: RouteId, cfg?: TvRouteConfig) {
  if (cfg?.brief) return cfg.brief;
  const fallback: Record<RouteId, string> = {
    TECH: '适合用研发能力建立长期壁垒，前期投入更重，后期增长更稳。',
    USER: '适合围绕用户场景做深体验，用更高匹配度换取稳定口碑。',
    BRAND: '适合快速打开市场声量，让产品更容易被看见和讨论。',
    PATHFINDER: '适合避开拥挤路线，在细分机会里争取差异化红利。',
  };
  return fallback[route];
}
