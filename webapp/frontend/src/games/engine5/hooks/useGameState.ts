import { useTradingStore } from '../../../stores/tradingStore';

export default function useGameState() {
  // TODO: 替换为 engine5 专属 store
  return useTradingStore();
}
