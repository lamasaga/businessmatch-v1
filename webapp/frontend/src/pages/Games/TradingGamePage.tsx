import { useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTradingStore } from '../../stores/tradingStore';
import TradingRTSView from './TradingRTSView';
import { connectRtsWebSocket } from '../../lib/rtsWebSocket';
import { Loader2 } from 'lucide-react';

export default function TradingGamePage() {
  const { id } = useParams<{ id: string }>();
  const { gameState, fetchGameState, error } = useTradingStore();

  const eventId = Number(id);

  const refresh = useCallback(async () => {
    return fetchGameState(eventId);
  }, [eventId, fetchGameState]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!eventId) return;
    const disconnect = connectRtsWebSocket(eventId, {
      onTick: () => {
        void refresh();
      },
    });
    const fallback = setInterval(() => void refresh(), 30000);
    return () => {
      disconnect();
      clearInterval(fallback);
    };
  }, [eventId, refresh]);

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      <TradingRTSView
        gameState={gameState}
        eventId={eventId}
        onRefresh={refresh}
      />
      {error && (
        <p className="mt-4 text-center text-sm text-danger">{error}</p>
      )}
    </>
  );
}
