import { useEffect, useRef } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const WS_URL = API_BASE_URL.replace(/^http/, 'ws') + '/api/ws/fleet';

export function useFleetWebSocket(onMessage: (eventData: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimer: any;

    const connect = () => {
      try {
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          console.log('[WebSocket] Connected to fleet real-time telemetry stream.');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onMessage(data);
          } catch (e) {
            console.error('[WebSocket] Error parsing message:', e);
          }
        };

        ws.onerror = (err) => {
          console.warn('[WebSocket] Connection error:', err);
        };

        ws.onclose = () => {
          console.log('[WebSocket] Connection closed. Reconnecting in 3 seconds...');
          reconnectTimer = setTimeout(connect, 3000);
        };

        wsRef.current = ws;
      } catch (e) {
        console.error('[WebSocket] Exception establishing connection:', e);
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);
}
