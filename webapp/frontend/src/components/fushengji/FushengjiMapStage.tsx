import { useEffect, useMemo, useState, useCallback, type CSSProperties } from 'react';
import {
  cityMapAnchorStyle,
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

export default function FushengjiMapStage({
  configId = 'fstrading',
  world,
  currentCity,
  selectedCity,
  highlightCityIds = [],
  onSelectCity,
  tick,
  transit,
  basemapUrl = '/assets/fushengji/v1/maps/geo/basemap.webp',
  className = '',
}: Props) {
  const [pack, setPack] = useState<WorldGeoPack | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);

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

  const cities = useMemo(
    () => mergeMapCities(pack?.cities, world?.cities),
    [pack?.cities, world?.cities],
  );
  const routes =
    world?.routes?.length ? world.routes : pack?.routes?.length ? pack.routes : [];
  const bbox = pack?.bbox?.length === 4 ? pack.bbox : world?.geo?.bbox ?? [118, 29.8, 122.5, 33.5];

  const highlightSet = useMemo(() => new Set(highlightCityIds), [highlightCityIds]);

  const assetBasemap =
    pack?.assets?.basemap_geo_webp || pack?.assets?.basemap_schematic || basemapUrl;

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
      className={`relative w-full h-full min-h-[240px] rounded-xl overflow-hidden border border-border-subtle bg-background-secondary ${className}`}
      role="region"
      aria-label="长三角城市分布图"
    >
      <div className="absolute inset-0">
        <img
          src={assetBasemap}
          alt=""
          className="w-full h-full object-contain bg-[#e8f0e8] pointer-events-none select-none"
          draggable={false}
        />
      </div>

      <div className="absolute inset-0 z-10">
        {cities.map((c) => {
          const anchorStyle = cityMapAnchorStyle(c, bbox);
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
              className={`absolute -translate-x-1/2 -translate-y-[1.375rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                isHovered ? 'z-30' : 'z-10'
              }`}
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
      <p className="absolute bottom-2 right-2 z-20 text-[10px] text-foreground-muted bg-background/80 px-2 py-0.5 rounded">
        悬停或点击城市查看报价
        {import.meta.env.DEV && (worldGeoVersion || pack?.geo_pack_version) && (
          <span className="ml-1 opacity-70">
            · geo {worldGeoVersion || pack?.geo_pack_version}
          </span>
        )}
      </p>
    </div>
  );
}
