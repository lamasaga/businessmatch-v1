/** FST 游戏日历 — 对外一律用「日期 / 游戏日」，不暴露 tick/拍 */

const GAME_START = new Date(2026, 6, 1);

export function gameDayIndex(tick: number): number {
  return Math.max(0, tick);
}

export function totalGameDays(totalTicks: number): number {
  return Math.max(1, totalTicks || 1);
}

/** 将游戏日序号格式化为玩家可见日期，如「10月30日」 */
export function formatGameDate(dayIndex: number, totalDays: number): string {
  const safeTotal = totalGameDays(totalDays);
  const progress = Math.max(0, Math.min(1, dayIndex / safeTotal));
  const dayOffset = Math.min(179, Math.floor(progress * 180));
  const date = new Date(GAME_START);
  date.setDate(GAME_START.getDate() + dayOffset);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/** 日末结算锁窗提示 */
export function daySettlementLabel(locked: boolean): string {
  return locked ? '日末结算中' : '';
}
