/** Phase 1 商业体验营：隐藏百科/OPC，突出营团与商赛 */
const campFlag = import.meta.env.VITE_CAMP_PHASE1;

/** 本地 dev 默认开启；生产构建须显式 `VITE_CAMP_PHASE1=true`，或设 `false` 关闭 */
export const isCampPhase1 =
  campFlag === 'true' ||
  campFlag === '1' ||
  (import.meta.env.DEV && campFlag !== 'false');

const HIDDEN_PATHS = new Set(['/wiki', '/opc']);

export type NavItem = {
  path: string;
  label: string;
  icon: import('lucide-react').LucideIcon;
  highlight?: boolean;
};

export function filterNavItems(items: NavItem[]): NavItem[] {
  let list = items;
  if (isCampPhase1) {
    list = list.filter((item) => !HIDDEN_PATHS.has(item.path));
  } else {
    list = list.filter((item) => item.path !== '/camp');
  }
  return list;
}
