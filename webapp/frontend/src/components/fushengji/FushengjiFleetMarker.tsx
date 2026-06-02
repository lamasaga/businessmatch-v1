import { useMemo } from 'react';
import {
  fleetRouteSegment,
  resolveFleetMarker,
  type WorldGeoCity,
  type WorldRouteEdge,
} from '../../lib/fstradingGeo';
import { FLEET_TRUCK_ICON, resolveCityZhLabel } from '../../lib/fushengjiCityMarkers';

type Transit = { from_city?: string; to_city?: string; arrival_tick?: number } | null | undefined;

type Props = {
  currentCity: string;
  transit?: Transit;
  cities: WorldGeoCity[];
  routes: WorldRouteEdge[];
  bbox: number[];
  tick: number;
};

export default function FushengjiFleetMarker({
  currentCity,
  transit,
  cities,
  routes,
  bbox,
  tick,
}: Props) {
  const marker = useMemo(
    () => resolveFleetMarker(currentCity, transit, cities, routes, bbox, tick),
    [currentCity, transit, cities, routes, bbox, tick],
  );

  const routeLine = useMemo(
    () => fleetRouteSegment(transit, cities, bbox, tick),
    [transit, cities, bbox, tick],
  );

  if (!marker) return null;

  const destLabel = marker.toCity ? resolveCityZhLabel(marker.toCity) : '';
  const originLabel = marker.fromCity ? resolveCityZhLabel(marker.fromCity) : '';

  return (
    <>
      {routeLine && marker.moving && (
        <svg
          className="absolute inset-0 z-[15] w-full h-full pointer-events-none overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <line
            x1={routeLine.x0 * 100}
            y1={routeLine.y0 * 100}
            x2={routeLine.x1 * 100}
            y2={routeLine.y1 * 100}
            className="fs-fleet-route"
          />
          {marker.progress > 0.02 && marker.progress < 0.98 && (
            <circle
              cx={marker.xPct * 100}
              cy={marker.yPct * 100}
              r="1.2"
              className="fs-fleet-route-dot"
            />
          )}
        </svg>
      )}

      <div
        className={[
          'fs-fleet absolute z-[25] pointer-events-none -translate-x-1/2 -translate-y-1/2',
          marker.moving ? 'fs-fleet--moving' : 'fs-fleet--idle',
        ].join(' ')}
        style={{
          left: `calc(${marker.xPct * 100}% + ${marker.offsetPx[0]}px)`,
          top: `calc(${marker.yPct * 100}% + ${marker.offsetPx[1]}px)`,
        }}
        role="img"
        aria-label={
          marker.moving
            ? `商队正从${originLabel}前往${destLabel}`
            : `商队位于${resolveCityZhLabel(currentCity)}`
        }
      >
        <div
          className="fs-fleet__body"
          style={{ transform: `rotate(${marker.headingDeg}deg)` }}
        >
          <span className="fs-fleet__disc" aria-hidden />
          <img src={FLEET_TRUCK_ICON} alt="" className="fs-fleet__truck" draggable={false} />
        </div>
        {marker.moving && destLabel && (
          <span className="fs-fleet__caption">
            前往 {destLabel}
            <span className="fs-fleet__pct">{Math.round(marker.progress * 100)}%</span>
          </span>
        )}
        {!marker.moving && (
          <span className="fs-fleet__caption fs-fleet__caption--here">当前位置</span>
        )}
      </div>
    </>
  );
}
