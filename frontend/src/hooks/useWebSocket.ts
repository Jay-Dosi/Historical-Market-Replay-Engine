import { useRef, useState, useCallback, useEffect } from 'react';
import type { WsStatus } from '../types/market';

interface UseWebSocketReturn {
  status:     WsStatus;
  connect:    (url: string) => void;
  disconnect: () => void;
  send:       (payload: unknown) => void;
  onMessage:  (handler: (data: unknown) => void) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [status, setStatus] = useState<WsStatus>('disconnected');
  const wsRef        = useRef<WebSocket | null>(null);
  const handlerRef   = useRef<((data: unknown) => void) | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, []);

  const connect = useCallback((url: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data as string);
        handlerRef.current?.(parsed);
      } catch {
        console.error('WS parse error:', event.data);
      }
    };

    ws.onerror = () => {
      setStatus('error');
    };

    ws.onclose = () => {
      setStatus('disconnected');
      wsRef.current = null;
    };
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const send = useCallback((payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    } else {
      console.warn('WS not connected — cannot send:', payload);
    }
  }, []);

  const onMessage = useCallback((handler: (data: unknown) => void) => {
    handlerRef.current = handler;
  }, []);

  return { status, connect, disconnect, send, onMessage };
}
