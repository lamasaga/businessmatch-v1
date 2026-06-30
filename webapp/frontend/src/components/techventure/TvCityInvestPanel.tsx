import { MapPin } from 'lucide-react';
import type { TvCityConfig } from '../../types/techventure';

interface Props {
  openedCities: string[];
  citiesCfg: Record<string, TvCityConfig>;
  investFit: Record<string, number>;
  investShow: Record<string, number>;
  canInteract: boolean;
  onFitChange: (city: string, value: number) => void;
  onShowChange: (city: string, value: number) => void;
}

export default function TvCityInvestPanel({
  openedCities,
  citiesCfg,
  investFit,
  investShow,
  canInteract,
  onFitChange,
  onShowChange,
}: Props) {
  if (openedCities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-subtle p-4 text-center text-xs text-foreground-muted">
        先在左侧开拓城市，再分配 Fit / Show 投入
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {openedCities.map((cityId) => {
        const cfg = citiesCfg[cityId];
        const fit = investFit[cityId] || 0;
        const show = investShow[cityId] || 0;
        return (
          <div
            key={cityId}
            className="rounded-xl border border-tv-primary/15 bg-white p-3 space-y-2 shadow-sm"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5 text-tv-primary" />
              <span className="truncate">{cfg?.label || cityId}</span>
              <span className="text-[9px] text-foreground-muted ml-auto">规模 ×{cfg?.scale ?? 1}</span>
            </div>
            <SliderRow
              label="Fit"
              value={fit}
              accent="accent-tv-user"
              textColor="text-tv-user"
              disabled={!canInteract}
              onChange={(v) => onFitChange(cityId, v)}
            />
            <SliderRow
              label="Show"
              value={show}
              accent="accent-tv-brand"
              textColor="text-tv-brand"
              disabled={!canInteract}
              onChange={(v) => onShowChange(cityId, v)}
            />
          </div>
        );
      })}
    </div>
  );
}

function SliderRow({
  label,
  value,
  accent,
  textColor,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  accent: string;
  textColor: string;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className={`flex justify-between text-[10px] mb-0.5 ${textColor}`}>
        <span>{label}</span>
        <span className="font-mono">{value.toFixed(1)} 万</span>
      </label>
      <input
        type="range"
        min={0}
        max={30}
        step={0.5}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full ${accent}`}
      />
    </div>
  );
}
