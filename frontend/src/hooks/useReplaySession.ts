import { useCallback, useEffect, useReducer } from 'react';
import { useWebSocket } from './useWebSocket';
import type {
  OutboundMessage, TickData, ExecutionReport, PortfolioSnapshot,
  ReplayStatus, SessionStatus, WsStatus, SubscribePayload, OrderPayload,
} from '../types/market';

const MAX_TICKS = 200;
const WS_URL    = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws/market-replay';

// ── State ──────────────────────────────────────────────────────────────────

interface State {
  wsStatus:      WsStatus;
  sessionStatus: SessionStatus;
  ticks:         TickData[];
  lastTick:      TickData | null;
  portfolio:     PortfolioSnapshot | null;
  executions:    ExecutionReport[];
  error:         string | null;
}

const initialState: State = {
  wsStatus:      'disconnected',
  sessionStatus: 'idle',
  ticks:         [],
  lastTick:      null,
  portfolio:     null,
  executions:    [],
  error:         null,
};

// ── Reducer ────────────────────────────────────────────────────────────────

type Action =
  | { type: 'WS_STATUS';    payload: WsStatus }
  | { type: 'TICK';         payload: TickData }
  | { type: 'STATUS';       payload: ReplayStatus }
  | { type: 'EXECUTION';    payload: ExecutionReport }
  | { type: 'PORTFOLIO';    payload: PortfolioSnapshot }
  | { type: 'ERROR';        payload: string }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'WS_STATUS':
      return { ...state, wsStatus: action.payload };

    case 'TICK': {
      const ticks = state.ticks.length >= MAX_TICKS
        ? [...state.ticks.slice(1), action.payload]
        : [...state.ticks, action.payload];
      return { ...state, ticks, lastTick: action.payload };
    }

    case 'STATUS': {
      const map: Record<ReplayStatus, SessionStatus> = {
        CONNECTED:        'idle',
        STARTED:          'started',
        PAUSED:           'paused',
        RESUMED:          'started',
        STOPPED:          'stopped',
        COMPLETED:        'completed',
        DOWNLOADING_DATA: 'downloading',
      };
      return {
        ...state,
        sessionStatus: map[action.payload] ?? state.sessionStatus,
        error: null,
      };
    }

    case 'EXECUTION':
      return {
        ...state,
        executions: [action.payload, ...state.executions].slice(0, 100),
      };

    case 'PORTFOLIO':
      return { ...state, portfolio: action.payload };

    case 'ERROR':
      return { ...state, error: action.payload };

    case 'RESET':
      return { ...initialState, wsStatus: state.wsStatus };

    default:
      return state;
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useReplaySession() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const ws = useWebSocket();

  // Sync WS status into reducer
  useEffect(() => {
    dispatch({ type: 'WS_STATUS', payload: ws.status });
  }, [ws.status]);

  // Register message router
  useEffect(() => {
    ws.onMessage((raw) => {
      const msg = raw as OutboundMessage;
      switch (msg.type) {
        case 'TICK':
          dispatch({ type: 'TICK', payload: msg.data as TickData });
          break;
        case 'REPLAY_STATUS':
          dispatch({ type: 'STATUS', payload: msg.data as ReplayStatus });
          break;
        case 'EXECUTION_REPORT':
          dispatch({ type: 'EXECUTION', payload: msg.data as ExecutionReport });
          break;
        case 'PORTFOLIO_SNAPSHOT':
          dispatch({ type: 'PORTFOLIO', payload: msg.data as PortfolioSnapshot });
          break;
        case 'ERROR':
          dispatch({ type: 'ERROR', payload: msg.data as string });
          break;
      }
    });
  }, [ws]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const connectWs = useCallback(() => {
    ws.connect(WS_URL);
  }, [ws]);

  const disconnectWs = useCallback(() => {
    ws.disconnect();
    dispatch({ type: 'RESET' });
  }, [ws]);

  const subscribe = useCallback((payload: SubscribePayload) => {
    dispatch({ type: 'RESET' });
    ws.send({ action: 'SUBSCRIBE', payload });
  }, [ws]);

  const pause  = useCallback(() => ws.send({ action: 'PAUSE' }),  [ws]);
  const resume = useCallback(() => ws.send({ action: 'RESUME' }), [ws]);

  const stop = useCallback(() => {
    ws.send({ action: 'STOP' });
    dispatch({ type: 'RESET' });
  }, [ws]);

  const placeOrder = useCallback((payload: OrderPayload) => {
    ws.send({ action: 'ORDER', payload });
  }, [ws]);

  return {
    ...state,
    connectWs,
    disconnectWs,
    subscribe,
    pause,
    resume,
    stop,
    placeOrder,
  };
}
