# Market Replay Engine

A production-grade historical market data replay system built with **Java 21**, **Spring Boot 3.x**, and **TimescaleDB**.

## Quick Start

```bash
docker-compose up --build
```

- **Engine:** `ws://localhost:8080/ws/market-replay`
- **Health:** `http://localhost:8080/api/health`
- **PGAdmin:** `http://localhost:5050` (admin@marketreplay.com / admin_secret)

## Documentation

| Document | Description |
|----------|-------------|
| [`BACKEND_GUIDE.md`](./BACKEND_GUIDE.md) | Architecture, setup, DB schema, tuning, troubleshooting |
| [`API_REFERENCE.md`](./API_REFERENCE.md) | Full WebSocket + REST API reference with TypeScript types and client examples |

## Pre-seeded Symbols

`AAPL`, `TSLA`, `SPY` — 5 trading days of 1-minute OHLCV candles (2024-01-02 → 2024-01-08).

## Tech Stack

- Java 21 · Spring Boot 3.2 · Spring WebSocket
- TimescaleDB (PostgreSQL 15) · Flyway · Spring Data JPA
- Docker + Docker Compose · Maven
