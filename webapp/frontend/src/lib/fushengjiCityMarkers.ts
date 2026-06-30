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

/** 城市强调色：对齐 FST 青蓝 / 金色 / 橙色赛事资产 */
export const FSTRADING_CITY_ACCENT: Record<string, string> = {
  shanghai: 'rgb(246, 195, 68)',
  suzhou: 'rgb(46, 195, 229)',
  nanjing: 'rgb(20, 184, 166)',
  hangzhou: 'rgb(59, 130, 246)',
  nantong: 'rgb(34, 197, 94)',
  changzhou: 'rgb(255, 138, 76)',
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
