// ── Inbound (Client → Server) ──────────────────────────────────────────────

export type InboundAction = 'SUBSCRIBE' | 'ORDER' | 'PAUSE' | 'RESUME' | 'STOP';

export interface InboundMessage<T = unknown> {
  action: InboundAction;
  payload?: T;
}

export interface SubscribePayload {
  symbol:       string;
  region?:      string;
  exchange?:    string;
  startDate:    string;
  endDate:      string;
  speed:        number;
  initialCash:  number;
  dataSource:   'LOCAL' | 'YAHOO_API';
}

export interface OrderPayload {
  symbol:   string;
  type:     'BUY' | 'SELL';
  quantity: number;
}

// ── Outbound (Server → Client) ─────────────────────────────────────────────

export type OutboundType =
  | 'REPLAY_STATUS'
  | 'TICK'
  | 'EXECUTION_REPORT'
  | 'PORTFOLIO_SNAPSHOT'
  | 'ERROR';

export interface OutboundMessage<T = unknown> {
  type:            OutboundType;
  serverTimestamp: string;
  data:            T;
}

export type ReplayStatus =
  | 'CONNECTED'
  | 'STARTED'
  | 'PAUSED'
  | 'RESUMED'
  | 'STOPPED'
  | 'COMPLETED'
  | 'DOWNLOADING_DATA';

export interface TickData {
  timestamp: string;
  symbol:    string;
  region:    string;
  exchange:  string;
  open:      number;
  high:      number;
  low:       number;
  close:     number;
  volume:    number;
}

export type OrderStatus = 'FILLED' | 'REJECTED';
export type OrderType   = 'BUY' | 'SELL';

export interface ExecutionReport {
  orderId:       string;
  symbol:        string;
  type:          OrderType;
  quantity:      number;
  executedPrice: number;
  totalValue:    number;
  status:        OrderStatus;
  message:       string;
  executedAt:    string;
}

export interface PortfolioSnapshot {
  sessionId:     string;
  cashBalance:   number;
  initialCash:   number;
  unrealizedPnl: number;
  positions:     Record<string, number>;
  snapshotTime:  string;
}

// ── App State ──────────────────────────────────────────────────────────────

export type WsStatus       = 'disconnected' | 'connecting' | 'connected' | 'error';
export type SessionStatus  = 'idle' | 'started' | 'paused' | 'completed' | 'stopped' | 'downloading';

export interface ReplaySessionState {
  wsStatus:      WsStatus;
  sessionStatus: SessionStatus;
  ticks:         TickData[];
  lastTick:      TickData | null;
  portfolio:     PortfolioSnapshot | null;
  executions:    ExecutionReport[];
  error:         string | null;
}
