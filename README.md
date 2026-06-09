# Historical Market Replay Engine

A production-grade "flight simulator" for algorithmic trading. This system acts as a backend infrastructure that takes historical stock market data and broadcasts it over a live network connection as if it were happening right now. Developers can connect their trading bots (or the provided React frontend) to this system to practice trading against historical conditions without risking real capital.

## 🚀 Quick Start

Run the entire system (Frontend, Backend Engine, TimescaleDB, and PGAdmin) with a single command:

```bash
docker-compose up --build
```

### Accessing the Services

Once the containers are up, the services will be available at:

| Service | Address | Description |
|---------|---------|-------------|
| **Frontend Workstation** | `http://localhost:3000` | The React UI to visualize data and place paper trades |
| **Backend Engine WS** | `ws://localhost:8080/ws/market-replay` | The raw WebSocket URL to connect trading bots |
| **Backend Health Check** | `http://localhost:8080/api/health` | REST endpoint for engine health |
| **PGAdmin (Database GUI)** | `http://localhost:5050` | Login: `admin@marketreplay.com` / `admin_secret` |
| **TimescaleDB** | `localhost:5432` | Login: `mreplay` / `mreplay_secret` |

*Note: On the first boot, the system will automatically seed 5 trading days of synthetic 1-minute OHLCV data for `AAPL`, `TSLA`, and `SPY` (2024-01-02 to 2024-01-08). This process takes ~5-10 seconds.*

---

## 📖 What This Project Can Do

### 1. Time Compression ("The Time Machine")
Fast-forward historical market data at custom speeds (e.g., 60x, 100x). Compress months of historical price action into hours of live simulation so algorithms can be tested rapidly.

### 2. Smart On-Demand Data Fetching (Yahoo Finance API)
The engine automatically scales its resolution based on your requested date range. If you request recent data (e.g. the last 7 days), the backend automatically hits the Yahoo Finance API, downloads lightning-fast **1-minute intraday candles**, saves them to the TimescaleDB database, and streams them to the UI. If you request older data (e.g. 3 years ago), it smartly falls back to fetching **1-day candles**. You can seamlessly toggle between the local database and the Yahoo API directly in the UI.

### 2. High-Performance WebSocket Streaming
A precise, multithreaded `ScheduledExecutorService` metronome calculates exact millisecond delays and blasts historical data down a WebSocket tunnel precisely at your requested speed multiplier.

### 3. Paper Trading Execution
Contains an in-memory execution desk (`PaperTradingService`). As the live stream flows, your bots (or the UI) can fire back `BUY` or `SELL` commands. The engine will instantly check the exact historical price broadcast at that millisecond, allocate shares, and manage your virtual portfolio balance.

### 4. Memory-Optimized Data Buffering
Fetches millions of rows of data from TimescaleDB smoothly. It uses a custom `DataBufferService` that continuously queries the database in the background using keyset pagination, keeping an active window of data in a thread-safe `ConcurrentLinkedQueue` so the WebSocket never pauses or waits for disk I/O.

---

## 🛠 Architecture & Tech Stack

### Backend (The Engine)
* **Java 21 + Spring Boot 3.x:** High-performance, multithreaded core logic.
* **Spring WebSockets:** Bi-directional JSON tunnels for streaming market ticks and receiving bot orders.
* **TimescaleDB (PostgreSQL):** Optimized for time-series data. Stores billions of market ticks using partitioned hypertables.

### Frontend (The Workstation)
* **React 18 + TypeScript + Vite:** Modern, fast trading UI.
* **Tailwind CSS:** Pure UI styling without heavy component libraries.
* **Pure SVG Charting:** Custom-built React OHLCV candlestick rendering, eliminating heavy dependencies like D3.

---

## 📚 Documentation

For an in-depth dive into the APIs and Architecture, see the backend guides:
* [Backend Architecture & Tuning Guide](./backend/BACKEND_GUIDE.md)
* [WebSocket API Reference (For connecting Bots)](./backend/API_REFERENCE.md)

---

## 💾 Bulk Importing Historical Data (Years of 1-Minute Data)

Because financial APIs charge huge fees for years of 1-minute historical data, the best way to test older granular data is by bulk importing CSV files directly into the database.

**Where to get CSVs:**
* **[Kaggle](https://www.kaggle.com/)** (Free datasets of S&P 500 minute data)
* **[Alpaca](https://alpaca.markets/)** (Free API account allows fetching older minute data via python scripts to CSV)
* **[Polygon.io](https://polygon.io/)** (Paid tier for deep historical minute data)

**How to Import:**
Once you have a `ticks.csv` file, import it directly into TimescaleDB. The engine is optimized to handle billions of rows:
```bash
psql -h localhost -U mreplay -d marketreplay \
  -c "\COPY market_ticks(ts,id,symbol,region,exchange,open,high,low,close,volume) FROM 'ticks.csv' CSV HEADER"
```
