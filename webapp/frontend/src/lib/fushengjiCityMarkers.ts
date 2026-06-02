/** FStrading 六城 · 中文名与剪影图标（game-icons / Tabler，见 art-assets/fushengji/sources/ATTRIBUTION.md） */

export const FSTRADING_CITY_ZH: Record<string, string> = {
  nanjing: '南京',
  suzhou: '苏州',
  shanghai: '上海',
  nantong: '南通',
  hangzhou: '杭州',
  changzhou: '常州',
};

const ICON_BASE = '/assets/fushengji/v1/maps/cities';

export const FLEET_TRUCK_ICON = '/assets/fushengji/v1/vehicles/truck.svg';

export const FSTRADING_CITY_ICONS: Record<string, string> = {
  nanjing: `${ICON_BASE}/nanjing.svg`,
  suzhou: `${ICON_BASE}/suzhou.svg`,
  shanghai: `${ICON_BASE}/shanghai.svg`,
  nantong: `${ICON_BASE}/nantong.svg`,
  hangzhou: `${ICON_BASE}/hangzhou.svg`,
  changzhou: `${ICON_BASE}/changzhou.svg`,
};

/** 枢纽城强调色（Tailwind 近似） */
export const FSTRADING_CITY_ACCENT: Record<string, string> = {
  shanghai: 'rgb(212, 168, 83)',
  suzhou: 'rgb(45, 212, 191)',
};

export function resolveCityZhLabel(cityId: string, apiName?: string): string {
  const fromApi = (apiName || '').trim();
  if (/[\u4e00-\u9fff]/.test(fromApi)) {
    return fromApi.replace(/市$/, '') || fromApi;
  }
  return FSTRADING_CITY_ZH[cityId] ?? cityId;
}

export function cityMarkerIconUrl(cityId: string): string {
  return FSTRADING_CITY_ICONS[cityId] ?? `${ICON_BASE}/shanghai.svg`;
}
