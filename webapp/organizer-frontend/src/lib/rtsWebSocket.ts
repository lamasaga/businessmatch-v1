/** 浮生记 RTS WebSocket — 组织者控场订阅 tick */

export type RtsWsMessage =
  | {
      type: 'connected' | 'tick' | 'finished';
      event_id: number;
      tick: number;
      phase: string;
      seconds_until_next_tick?: number;
      finished?: boolean;
    }
  | { type: 'pong' };

function resolveWsBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  let httpBase = '';
  if (typeof fromEnv === 'string' && fromEnv.length > 0) {
    httpBase = fromEnv;
  } else if (!import.meta.env.PROD) {
    httpBase = 'http://localhost:8000';
  } else {
    const { protocol, host } = window.location;
    httpBase = `${protocol}//${host}`;
  }
  return httpBase.replace(/^http/i, (m) => (m.toLowerCase() === 'https' ? 'wss' : 'ws'));
}

export type RtsWsCallbacks = {
  onTick?: (msg: RtsWsMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export function connectRtsWebSocket(
  eventId: number,
  callbacks: RtsWsCallbacks
): () => void {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return () => {};
  }

  const wsBase = resolveWsBaseUrl();
  const url = `${wsBase}/api/v1/trading/events/${eventId}/ws?token=${encodeURIComponent(token)}`;
  let ws: WebSocket | null = null;
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const connect = () => {
    if (closed) return;
    ws = new WebSocket(url);

    ws.onopen = () => {
      callbacks.onOpen?.();
      pingTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 25000);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as RtsWsMessage;
        if (msg.type === 'tick' || msg.type === 'finished' || msg.type === 'connected') {
          callbacks.onTick?.(msg);
        }
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      callbacks.onClose?.();
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      if (!closed) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      ws?.close();
    };
  };

  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (pingTimer) clearInterval(pingTimer);
    ws?.close();
  };
}
