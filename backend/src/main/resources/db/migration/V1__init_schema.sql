-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Main market ticks hypertable
CREATE TABLE IF NOT EXISTS market_ticks
(
    ts       TIMESTAMPTZ      NOT NULL,
    id       UUID             NOT NULL DEFAULT gen_random_uuid(),
    symbol   VARCHAR(20)      NOT NULL,
    region   VARCHAR(10)      NOT NULL,
    exchange VARCHAR(50)      NOT NULL,
    open     DOUBLE PRECISION NOT NULL,
    high     DOUBLE PRECISION NOT NULL,
    low      DOUBLE PRECISION NOT NULL,
    close    DOUBLE PRECISION NOT NULL,
    volume   BIGINT           NOT NULL,
    PRIMARY KEY (ts, id)
);

-- Convert to TimescaleDB hypertable partitioned by 1-day chunks
SELECT create_hypertable(
    'market_ticks',
    'ts',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Primary query pattern: symbol + time range
CREATE INDEX IF NOT EXISTS idx_market_ticks_symbol_ts
    ON market_ticks (symbol, ts DESC);

-- Region/exchange filtering
CREATE INDEX IF NOT EXISTS idx_market_ticks_region_exchange_ts
    ON market_ticks (region, exchange, ts DESC);

-- Covering index for symbol + exchange queries
CREATE INDEX IF NOT EXISTS idx_market_ticks_symbol_exchange_ts
    ON market_ticks (symbol, exchange, ts DESC);
