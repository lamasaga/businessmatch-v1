import { useEffect, useMemo, useRef, useState, useCallback, type CSSProperties } from 'react';
import {
  cityMapAnchorStyle,
  cityStagePercent,
  fetchGeoPack,
  mergeMapCities,
  type WorldGeoPack,
} from '../../lib/fstradingGeo';
import FushengjiFleetMarker from './FushengjiFleetMarker';
import {
  cityMarkerIconUrl,
  FSTRADING_CITY_ACCENT,
  resolveCityZhLabel,
} from '../../lib/fushengjiCityMarkers';

type Props = {
  configId?: string;
  world?: {
    geo_pack_version?: string;
    cities?: Array<{
      city_id: string;
      name: string;
      hub?: boolean;
      geo?: {
        lng: number;
        lat: number;
        label_offset?: number[];
        stage_pct?: number[];
        stage_offset_px?: number[];
      };
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
  highlightCityIds?: string[];
  onSelectCity: (cityId: string) => void;
  tick: number;
  transit?: { from_city?: string; to_city?: string; arrival_tick?: number } | null;
  basemapUrl?: string;
  className?: string;
};

const PREMIUM_MAP_SIZE = { width: 1536, height: 1024 };

const PREMIUM_MAP_ANCHORS: Record<string, [number, number]> = {
  nanjing: [0.298, 0.275],
  nantong: [0.675, 0.252],
  shanghai: [0.786, 0.472],
  suzhou: [0.694, 0.792],
  hangzhou: [0.304, 0.845],
  changzhou: [0.115, 0.512],
};

type MapFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function coverFrame(containerWidth: number, containerHeight: number): MapFrame {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  const scale = Math.max(
    containerWidth / PREMIUM_MAP_SIZE.width,
    containerHeight / PREMIUM_MAP_SIZE.height,
  );
  const width = PREMIUM_MAP_SIZE.width * scale;
  const height = PREMIUM_MAP_SIZE.height * scale;
  return {
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
    width,
    height,
  };
}

function premiumMapCityAnchorStyle(cityId: string): { left: string; top: string } | null {
  const anchor = PREMIUM_MAP_ANCHORS[cityId];
  if (!anchor) return null;
  return {
    left: `${anchor[0] * 100}%`,
    top: `${anchor[1] * 100}%`,
  };
}

export default function FushengjiMapStage({
  configId = 'fstrading',
  world,
  currentCity,
  selectedCity,
  highlightCityIds = [],
  onSelectCity,
  tick,
  transit,
  basemapUrl = '/assets/fushengji/v1/maps/geo/trade-map-premium.png',
  className = '',
}: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [pack, setPack] = useState<WorldGeoPack | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [mapFrame, setMapFrame] = useState<MapFrame>({ left: 0, top: 0, width: 0, height: 0 });

  const worldGeoVersion = world?.geo_pack_version;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await fetchGeoPack(configId, { geoPackVersion: worldGeoVersion });
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
  }, [configId, worldGeoVersion]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const updateFrame = () => {
      const rect = node.getBoundingClientRect();
      setMapFrame(coverFrame(rect.width, rect.height));
    };

    updateFrame();
    const observer = new ResizeObserver(updateFrame);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const cities = useMemo(
    () =>
      mergeMapCities(pack?.cities, world?.cities).map((city) => {
        const anchor = PREMIUM_MAP_ANCHORS[city.city_id];
        if (!anchor) return city;
        return {
          ...city,
          geo: {
            ...(city.geo ?? { lng: 0, lat: 0 }),
            stage_pct: anchor,
            stage_offset_px: [0, 0],
          },
        };
      }),
    [pack?.cities, world?.cities],
  );
  const routes =
    world?.routes?.length ? world.routes : pack?.routes?.length ? pack.routes : [];
  const bbox = pack?.bbox?.length === 4 ? pack.bbox : world?.geo?.bbox ?? [118, 29.8, 122.5, 33.5];

  const highlightSet = useMemo(() => new Set(highlightCityIds), [highlightCityIds]);

  const assetBasemap = basemapUrl || pack?.assets?.basemap_geo_webp || pack?.assets?.basemap_schematic;
  const mapFrameStyle: CSSProperties = {
    left: `${mapFrame.left}px`,
    top: `${mapFrame.top}px`,
    width: `${mapFrame.width}px`,
    height: `${mapFrame.height}px`,
  };

  const routeLines = useMemo(() => {
    const byId = new Map(cities.map((c) => [c.city_id, c]));
    return routes
      .map((route) => {
        const from = byId.get(route.from_city);
        const to = byId.get(route.to_city);
        if (!from || !to) return null;
        const a = cityStagePercent(from, bbox);
        const b = cityStagePercent(to, bbox);
        const reachable =
          (route.from_city === currentCity && highlightSet.has(route.to_city)) ||
          (route.to_city === currentCity && highlightSet.has(route.from_city));
        const selected =
          selectedCity === route.from_city ||
          selectedCity === route.to_city ||
          reachable;
        return {
          id: route.edge_id,
          x1: a.x * 100,
          y1: (a.y + 0.028) * 100,
          x2: b.x * 100,
          y2: (b.y + 0.028) * 100,
          selected,
          reachable,
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        selected: boolean;
        reachable: boolean;
      }>;
  }, [bbox, cities, currentCity, highlightSet, routes, selectedCity]);

  const handleCityClick = useCallback(
    (cityId: string) => {
      setPulseId(cityId);
      window.setTimeout(() => setPulseId((prev) => (prev === cityId ? null : prev)), 520);
      onSelectCity(cityId);
    },
    [onSelectCity],
  );

  return (
    <div
      ref={stageRef}
      className={`fs-trade-map relative w-full h-full min-h-[240px] rounded-xl overflow-hidden border border-border-subtle bg-background-secondary ${className}`}
      role="region"
      aria-label="长三角城市分布图"
    >
      <div className="absolute inset-0">
        <img
          src={assetBasemap}
          alt=""
          className="fs-trade-map__image w-full h-full object-cover pointer-events-none select-none"
          draggable={false}
        />
      </div>
      <div className="fs-trade-map__shade" aria-hidden />

      <div className="fs-trade-map__overlay absolute z-10" style={mapFrameStyle}>
        {routeLines.length > 0 && (
          <svg
            className="fs-trade-route-layer absolute inset-0 z-[5] h-full w-full pointer-events-none overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            {routeLines.map((route) => (
              <line
                key={route.id}
                x1={route.x1}
                y1={route.y1}
                x2={route.x2}
                y2={route.y2}
                className={[
                  'fs-trade-route',
                  route.selected ? 'fs-trade-route--selected' : '',
                  route.reachable ? 'fs-trade-route--reachable' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            ))}
          </svg>
        )}
        {cities.map((c) => {
          const anchorStyle = premiumMapCityAnchorStyle(c.city_id) ?? cityMapAnchorStyle(c, bbox);
          const isCurrent = c.city_id === currentCity;
          const isSelected = c.city_id === selectedCity;
          const isHighlight = highlightSet.has(c.city_id);
          const isHovered = hoveredId === c.city_id;
          const isPulsing = pulseId === c.city_id;
          const label = resolveCityZhLabel(c.city_id, c.name);
          const iconUrl = cityMarkerIconUrl(c.city_id);
          const accent = FSTRADING_CITY_ACCENT[c.city_id];

          return (
            <button
              key={c.city_id}
              type="button"
              className={`fs-map-city-button absolute -translate-x-1/2 -translate-y-[1.375rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                isHovered ? 'z-30' : 'z-10'
              } ${isHighlight ? 'is-reachable' : ''}`}
              style={anchorStyle}
              onMouseEnter={() => setHoveredId(c.city_id)}
              onMouseLeave={() => setHoveredId((id) => (id === c.city_id ? null : id))}
              onClick={() => handleCityClick(c.city_id)}
              aria-label={`${label}${isCurrent ? '（当前所在）' : ''}`}
              aria-pressed={isSelected}
            >
              <span
                className={[
                  'fs-map-pin',
                  isPulsing ? 'fs-map-pin--click' : '',
                  isHovered ? 'fs-map-pin--hover' : '',
                  isSelected ? 'fs-map-pin--selected' : '',
                  isCurrent ? 'fs-map-pin--current' : '',
                  isHighlight ? 'fs-map-pin--highlight' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={accent ? ({ '--pin-accent': accent } as CSSProperties) : undefined}
              >
                <span className="fs-map-pin__icon-wrap" aria-hidden>
                  {c.hub && <span className="fs-map-pin__badge">枢纽</span>}
                  <img src={iconUrl} alt="" className="fs-map-pin__icon" draggable={false} />
                </span>
                <span className="fs-map-pin__label">{label}</span>
                {isHovered && (
                  <span className="fs-map-pin__preview" aria-hidden>
                    <b>{label}</b>
                    <small>
                      {isCurrent ? '当前位置' : isHighlight ? '可达商埠' : c.hub ? '枢纽商埠' : '区域市场'}
                    </small>
                  </span>
                )}
              </span>
            </button>
          );
        })}

        {currentCity && (
          <FushengjiFleetMarker
            currentCity={currentCity}
            transit={transit}
            cities={cities}
            routes={routes}
            bbox={bbox}
            tick={tick}
          />
        )}
      </div>

      {loadError && (
        <p className="absolute bottom-2 left-2 z-20 text-xs text-warning bg-background/80 px-2 py-1 rounded">
          {loadError}
        </p>
      )}
      <p className="fs-map-status absolute bottom-2 right-2 z-20 text-[10px]">
        {highlightCityIds.length ? `可达商埠 ${highlightCityIds.length}` : '长三角商路'}
        {import.meta.env.DEV && (worldGeoVersion || pack?.geo_pack_version) && (
          <span className="ml-1 opacity-70">
            · geo {worldGeoVersion || pack?.geo_pack_version}
          </span>
        )}
      </p>
    </div>
  );
}
