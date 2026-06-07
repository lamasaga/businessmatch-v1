import { useTradingStore } from '../../../stores/tradingStore';

export default function useGameState() {
  // TODO: 替换为 finance-lab 专属 store
  return useTradingStore();
}
