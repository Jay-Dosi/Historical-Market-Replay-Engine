# Market Replay Engine — Frontend

A production-grade trading workstation UI built with **React 18 + TypeScript + Vite**.

Connects to the backend via WebSocket and streams live candlestick data, supports
paper trading with a full portfolio tracker and execution log.

---

## Quick Start

### Prerequisites
- Node.js 18+
- The backend running at `http://localhost:8080`

### Run

```bash
npm install
npm run dev
# → http://localhost:3000
```

### Build for production

```bash
npm run build
npm run preview
```

---

## Configuration

Copy `.env.example` to `.env` and set the WebSocket URL if your backend
runs on a different host/port:

```bash
cp .env.example .env
# Edit VITE_WS_URL=ws://your-host:port/ws/market-replay
```

---

## Usage Flow

1. **Connect** — click the Connect button in the header to open the WebSocket.
2. **Configure** — choose a symbol (AAPL / TSLA / SPY), date range, speed, and starting cash in the left panel.
3. **Start Replay** — the chart begins streaming 1-min OHLCV candles in real time.
4. **Trade** — use the Order Desk (right panel) to place BUY/SELL orders against the live price.
5. **Monitor** — the Portfolio panel tracks equity, cash, open positions and PnL.
6. **Pause / Resume / Stop** — playback controls are in the left panel.

---

## Project Structure

```
src/
├── types/market.ts               TypeScript types (mirrors API_REFERENCE.md)
├── hooks/
│   ├── useWebSocket.ts           Raw WebSocket lifecycle hook
│   └── useReplaySession.ts       Full session state + action dispatcher
├── components/
│   ├── chart/
│   │   ├── CandlestickChart.tsx  Pure SVG OHLCV candlestick chart
│   │   └── ChartHeader.tsx       OHLCV bar header row
│   ├── session/
│   │   ├── ConnectionBar.tsx     WS connect/disconnect
│   │   ├── SubscribeForm.tsx     Replay config form
│   │   └── ReplayControls.tsx    Pause / Resume / Stop + status badge
│   ├── trading/
│   │   ├── OrderDesk.tsx         BUY/SELL order form
│   │   └── ExecutionLog.tsx      Trade history list
│   └── portfolio/
│       └── PortfolioPanel.tsx    Equity, cash, positions, PnL
├── utils/format.ts               Number/date formatters
├── App.tsx                       3-panel workstation layout
├── main.tsx                      React entry point
└── index.css                     Design tokens + Tailwind base
```

---

## Pre-seeded Symbols & Test Date Ranges

| Symbol | Exchange | Valid range |
|--------|----------|-------------|
| AAPL   | NASDAQ   | 2024-01-02T09:30:00Z → 2024-01-08T16:00:00Z |
| TSLA   | NASDAQ   | 2024-01-02T09:30:00Z → 2024-01-08T16:00:00Z |
| SPY    | NYSE     | 2024-01-02T09:30:00Z → 2024-01-08T16:00:00Z |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 + custom CSS tokens |
| Chart | Pure React SVG (no D3 dependency) |
| State | `useReducer` + custom hooks (no external state library) |
| Fonts | Space Grotesk · Inter · JetBrains Mono |
