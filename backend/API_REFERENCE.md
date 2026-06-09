# Market Replay Engine — Complete API Reference

> **For Frontend / Client Developers**
> All real-time communication uses a single WebSocket connection.
> One REST endpoint exists for health checks.

---

## Table of Contents

1. [Connection](#1-connection)
2. [Message Envelope Format](#2-message-envelope-format)
3. [Client → Server Messages (Inbound)](#3-client--server-messages-inbound)
   - [SUBSCRIBE](#31-subscribe)
   - [ORDER](#32-order)
   - [PAUSE](#33-pause)
   - [RESUME](#34-resume)
   - [STOP](#35-stop)
4. [Server → Client Messages (Outbound)](#4-server--client-messages-outbound)
   - [REPLAY_STATUS](#41-replay_status)
   - [TICK](#42-tick)
   - [EXECUTION_REPORT](#43-execution_report)
   - [PORTFOLIO_SNAPSHOT](#44-portfolio_snapshot)
   - [ERROR](#45-error)
5. [Full Session Lifecycle Sequence](#5-full-session-lifecycle-sequence)
6. [REST Endpoints](#6-rest-endpoints)
7. [TypeScript Type Definitions](#7-typescript-type-definitions)
8. [JavaScript / Browser Connection Example](#8-javascript--browser-connection-example)
9. [Python Client Example](#9-python-client-example)
10. [Error Handling Cheatsheet](#10-error-handling-cheatsheet)
11. [Pre-seeded Test Data](#11-pre-seeded-test-data)

---

## 1. Connection

```
WebSocket URL:  ws://localhost:8080/ws/market-replay
Protocol:       Raw WebSocket (not STOMP)
Message format: JSON (UTF-8)
```

The server sends `REPLAY_STATUS("CONNECTED")` immediately after the handshake succeeds.

**No authentication is required in the current build.** Add an `Authorization` query param or header at the handshake stage when adding auth.

---

## 2. Message Envelope Format

### Inbound (Client → Server)

Every message you send must follow this envelope:

```json
{
  "action": "<ACTION>",
  "payload": { ... }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string enum | Yes | One of: `SUBSCRIBE`, `ORDER`, `PAUSE`, `RESUME`, `STOP` |
| `payload` | object | Conditional | Required for `SUBSCRIBE` and `ORDER`; omit or set `null` for others |

### Outbound (Server → Client)

Every message sent by the server follows this envelope:

```json
{
  "type": "<TYPE>",
  "serverTimestamp": "2024-01-02T09:31:00Z",
  "data": { ... }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string enum | One of: `REPLAY_STATUS`, `TICK`, `EXECUTION_REPORT`, `PORTFOLIO_SNAPSHOT`, `ERROR` |
| `serverTimestamp` | ISO-8601 string | UTC wall-clock time the server sent this message |
| `data` | object or string | Payload — shape depends on `type` (see sections below) |

---

## 3. Client → Server Messages (Inbound)

### 3.1 `SUBSCRIBE`

Starts a new replay session. Cancels any existing session for this connection.

**Send:**
```json
{
  "action": "SUBSCRIBE",
  "payload": {
    "symbol":      "AAPL",
    "region":      "US",
    "exchange":    "NASDAQ",
    "startDate":   "2024-01-02T09:30:00Z",
    "endDate":     "2024-01-05T16:00:00Z",
    "speed":       60.0,
    "initialCash": 100000.0
  }
}
```

**Payload fields:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `symbol` | string | **Yes** | — | Ticker symbol (case-insensitive). Pre-seeded: `AAPL`, `TSLA`, `SPY` |
| `region` | string | No | — | Region filter, e.g. `"US"`. Omit to match any region |
| `exchange` | string | No | — | Exchange filter, e.g. `"NASDAQ"`. Omit to match any exchange |
| `startDate` | ISO-8601 string | **Yes** | — | Replay window start (inclusive). Must be before `endDate` |
| `endDate` | ISO-8601 string | **Yes** | — | Replay window end (inclusive) |
| `speed` | number | No | `1.0` | Speed multiplier. `60` = 60× faster than real-time. Must be > 0 |
| `initialCash` | number | No | `100000.0` | Starting virtual cash balance in USD |

**Server responds with:**
```json
{ "type": "REPLAY_STATUS", "serverTimestamp": "...", "data": "STARTED" }
```
Followed immediately by a stream of `TICK` messages.

**Validation errors** return:
```json
{ "type": "ERROR", "serverTimestamp": "...", "data": "SUBSCRIBE: 'symbol' is required." }
```

---

### 3.2 `ORDER`

Places a paper BUY or SELL order against the last emitted tick's close price.
A `SUBSCRIBE` must have been sent first.

**Send:**
```json
{
  "action": "ORDER",
  "payload": {
    "symbol":   "AAPL",
    "type":     "BUY",
    "quantity": 10
  }
}
```

**Payload fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `symbol` | string | **Yes** | Must match the active replay symbol |
| `type` | string enum | **Yes** | `"BUY"` or `"SELL"` |
| `quantity` | integer | **Yes** | Number of shares. Must be > 0 |

**Server responds with two messages in sequence:**
1. `EXECUTION_REPORT` — whether the order was filled or rejected
2. `PORTFOLIO_SNAPSHOT` — updated portfolio state

**Important:** The execution price is always the `close` price of the most recently emitted tick. Orders placed before the first tick is received will be rejected.

---

### 3.3 `PAUSE`

Pauses the tick emission stream. The position in the historical data is preserved.

**Send:**
```json
{ "action": "PAUSE" }
```

**Server responds with:**
```json
{ "type": "REPLAY_STATUS", "serverTimestamp": "...", "data": "PAUSED" }
```

No `payload` field needed. Sending PAUSE while already paused is a no-op.

---

### 3.4 `RESUME`

Resumes a paused session. Tick emission restarts from where it was paused.

**Send:**
```json
{ "action": "RESUME" }
```

**Server responds with:**
```json
{ "type": "REPLAY_STATUS", "serverTimestamp": "...", "data": "RESUMED" }
```

Followed immediately by resumed `TICK` messages. Sending RESUME while running is a no-op.

---

### 3.5 `STOP`

Permanently terminates the replay session. All in-memory state (portfolio, buffer) is destroyed. To replay again, send a new `SUBSCRIBE`.

**Send:**
```json
{ "action": "STOP" }
```

**Server responds with:**
```json
{ "type": "REPLAY_STATUS", "serverTimestamp": "...", "data": "STOPPED" }
```

---

## 4. Server → Client Messages (Outbound)

### 4.1 `REPLAY_STATUS`

Lifecycle status notifications. Always the first message type you receive.

```json
{
  "type": "REPLAY_STATUS",
  "serverTimestamp": "2024-01-02T09:30:00.000Z",
  "data": "CONNECTED"
}
```

**Possible `data` values:**

| Value | Trigger |
|-------|---------|
| `"CONNECTED"` | WebSocket handshake completed |
| `"STARTED"` | SUBSCRIBE processed, first tick queued |
| `"PAUSED"` | PAUSE command acknowledged |
| `"RESUMED"` | RESUME command acknowledged |
| `"STOPPED"` | STOP command acknowledged, or client disconnected |
| `"COMPLETED"` | All historical data has been emitted |

---

### 4.2 `TICK`

Emitted continuously during replay at the speed-adjusted cadence. This is the primary data stream.

```json
{
  "type": "TICK",
  "serverTimestamp": "2024-01-02T09:31:00.000Z",
  "data": {
    "timestamp": "2024-01-02T09:31:00Z",
    "symbol":    "AAPL",
    "region":    "US",
    "exchange":  "NASDAQ",
    "open":      182.50,
    "high":      183.10,
    "low":       182.20,
    "close":     182.80,
    "volume":    234567
  }
}
```

**`data` fields:**

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | ISO-8601 string | The **historical** timestamp of this candle (not wall clock) |
| `symbol` | string | Ticker symbol |
| `region` | string | Region code |
| `exchange` | string | Exchange name |
| `open` | number | Opening price |
| `high` | number | Highest price during this candle |
| `low` | number | Lowest price during this candle |
| `close` | number | Closing price — **this is the execution price for orders** |
| `volume` | integer | Share volume |

**Note:** `serverTimestamp` is the wall-clock time the server sent this message. `data.timestamp` is the historical market time.

---

### 4.3 `EXECUTION_REPORT`

Sent after every `ORDER` message, regardless of fill or rejection.

**Filled example:**
```json
{
  "type": "EXECUTION_REPORT",
  "serverTimestamp": "2024-01-02T09:31:05.123Z",
  "data": {
    "orderId":        "3f7a1c82-9b4e-4d1a-a8c2-1234567890ab",
    "symbol":         "AAPL",
    "type":           "BUY",
    "quantity":       10,
    "executedPrice":  182.80,
    "totalValue":     1828.00,
    "status":         "FILLED",
    "message":        "BUY filled at 182.8",
    "executedAt":     "2024-01-02T09:31:00Z"
  }
}
```

**Rejected example:**
```json
{
  "type": "EXECUTION_REPORT",
  "serverTimestamp": "2024-01-02T09:31:05.123Z",
  "data": {
    "orderId":        "9a2b3c4d-...",
    "symbol":         "AAPL",
    "type":           "BUY",
    "quantity":       10000,
    "executedPrice":  182.80,
    "totalValue":     1828000.00,
    "status":         "REJECTED",
    "message":        "Insufficient funds. Required: 1828000.00, Available: 100000.00",
    "executedAt":     "2024-01-02T09:31:00Z"
  }
}
```

**`data` fields:**

| Field | Type | Description |
|-------|------|-------------|
| `orderId` | string (UUID) | Unique order identifier |
| `symbol` | string | Ticker |
| `type` | `"BUY"` \| `"SELL"` | Order side |
| `quantity` | integer | Requested share count |
| `executedPrice` | number | Close price at execution time (0 if rejected before price is known) |
| `totalValue` | number | `executedPrice × quantity` |
| `status` | `"FILLED"` \| `"REJECTED"` | Outcome |
| `message` | string | Human-readable result description |
| `executedAt` | ISO-8601 string | Historical timestamp of the last emitted tick |

---

### 4.4 `PORTFOLIO_SNAPSHOT`

Sent immediately after every `EXECUTION_REPORT`. Shows the current virtual portfolio state.

```json
{
  "type": "PORTFOLIO_SNAPSHOT",
  "serverTimestamp": "2024-01-02T09:31:05.124Z",
  "data": {
    "sessionId":     "abc123def456",
    "cashBalance":   98172.00,
    "initialCash":   100000.00,
    "unrealizedPnl": -1828.00,
    "positions": {
      "AAPL": 10
    },
    "snapshotTime":  "2024-01-02T09:31:05.124Z"
  }
}
```

**`data` fields:**

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | The WebSocket session ID assigned by the server |
| `cashBalance` | number | Current available cash |
| `initialCash` | number | Starting cash from SUBSCRIBE |
| `unrealizedPnl` | number | `cashBalance - initialCash` (does not include open position mark-to-market) |
| `positions` | object | Map of `symbol → share count` for all open positions |
| `snapshotTime` | ISO-8601 string | Wall-clock time of this snapshot |

---

### 4.5 `ERROR`

Sent when the server encounters a validation error or unexpected failure.

```json
{
  "type": "ERROR",
  "serverTimestamp": "2024-01-02T09:30:00.000Z",
  "data": "SUBSCRIBE: 'endDate' must be after 'startDate'."
}
```

`data` is a plain string describing the error. The connection remains open after an error — you can retry the operation.

---

## 5. Full Session Lifecycle Sequence

```
CLIENT                                    SERVER
  |                                         |
  |--- WebSocket Handshake ---------------->|
  |<-- REPLAY_STATUS("CONNECTED") ----------|
  |                                         |
  |--- SUBSCRIBE (symbol, dates, speed) --->|
  |<-- REPLAY_STATUS("STARTED") -----------|
  |<-- TICK (historical candle 1) ----------|
  |<-- TICK (historical candle 2) ----------|
  |<-- TICK (historical candle 3) ----------|
  |    ... (continuous stream) ...          |
  |                                         |
  |--- PAUSE --------------------------------|
  |<-- REPLAY_STATUS("PAUSED") ------------|
  |    (stream stops)                       |
  |                                         |
  |--- RESUME ------------------------------>|
  |<-- REPLAY_STATUS("RESUMED") -----------|
  |<-- TICK (resumes from paused point) ----|
  |    ...                                  |
  |                                         |
  |--- ORDER (BUY 10 AAPL) ---------------->|
  |<-- EXECUTION_REPORT (FILLED) ----------|
  |<-- PORTFOLIO_SNAPSHOT -----------------|
  |                                         |
  |--- ORDER (SELL 5000 AAPL) ------------>|
  |<-- EXECUTION_REPORT (REJECTED) --------|
  |<-- PORTFOLIO_SNAPSHOT -----------------|
  |                                         |
  |    ... stream continues ...             |
  |<-- REPLAY_STATUS("COMPLETED") ---------|
  |    (all data emitted)                   |
  |                                         |
  |--- STOP (optional early termination) -->|
  |<-- REPLAY_STATUS("STOPPED") -----------|
  |                                         |
  |--- WebSocket close --------------------->|
```

---

## 6. REST Endpoints

### `GET /api/health`

Health check endpoint. Returns 200 OK when the service is running.

**Request:**
```
GET http://localhost:8080/api/health
```

**Response (200 OK):**
```json
{
  "status":         "UP",
  "service":        "Market Replay Engine",
  "activeSessions": 3,
  "serverTime":     "2024-01-02T09:30:00Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always `"UP"` if the server is responsive |
| `service` | string | Service name |
| `activeSessions` | integer | Number of currently active WebSocket replay sessions |
| `serverTime` | ISO-8601 string | Current server UTC time |

**Also available (Spring Actuator):**
- `GET /actuator/health` — detailed health with DB connectivity status
- `GET /actuator/metrics` — JVM and thread pool metrics

---

## 7. TypeScript Type Definitions

Copy this block into your frontend project:

```typescript
// ─── Inbound (Client → Server) ────────────────────────────────────────────

export type InboundAction = 'SUBSCRIBE' | 'ORDER' | 'PAUSE' | 'RESUME' | 'STOP';

export interface InboundMessage<T = unknown> {
  action: InboundAction;
  payload?: T;
}

export interface SubscribePayload {
  symbol:       string;
  region?:      string;
  exchange?:    string;
  startDate:    string;   // ISO-8601 UTC
  endDate:      string;   // ISO-8601 UTC
  speed?:       number;   // default 1.0
  initialCash?: number;   // default 100000
}

export interface OrderPayload {
  symbol:   string;
  type:     'BUY' | 'SELL';
  quantity: number;
}

// ─── Outbound (Server → Client) ───────────────────────────────────────────

export type OutboundType =
  | 'REPLAY_STATUS'
  | 'TICK'
  | 'EXECUTION_REPORT'
  | 'PORTFOLIO_SNAPSHOT'
  | 'ERROR';

export interface OutboundMessage<T = unknown> {
  type:            OutboundType;
  serverTimestamp: string;        // ISO-8601 UTC
  data:            T;
}

// REPLAY_STATUS
export type ReplayStatus =
  | 'CONNECTED'
  | 'STARTED'
  | 'PAUSED'
  | 'RESUMED'
  | 'STOPPED'
  | 'COMPLETED';

export type ReplayStatusMessage = OutboundMessage<ReplayStatus>;

// TICK
export interface TickData {
  timestamp: string;   // ISO-8601 UTC — historical market time
  symbol:    string;
  region:    string;
  exchange:  string;
  open:      number;
  high:      number;
  low:       number;
  close:     number;
  volume:    number;
}

export type TickMessage = OutboundMessage<TickData>;

// EXECUTION_REPORT
export type OrderStatus = 'FILLED' | 'REJECTED';
export type OrderType   = 'BUY' | 'SELL';

export interface ExecutionReport {
  orderId:        string;
  symbol:         string;
  type:           OrderType;
  quantity:       number;
  executedPrice:  number;
  totalValue:     number;
  status:         OrderStatus;
  message:        string;
  executedAt:     string;   // ISO-8601 UTC — historical timestamp
}

export type ExecutionReportMessage = OutboundMessage<ExecutionReport>;

// PORTFOLIO_SNAPSHOT
export interface PortfolioSnapshot {
  sessionId:     string;
  cashBalance:   number;
  initialCash:   number;
  unrealizedPnl: number;
  positions:     Record<string, number>;   // symbol → share count
  snapshotTime:  string;
}

export type PortfolioSnapshotMessage = OutboundMessage<PortfolioSnapshot>;

// ERROR
export type ErrorMessage = OutboundMessage<string>;

// ─── Discriminated union for message handler switch ───────────────────────

export type AnyOutboundMessage =
  | ReplayStatusMessage
  | TickMessage
  | ExecutionReportMessage
  | PortfolioSnapshotMessage
  | ErrorMessage;
```

---

## 8. JavaScript / Browser Connection Example

```javascript
// market-replay-client.js

const WS_URL = 'ws://localhost:8080/ws/market-replay';

class MarketReplayClient {
  constructor() {
    this.ws = null;
    this.onTick      = null;  // (TickData) => void
    this.onStatus    = null;  // (string)   => void
    this.onExecution = null;  // (ExecutionReport) => void
    this.onPortfolio = null;  // (PortfolioSnapshot) => void
    this.onError     = null;  // (string)   => void
  }

  connect() {
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen    = () => console.log('WS connected');
    this.ws.onclose   = (e) => console.log('WS closed', e.code, e.reason);
    this.ws.onerror   = (e) => console.error('WS error', e);
    this.ws.onmessage = (event) => this._route(JSON.parse(event.data));
  }

  subscribe({ symbol, region, exchange, startDate, endDate, speed = 60, initialCash = 100000 }) {
    this._send('SUBSCRIBE', { symbol, region, exchange, startDate, endDate, speed, initialCash });
  }

  buy(symbol, quantity)  { this._send('ORDER', { symbol, type: 'BUY',  quantity }); }
  sell(symbol, quantity) { this._send('ORDER', { symbol, type: 'SELL', quantity }); }
  pause()                { this._send('PAUSE'); }
  resume()               { this._send('RESUME'); }
  stop()                 { this._send('STOP'); }

  disconnect() {
    if (this.ws) this.ws.close();
  }

  // ── Private ─────────────────────────────────────────────────────────────

  _send(action, payload = null) {
    const msg = payload ? { action, payload } : { action };
    this.ws.send(JSON.stringify(msg));
  }

  _route(msg) {
    switch (msg.type) {
      case 'TICK':               this.onTick?.(msg.data);      break;
      case 'REPLAY_STATUS':      this.onStatus?.(msg.data);    break;
      case 'EXECUTION_REPORT':   this.onExecution?.(msg.data); break;
      case 'PORTFOLIO_SNAPSHOT': this.onPortfolio?.(msg.data); break;
      case 'ERROR':              this.onError?.(msg.data);     break;
      default:
        console.warn('Unknown message type:', msg.type);
    }
  }
}

// ── Usage example ──────────────────────────────────────────────────────────

const client = new MarketReplayClient();

client.onStatus = (status) => {
  console.log('[STATUS]', status);
  if (status === 'COMPLETED') console.log('Replay finished!');
};

client.onTick = (tick) => {
  console.log(`[TICK] ${tick.timestamp} | ${tick.symbol} | C: ${tick.close} | V: ${tick.volume}`);
  // Update your chart here
};

client.onExecution = (report) => {
  console.log(`[ORDER] ${report.status} — ${report.type} ${report.quantity} ${report.symbol} @ ${report.executedPrice}`);
};

client.onPortfolio = (snap) => {
  console.log(`[PORTFOLIO] Cash: $${snap.cashBalance.toFixed(2)} | PnL: $${snap.unrealizedPnl.toFixed(2)}`);
  console.log('Positions:', snap.positions);
};

client.onError = (err) => {
  console.error('[ERROR]', err);
};

client.connect();

// After connection is established:
setTimeout(() => {
  client.subscribe({
    symbol:      'AAPL',
    region:      'US',
    exchange:    'NASDAQ',
    startDate:   '2024-01-02T09:30:00Z',
    endDate:     '2024-01-05T16:00:00Z',
    speed:       60,
    initialCash: 100000
  });
}, 500);

// Buy 10 shares after 3 seconds of replay
setTimeout(() => client.buy('AAPL', 10), 3000);

// Sell 5 shares after 6 seconds
setTimeout(() => client.sell('AAPL', 5), 6000);

// Pause after 10 seconds, resume after 12
setTimeout(() => client.pause(), 10000);
setTimeout(() => client.resume(), 12000);
```

---

## 9. Python Client Example

```python
# market_replay_client.py
# pip install websocket-client

import json
import threading
import time
import websocket

WS_URL = "ws://localhost:8080/ws/market-replay"

def on_message(ws, raw):
    msg = json.loads(raw)
    t   = msg["type"]
    d   = msg["data"]

    if t == "REPLAY_STATUS":
        print(f"[STATUS] {d}")
        if d == "COMPLETED":
            print("Replay complete.")
            ws.close()

    elif t == "TICK":
        print(f"[TICK] {d['timestamp']}  {d['symbol']}  "
              f"O:{d['open']}  H:{d['high']}  L:{d['low']}  C:{d['close']}  V:{d['volume']}")

    elif t == "EXECUTION_REPORT":
        print(f"[ORDER] {d['status']} | {d['type']} {d['quantity']} {d['symbol']} "
              f"@ {d['executedPrice']} | {d['message']}")

    elif t == "PORTFOLIO_SNAPSHOT":
        print(f"[PORTFOLIO] Cash: ${d['cashBalance']:.2f}  "
              f"PnL: ${d['unrealizedPnl']:.2f}  "
              f"Positions: {d['positions']}")

    elif t == "ERROR":
        print(f"[ERROR] {d}")

def on_open(ws):
    print("Connected.")
    # Subscribe
    ws.send(json.dumps({
        "action": "SUBSCRIBE",
        "payload": {
            "symbol":      "TSLA",
            "region":      "US",
            "exchange":    "NASDAQ",
            "startDate":   "2024-01-02T09:30:00Z",
            "endDate":     "2024-01-05T16:00:00Z",
            "speed":       120.0,
            "initialCash": 50000.0
        }
    }))

    # Place a buy order after 2 seconds
    def delayed_buy():
        time.sleep(2)
        ws.send(json.dumps({
            "action": "ORDER",
            "payload": {"symbol": "TSLA", "type": "BUY", "quantity": 5}
        }))
    threading.Thread(target=delayed_buy, daemon=True).start()

def on_error(ws, error):
    print(f"Error: {error}")

def on_close(ws, code, msg):
    print(f"Closed: {code} {msg}")

ws_app = websocket.WebSocketApp(
    WS_URL,
    on_open=on_open,
    on_message=on_message,
    on_error=on_error,
    on_close=on_close
)
ws_app.run_forever()
```

---

## 10. Error Handling Cheatsheet

| `data` string | Cause | Fix |
|--------------|-------|-----|
| `"Missing 'action' field."` | Malformed JSON sent | Ensure envelope has `action` key |
| `"SUBSCRIBE: 'symbol' is required."` | Missing symbol | Add `"symbol"` to payload |
| `"SUBSCRIBE: 'startDate' and 'endDate' are required."` | Missing dates | Add both date fields as ISO-8601 strings |
| `"SUBSCRIBE: 'endDate' must be after 'startDate'."` | Invalid date range | Swap or fix the dates |
| `"No active session. Send SUBSCRIBE first."` | ORDER/PAUSE/RESUME before SUBSCRIBE | Send SUBSCRIBE first |
| `"No price data yet. Wait for the first tick."` | ORDER sent before any tick emitted | Wait for at least one TICK |
| `"Symbol mismatch: stream is AAPL but order is for TSLA"` | Wrong symbol in ORDER | Match ORDER symbol to SUBSCRIBE symbol |
| `"ORDER: 'type' must be BUY or SELL."` | Invalid order type | Use exactly `"BUY"` or `"SELL"` |
| `"ORDER: 'quantity' must be positive."` | Zero or negative qty | Use a positive integer |
| `"Insufficient funds. Required: X, Available: Y"` | Not enough cash | Reduce quantity or increase initialCash |
| `"Insufficient position for X. Required: N, Held: M"` | Selling more than held | Reduce SELL quantity |
| `"Failed to process message: ..."` | JSON parse failure | Validate JSON before sending |

---

## 11. Pre-seeded Test Data

On first boot, the engine seeds the following data automatically:

| Symbol | Exchange | Region | Period | Candles | Interval |
|--------|----------|--------|--------|---------|----------|
| `AAPL` | NASDAQ | US | 2024-01-02 → 2024-01-08 | 1,950 | 1 minute |
| `TSLA` | NASDAQ | US | 2024-01-02 → 2024-01-08 | 1,950 | 1 minute |
| `SPY`  | NYSE   | US | 2024-01-02 → 2024-01-08 | 1,950 | 1 minute |

**Valid date ranges for testing:**
```
startDate: "2024-01-02T09:30:00Z"
endDate:   "2024-01-08T16:00:00Z"
```

**Speed reference for 1-minute candles:**

| `speed` value | Emission rate | Time to replay 1 trading day |
|--------------|--------------|------------------------------|
| `1` | 1 tick/60 sec | 6.5 hours |
| `60` | 1 tick/sec | ~6.5 minutes |
| `390` | ~1 tick/154ms | ~1 minute |
| `3900` | ~1 tick/15ms | ~6 seconds |
