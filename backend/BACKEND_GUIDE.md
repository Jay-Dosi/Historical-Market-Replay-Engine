# Historical Market Replay Engine — Backend Developer Guide

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Prerequisites](#2-prerequisites)
3. [Directory Structure](#3-directory-structure)
4. [Quick Start — Docker](#4-quick-start--docker)
5. [Quick Start — Local Development](#5-quick-start--local-development)
6. [Architecture Deep-Dive](#6-architecture-deep-dive)
7. [Database Schema](#7-database-schema)
8. [Configuration Reference](#8-configuration-reference)
9. [Component Reference](#9-component-reference)
10. [Data Flow Walkthrough](#10-data-flow-walkthrough)
11. [Performance Tuning](#11-performance-tuning)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Project Overview

The **Historical Market Replay Engine** streams time-series OHLCV (Open/High/Low/Close/Volume) market data stored in a **TimescaleDB** hypertable to connected browser or script clients over a **WebSocket** connection at a user-defined speed multiplier (e.g. 1×, 10×, 60×, 100× real-time).

Each connected session gets:
- A **dedicated in-memory tick buffer** pre-loaded from the database.
- A **time-warp scheduler** that emits ticks at the exact wall-clock cadence corresponding to the chosen speed.
- A **paper trading desk** that accepts BUY/SELL orders and validates them against the exact historical price at the moment the tick was emitted.
- A **virtual portfolio** tracking cash balance, positions, and PnL in memory.

---

## 2. Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Java | 21 | Eclipse Temurin recommended |
| Maven | 3.9+ | Or use the bundled `./mvnw` wrapper |
| Docker Desktop | 24+ | For docker-compose deployment |
| PostgreSQL client | Any | Optional — for direct DB inspection |

---

## 3. Directory Structure

```
market-replay-engine/
├── Dockerfile                          # Multi-stage build (JDK 21 builder → JRE runtime)
├── docker-compose.yml                  # TimescaleDB + PGAdmin + App
├── pom.xml                             # Maven build descriptor
└── src/main/
    ├── java/com/marketreplay/
    │   ├── MarketReplayApplication.java       # Spring Boot entry point
    │   ├── config/
    │   │   ├── AppConfig.java                 # ScheduledExecutorService + ObjectMapper beans
    │   │   └── WebSocketConfig.java           # WebSocket endpoint registration
    │   ├── controller/
    │   │   └── HealthController.java          # GET /api/health
    │   ├── model/
    │   │   ├── MarketTick.java                # JPA entity → market_ticks hypertable
    │   │   ├── MarketTickId.java              # Composite PK (ts + UUID)
    │   │   ├── TickData.java                  # Wire-format DTO for emitted ticks
    │   │   ├── SubscribeRequest.java          # Client subscribe payload
    │   │   ├── OrderRequest.java              # Client order payload (BUY/SELL)
    │   │   ├── ExecutionReport.java           # Server order confirmation
    │   │   ├── Portfolio.java                 # Thread-safe virtual portfolio
    │   │   ├── PortfolioSnapshot.java         # Immutable portfolio state DTO
    │   │   ├── InboundMessage.java            # Generic WS message envelope (client→server)
    │   │   ├── OutboundMessage.java           # Generic WS message envelope (server→client)
    │   │   └── ReplaySessionState.java        # Per-session lifecycle state machine
    │   ├── repository/
    │   │   └── MarketTickRepository.java      # JPA repository with JPQL time-range queries
    │   ├── service/
    │   │   ├── DataBufferService.java         # Per-session ConcurrentLinkedQueue + prefetch
    │   │   ├── DataSeederService.java         # Boot-time synthetic data generator
    │   │   ├── PaperTradingService.java       # Order matching + portfolio mutation
    │   │   ├── ReplayEngineService.java       # Time-warp ScheduledExecutorService loop
    │   │   └── SessionManagerService.java     # Session registry + lifecycle management
    │   └── websocket/
    │       ├── MarketReplayWebSocketHandler.java  # TextWebSocketHandler — message routing
    │       └── WebSocketSessionRegistry.java      # Thread-safe WS session store + sender
    └── resources/
        ├── application.yml
        └── db/migration/
            └── V1__init_schema.sql            # Flyway migration — hypertable + indexes
```

---

## 4. Quick Start — Docker

```bash
# Clone / extract the project
cd market-replay-engine

# Build and start all three services
docker-compose up --build

# Logs
docker-compose logs -f market-replay-engine

# Stop everything
docker-compose down -v   # -v removes volumes (full reset)
```

**Services started:**

| Service | URL | Credentials |
|---------|-----|-------------|
| Replay Engine API + WS | `http://localhost:8080` | — |
| PGAdmin | `http://localhost:5050` | admin@marketreplay.com / admin_secret |
| TimescaleDB | `localhost:5432` | mreplay / mreplay_secret |

On **first boot**, `DataSeederService` inserts **5 trading days × 390 candles** of synthetic 1-minute OHLCV data for `AAPL`, `TSLA`, and `SPY` into TimescaleDB automatically. This takes ~5–10 seconds. Subsequent boots skip seeding (idempotent check via `existsBySymbol`).

---

## 5. Quick Start — Local Development

```bash
# 1. Start only the database
docker-compose up timescaledb pgadmin -d

# 2. Wait for TimescaleDB to be healthy
docker-compose ps   # confirm "healthy"

# 3. Run the Spring Boot app locally
./mvnw spring-boot:run

# Or build the JAR first
./mvnw clean package -DskipTests
java -jar target/market-replay-engine-1.0.0.jar
```

Test the health endpoint:
```bash
curl http://localhost:8080/api/health
```

Expected response:
```json
{
  "status": "UP",
  "service": "Market Replay Engine",
  "activeSessions": 0,
  "serverTime": "2024-01-02T09:30:00Z"
}
```

---

## 6. Architecture Deep-Dive

### 6.1 Session Lifecycle

```
Client connects
      │
      ▼
afterConnectionEstablished()
  └─ WebSocketSessionRegistry.register()
  └─ Send REPLAY_STATUS("CONNECTED")
      │
      ▼ Client sends SUBSCRIBE
handleSubscribe()
  └─ SessionManagerService.createSession()
       └─ new DataBufferService   (per-session)
       └─ new Portfolio           (per-session)
       └─ new ReplaySessionState  (per-session)
  └─ ReplayEngineService.startReplay()
       └─ DataBufferService.initialize()   ← synchronous first DB load
       └─ state.markStarted()
       └─ scheduleNextEmission(delay=0)    ← starts emission chain
      │
      ▼ Emission chain runs until COMPLETED or STOPPED
emitNextTick() [runs on replayScheduler thread pool]
  └─ buffer.poll()                  ← lock-free dequeue
  └─ sessionRegistry.sendMessage()  ← synchronized WS write
  └─ computeDelay(current, next)    ← delta_ms / speed
  └─ scheduleNextEmission(delay)    ← recurse
      │
      ▼ When buffer.isExhausted()
state.markCompleted()
Send REPLAY_STATUS("COMPLETED")
```

### 6.2 Memory Buffer & Prefetch Strategy

`DataBufferService` uses **keyset pagination** (cursor-based) rather than offset pagination. After each DB load, the cursor advances to `lastLoadedTick.timestamp + 1 ns`. This keeps every query O(log n) via the `(symbol, ts DESC)` hypertable index, regardless of how deep into the dataset the replay has progressed.

```
Queue capacity:  500 ticks (configurable: app.buffer.chunk-size)
Refill trigger:  when queue drops below 100 ticks (app.buffer.refill-threshold)
Prefetch guard:  AtomicBoolean CAS — only one background fetch runs per session
```

### 6.3 Time-Warp Delay Calculation

```
delay_ms = clamp(
    (tick[n+1].timestamp - tick[n].timestamp).toMillis() / speedMultiplier,
    0,
    maxTickDelayMs
)
```

Examples:

| Data cadence | Speed | Emission rate |
|-------------|-------|--------------|
| 1-minute candles | 1× | 1 tick / 60 seconds |
| 1-minute candles | 60× | 1 tick / 1 second |
| 1-minute candles | 3600× | 1 tick / ~17 ms |
| 1-second ticks | 1× | 1 tick / 1 second |
| 1-second ticks | 100× | 1 tick / 10 ms |

### 6.4 Thread Safety Model

| Component | Concurrency mechanism |
|-----------|----------------------|
| `DataBufferService.tickQueue` | `ConcurrentLinkedQueue` (lock-free) |
| `DataBufferService.prefetchInProgress` | `AtomicBoolean` CAS |
| `DataBufferService.nextFetchStart` | `AtomicReference<Instant>` |
| `ReplaySessionState.replayState` | `AtomicReference<State>` with CAS transitions |
| `ReplaySessionState.nextTickFuture` | `volatile` field |
| `Portfolio.cashBalance` | `synchronized` on `this` |
| `WebSocketSessionRegistry.sendMessage` | `synchronized` on `WebSocketSession` |
| Session registry (`sessions` map) | `ConcurrentHashMap` |

---

## 7. Database Schema

```sql
CREATE TABLE market_ticks (
    ts       TIMESTAMPTZ      NOT NULL,   -- partition key
    id       UUID             NOT NULL,   -- row uniqueness
    symbol   VARCHAR(20)      NOT NULL,   -- e.g. "AAPL"
    region   VARCHAR(10)      NOT NULL,   -- e.g. "US"
    exchange VARCHAR(50)      NOT NULL,   -- e.g. "NASDAQ"
    open     DOUBLE PRECISION NOT NULL,
    high     DOUBLE PRECISION NOT NULL,
    low      DOUBLE PRECISION NOT NULL,
    close    DOUBLE PRECISION NOT NULL,
    volume   BIGINT           NOT NULL,
    PRIMARY KEY (ts, id)                  -- UUID must be paired with partition key
);

-- TimescaleDB converts this to a hypertable with 1-day chunks
SELECT create_hypertable('market_ticks', 'ts', chunk_time_interval => INTERVAL '1 day');
```

### Indexes

| Index name | Columns | Used for |
|-----------|---------|---------|
| `idx_market_ticks_symbol_ts` | `(symbol, ts DESC)` | Primary replay query |
| `idx_market_ticks_region_exchange_ts` | `(region, exchange, ts DESC)` | Exchange-filtered queries |
| `idx_market_ticks_symbol_exchange_ts` | `(symbol, exchange, ts DESC)` | Covering index |

### Adding Your Own Data

```sql
INSERT INTO market_ticks (ts, id, symbol, region, exchange, open, high, low, close, volume)
VALUES
  ('2024-06-01 09:30:00+00', gen_random_uuid(), 'NVDA', 'US', 'NASDAQ', 800.0, 812.5, 798.3, 810.2, 1200000),
  ('2024-06-01 09:31:00+00', gen_random_uuid(), 'NVDA', 'US', 'NASDAQ', 810.2, 815.0, 809.1, 813.7, 980000);
```

Or use COPY for bulk CSV ingestion:
```bash
psql -h localhost -U mreplay -d marketreplay \
  -c "\COPY market_ticks(ts,id,symbol,region,exchange,open,high,low,close,volume) FROM 'ticks.csv' CSV HEADER"
```

---

## 8. Configuration Reference

All settings live in `src/main/resources/application.yml`.

```yaml
app:
  replay:
    scheduler-threads: 16       # Max concurrent replay sessions
    max-tick-delay-ms: 5000     # Cap on inter-tick delay regardless of speed
    buffer-wait-ms: 50          # Retry interval when buffer is temporarily empty

  buffer:
    chunk-size: 500             # Ticks loaded per DB query
    refill-threshold: 100       # Trigger background fetch below this queue size

  seed:
    enabled: true               # Set false after first run if desired
```

**Environment variable overrides** (for Docker / CI):

| Env var | Maps to |
|---------|---------|
| `SPRING_DATASOURCE_URL` | `spring.datasource.url` |
| `SPRING_DATASOURCE_USERNAME` | `spring.datasource.username` |
| `SPRING_DATASOURCE_PASSWORD` | `spring.datasource.password` |
| `SPRING_PROFILES_ACTIVE` | Active Spring profile |

---

## 9. Component Reference

### `ReplayEngineService`
Owns the `ScheduledExecutorService` pool. Each active session drives a self-sustaining chain of `scheduler.schedule(emitNextTick, delay, MILLISECONDS)` calls. The chain terminates naturally when the buffer is exhausted, or is cancelled externally on PAUSE/STOP.

### `DataBufferService`
One instance per session. Wraps a `ConcurrentLinkedQueue<MarketTick>`. Background prefetch is triggered by a CAS on `prefetchInProgress` — only one thread fetches per session at a time. Uses keyset pagination to avoid O(n) offset scans.

### `SessionManagerService`
Central registry (`ConcurrentHashMap<String, ReplaySessionState>`). Owns the shared `ExecutorService` for prefetch workers (cached thread pool — scales to demand).

### `PaperTradingService`
Stateless service. Reads `lastEmittedTick` from the session state (set by the replay engine), validates and executes the order on the `Portfolio`, then pushes both `EXECUTION_REPORT` and `PORTFOLIO_SNAPSHOT` back over WebSocket.

### `Portfolio`
All mutation methods (`executeBuy`, `executeSell`) are `synchronized` on `this`. `ConcurrentHashMap` used for position reads. `getSnapshot()` produces an immutable copy for serialization.

### `WebSocketSessionRegistry`
Each `sendMessage()` call acquires the intrinsic lock of the `WebSocketSession` object, preventing concurrent writes from the replay scheduler thread and the WebSocket handler thread from interleaving on the same TCP stream.

---

## 10. Data Flow Walkthrough

### Full lifecycle: SUBSCRIBE → TICK stream → ORDER → COMPLETED

```
1. Client connects to ws://localhost:8080/ws/market-replay
   Server → { "type": "REPLAY_STATUS", "data": "CONNECTED" }

2. Client sends SUBSCRIBE
   Server:
     a. Creates DataBufferService, Portfolio, ReplaySessionState
     b. Calls DataBufferService.initialize() — loads first 500 ticks from DB
     c. Starts emission chain via ScheduledExecutorService
   Server → { "type": "REPLAY_STATUS", "data": "STARTED" }

3. Emission chain fires every N ms (calculated from tick timestamps / speed)
   Server → { "type": "TICK", "data": { "timestamp": "...", "symbol": "AAPL",
              "open": 182.5, "high": 183.1, "low": 182.2, "close": 182.8, "volume": 123456 } }

4. When queue drops below 100 ticks — background prefetch fires automatically
   (invisible to client)

5. Client sends ORDER
   Server:
     a. Reads lastEmittedTick.close as execution price
     b. Validates cash / position
     c. Mutates Portfolio atomically
   Server → { "type": "EXECUTION_REPORT", "data": { "status": "FILLED", ... } }
   Server → { "type": "PORTFOLIO_SNAPSHOT", "data": { "cashBalance": 98175.0, ... } }

6. All ticks consumed
   Server → { "type": "REPLAY_STATUS", "data": "COMPLETED" }
```

---

## 11. Performance Tuning

### For high-speed replays (>100× with sub-10ms tick cadence)

- Increase `scheduler-threads` to match the number of concurrent sessions.
- Increase `chunk-size` to 2000–5000 to reduce prefetch frequency.
- Reduce `refill-threshold` to 50 if memory is constrained.
- On TimescaleDB side, ensure `work_mem` is set to at least `64MB` for index scans.

### For many concurrent sessions (>50)

- Use a connection pool of at least `sessions × 2` (`hikari.maximum-pool-size`).
- Each session's prefetch thread uses one connection for a bounded time (the duration of one chunk query). With 50 sessions and 500-tick chunks, peak connection usage is manageable.

### TimescaleDB chunk interval tuning

The default `chunk_time_interval` is 1 day. If your data has:
- Sub-second granularity → use `INTERVAL '1 hour'`
- Daily bars → use `INTERVAL '1 month'`

Reconfigure with:
```sql
SELECT set_chunk_time_interval('market_ticks', INTERVAL '1 hour');
```

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `COMPLETED` sent immediately after `STARTED` | No data in DB for that symbol/date range | Check seed ran; verify date range matches seeded data (2024-01-02 to 2024-01-08) |
| Ticks emit too slowly despite high speed | `maxTickDelayMs` cap is hit | Lower `app.replay.max-tick-delay-ms` |
| `ERROR: Insufficient funds` on BUY | `initialCash` too low | Set `initialCash` higher in SUBSCRIBE payload |
| WebSocket drops on rapid fire | Concurrent send race | Already handled via `synchronized(session)` in registry |
| DB connection timeout on startup | TimescaleDB not yet ready | Increase `docker-compose` `start_period` for healthcheck |
| Flyway baseline error | Existing schema without Flyway metadata | Set `spring.flyway.baseline-on-migrate=true` (already set) |
| Out of memory with large speed | Buffer loading too fast | Reduce `chunk-size` |
