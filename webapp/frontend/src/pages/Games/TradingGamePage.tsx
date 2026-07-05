import { useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTradingStore } from '../../stores/tradingStore';
import TradingRTSView from './TradingRTSView';
import { connectRtsWebSocket } from '../../lib/rtsWebSocket';
import { useRefreshCareerOnMatchFinish } from '../../hooks/useRefreshCareerOnMatchFinish';
import { Loader2 } from 'lucide-react';

export default function TradingGamePage() {
  const { id } = useParams<{ id: string }>();
  const { gameState, fetchGameState } = useTradingStore();

  const eventId = Number(id);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    return fetchGameState(eventId, options);
  }, [eventId, fetchGameState]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!eventId) return;
    const disconnect = connectRtsWebSocket(eventId, {
      onTick: () => {
        void refresh({ silent: true });
      },
    });
    const fallback = setInterval(() => void refresh({ silent: true }), 30000);
    return () => {
      disconnect();
      clearInterval(fallback);
    };
  }, [eventId, refresh]);

  useRefreshCareerOnMatchFinish(gameState?.event.status === 'finished');

  if (!gameState) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-0">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <TradingRTSView
      gameState={gameState}
      eventId={eventId}
    />
  );
}
