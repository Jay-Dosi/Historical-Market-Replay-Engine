import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useReplaySession } from './hooks/useReplaySession';
import { SubscribeForm }  from './components/session/SubscribeForm';
import { ReplayControls } from './components/session/ReplayControls';
import { CandlestickChart } from './components/chart/CandlestickChart';
import { OrderDesk }      from './components/trading/OrderDesk';
import { ExecutionLog }   from './components/trading/ExecutionLog';
import { PortfolioPanel } from './components/portfolio/PortfolioPanel';
import { fmtUSD, pctChange } from './utils/format';
import type { SubscribePayload } from './types/market';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws/market-replay';

// ── Status dot colours ────────────────────────────────────────────────────
const WS_DOT: Record<string, string> = {
  disconnected: '#454F6B',
  connecting:   '#F5C842',
  connected:    '#00D4AA',
  error:        '#FF4560',
};

export default function App() {
  const session = useReplaySession();

  // Chart container size (responsive)
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ w: 800, h: 400 });

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setChartSize({ w: Math.floor(width), h: Math.floor(height) });
    });
    if (chartContainerRef.current) obs.observe(chartContainerRef.current);
    return () => obs.disconnect();
  }, []);

  // Derive current price change
  const firstTick = session.ticks[0];
  const priceChange = firstTick && session.lastTick
    ? pctChange(firstTick.close, session.lastTick.close)
    : null;

  // Active symbol from last tick or idle placeholder
  const activeSymbol = session.lastTick?.symbol ?? '—';

  // Can trade if session is started or paused (last tick is present)
  const canTrade = !!session.lastTick && (session.sessionStatus === 'started' || session.sessionStatus === 'paused');

  const handleSubscribe = useCallback((payload: SubscribePayload) => {
    session.subscribe(payload);
  }, [session]);

  const activePosition = session.portfolio
    ? (session.portfolio.positions[activeSymbol] ?? 0)
    : 0;

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <header style={{
        height: 48,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 20,
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Logo */}
        <span style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: 700,
          fontSize: 14,
          color: 'var(--txt-1)',
          letterSpacing: '-0.02em',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ color: 'var(--accent)' }}>◈</span> REPLAY ENGINE
        </span>

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        {/* Symbol + price */}
        {session.lastTick && (
          <>
            <span style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700, fontSize: 14,
              color: 'var(--accent)',
            }}>
              {activeSymbol}
            </span>
            <span className="font-mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--txt-1)' }}>
              {fmtUSD(session.lastTick.close)}
            </span>
            {priceChange !== null && (
              <span className="font-mono" style={{
                fontSize: 12,
                color: priceChange >= 0 ? 'var(--bull)' : 'var(--bear)',
              }}>
                {priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
              </span>
            )}
            {session.lastTick && (
              <span className="font-mono" style={{ fontSize: 10, color: 'var(--txt-3)' }}>
                O:{session.lastTick.open.toFixed(2)}&nbsp;
                H:{session.lastTick.high.toFixed(2)}&nbsp;
                L:{session.lastTick.low.toFixed(2)}&nbsp;
                V:{(session.lastTick.volume / 1000).toFixed(0)}K
              </span>
            )}
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Error toast */}
        {session.error && (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            color: 'var(--bear)',
            background: 'rgba(255,69,96,0.1)',
            border: '1px solid rgba(255,69,96,0.2)',
            padding: '3px 10px',
            borderRadius: 4,
            maxWidth: 320,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            ⚠ {session.error}
          </span>
        )}

        {/* WS Connect / Disconnect */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: WS_DOT[session.wsStatus],
              display: 'inline-block',
              animation: session.wsStatus === 'connecting' ? 'pulse-dot 1s infinite' : 'none',
            }}
          />
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 10, color: 'var(--txt-2)', letterSpacing: '0.06em' }}>
            {session.wsStatus.toUpperCase()}
          </span>
          {session.wsStatus === 'disconnected' || session.wsStatus === 'error' ? (
            <button className="btn btn-accent" style={{ padding: '4px 10px', fontSize: 11 }} onClick={session.connectWs}>
              Connect
            </button>
          ) : (
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={session.disconnectWs}>
              Disconnect
            </button>
          )}
        </div>
      </header>

      {/* ── Body: 3 panels ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 0 }}>

        {/* ── Left panel: Session Config ─────────────────────────────── */}
        <aside style={{
          width: 256,
          minWidth: 256,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          <div className="panel-header">Session</div>
          <div style={{ padding: '12px 14px' }}>
            <SubscribeForm
              onSubscribe={handleSubscribe}
              disabled={
                session.wsStatus !== 'connected' ||
                session.sessionStatus === 'started' ||
                session.sessionStatus === 'paused' ||
                session.sessionStatus === 'downloading'
              }
            />
          </div>

          <hr className="divider" style={{ margin: '0 14px' }} />

          <div className="panel-header" style={{ borderTop: '1px solid var(--border)', borderBottom: 'none' }}>
            Controls
          </div>
          <div style={{ padding: '12px 14px' }}>
            <ReplayControls
              status={session.sessionStatus}
              speed={0}
              onPause={session.pause}
              onResume={session.resume}
              onStop={session.stop}
            />
          </div>

          {/* Tick counter */}
          {session.ticks.length > 0 && (
            <div style={{
              margin: '0 14px 12px',
              padding: '7px 10px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span className="label" style={{ margin: 0 }}>Ticks Received</span>
              <span className="font-mono text-accent" style={{ fontSize: 12 }}>
                {session.ticks.length.toLocaleString()}
              </span>
            </div>
          )}
        </aside>

        {/* ── Center panel: Chart ────────────────────────────────────── */}
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg-base)',
        }}>
          {/* Chart header */}
          <div style={{
            height: 36,
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 12,
            flexShrink: 0,
            background: 'var(--bg-surface)',
          }}>
            <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--txt-3)', letterSpacing: '0.08em' }}>
              CANDLESTICK · 1-MIN OHLCV
            </span>
            <div style={{ flex: 1 }} />
            <span className="font-mono" style={{ fontSize: 10, color: 'var(--txt-3)' }}>
              {session.ticks.length > 0
                ? `Showing last ${Math.min(session.ticks.length, 80)} of ${session.ticks.length} candles`
                : 'No data'}
            </span>
            <span style={{
              fontSize: 10,
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: session.sessionStatus === 'started' ? 'var(--bull)' : 'var(--txt-3)',
            }}>
              {session.sessionStatus === 'started' ? '● LIVE' : session.sessionStatus === 'downloading' ? 'DOWNLOADING...' : session.sessionStatus.toUpperCase()}
            </span>
          </div>

          {/* Chart */}
          <div ref={chartContainerRef} style={{ flex: 1, overflow: 'hidden' }}>
            <CandlestickChart
              ticks={session.ticks}
              width={chartSize.w}
              height={chartSize.h}
            />
          </div>
        </main>

        {/* ── Right panel: Trading ───────────────────────────────────── */}
        <aside style={{
          width: 272,
          minWidth: 272,
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          {/* Portfolio */}
          <div className="panel-header">Portfolio</div>
          <PortfolioPanel
            portfolio={session.portfolio}
            lastPrice={session.lastTick?.close ?? null}
          />

          <hr className="divider" style={{ margin: '0 14px' }} />

          {/* Order desk */}
          <div className="panel-header" style={{ borderTop: '1px solid var(--border)', borderBottom: 'none' }}>
            Order Desk
          </div>
          <div style={{ padding: '12px 14px' }}>
            <OrderDesk
              symbol={activeSymbol}
              lastPrice={session.lastTick?.close ?? null}
              cashBalance={session.portfolio?.cashBalance ?? null}
              position={activePosition}
              canTrade={canTrade}
              onOrder={session.placeOrder}
            />
          </div>

          <hr className="divider" style={{ margin: '0 14px' }} />

          {/* Execution log */}
          <div className="panel-header" style={{ borderTop: '1px solid var(--border)', borderBottom: 'none' }}>
            Executions ({session.executions.length})
          </div>
          <ExecutionLog executions={session.executions} />
        </aside>
      </div>
    </div>
  );
}
