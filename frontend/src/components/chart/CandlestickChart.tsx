import React, { useMemo } from 'react';
import type { TickData } from '../../types/market';
import { fmtUSD, fmtVolume, fmtTime } from '../../utils/format';

interface Props {
  ticks:       TickData[];
  width:       number;
  height:      number;
}

const PAD   = { top: 24, right: 72, bottom: 44, left: 8 };
const V_H   = 52;          // volume panel height
const PRICE_GRID_LINES = 5;
const MAX_VISIBLE = 80;
const CANDLE_RATIO = 0.65; // candle body vs slot width

export const CandlestickChart: React.FC<Props> = ({ ticks, width, height }) => {
  const visible   = ticks.slice(-MAX_VISIBLE);
  const mainH     = height - PAD.top - PAD.bottom - V_H - 8;
  const mainW     = width - PAD.left - PAD.right;
  const slotW     = mainW / MAX_VISIBLE;
  const candleW   = Math.max(slotW * CANDLE_RATIO, 1);

  const { minP, maxP, maxVol } = useMemo(() => {
    if (!visible.length) return { minP: 0, maxP: 1, maxVol: 1 };
    const prices = visible.flatMap(t => [t.high, t.low]);
    const raw_min = Math.min(...prices);
    const raw_max = Math.max(...prices);
    const pad = (raw_max - raw_min) * 0.06;
    return {
      minP:   raw_min - pad,
      maxP:   raw_max + pad,
      maxVol: Math.max(...visible.map(t => t.volume)),
    };
  }, [visible]);

  const py = (price: number) =>
    PAD.top + mainH - ((price - minP) / (maxP - minP)) * mainH;

  const vy = (vol: number) =>
    (height - PAD.bottom) - (vol / maxVol) * (V_H * 0.85);

  // Y-axis price labels
  const priceLabels = useMemo(() => {
    const step = (maxP - minP) / PRICE_GRID_LINES;
    return Array.from({ length: PRICE_GRID_LINES + 1 }, (_, i) => minP + step * i);
  }, [minP, maxP]);

  // X-axis time labels (every ~10 candles)
  const timeLabels = useMemo(() => {
    const step = Math.max(1, Math.floor(visible.length / 6));
    return visible
      .filter((_, i) => i % step === 0)
      .map((t, i) => ({ i: i * step, label: fmtTime(t.timestamp) }));
  }, [visible]);

  const lastTick = visible[visible.length - 1];

  if (!width || !height || visible.length === 0) {
    return (
      <div
        style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        className="text-txt-3 font-mono text-xs"
      >
        Waiting for data…
      </div>
    );
  }

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="volGradBull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00C896" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#00C896" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="volGradBear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF4560" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FF4560" stopOpacity="0.05" />
        </linearGradient>
        <clipPath id="chartClip">
          <rect x={PAD.left} y={PAD.top} width={mainW} height={mainH} />
        </clipPath>
      </defs>

      {/* ── Background ────────────────────────────────────────────── */}
      <rect x={0} y={0} width={width} height={height} fill="transparent" />

      {/* ── Grid lines ────────────────────────────────────────────── */}
      {priceLabels.map((p, i) => (
        <line
          key={i}
          x1={PAD.left}
          y1={py(p)}
          x2={PAD.left + mainW}
          y2={py(p)}
          stroke="#1E2840"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
      ))}

      {/* ── Price axis labels ──────────────────────────────────────── */}
      {priceLabels.map((p, i) => (
        <text
          key={i}
          x={PAD.left + mainW + 6}
          y={py(p) + 4}
          fill="#454F6B"
          fontSize={10}
          fontFamily="JetBrains Mono, monospace"
        >
          {p.toFixed(2)}
        </text>
      ))}

      {/* ── Volume separator ──────────────────────────────────────── */}
      <line
        x1={PAD.left}
        y1={height - PAD.bottom - V_H}
        x2={PAD.left + mainW}
        y2={height - PAD.bottom - V_H}
        stroke="#1E2840"
        strokeWidth={1}
      />

      {/* ── Candles (clipped) ─────────────────────────────────────── */}
      <g clipPath="url(#chartClip)">
        {visible.map((tick, i) => {
          const isBull = tick.close >= tick.open;
          const fill   = isBull ? '#00C896' : '#FF4560';
          const cx     = PAD.left + i * slotW + slotW / 2;
          const bodyT  = py(Math.max(tick.open, tick.close));
          const bodyB  = py(Math.min(tick.open, tick.close));
          const bodyH  = Math.max(bodyB - bodyT, 1.5);
          const isLast = i === visible.length - 1;

          return (
            <g key={tick.timestamp}>
              {/* Wick */}
              <line
                x1={cx} y1={py(tick.high)}
                x2={cx} y2={py(tick.low)}
                stroke={fill}
                strokeWidth={1}
                opacity={0.9}
              />
              {/* Body */}
              <rect
                x={cx - candleW / 2}
                y={bodyT}
                width={candleW}
                height={bodyH}
                fill={fill}
                opacity={isLast ? 1 : 0.85}
              />
              {/* Pulse on last candle */}
              {isLast && (
                <rect
                  x={cx - candleW / 2 - 2}
                  y={bodyT - 2}
                  width={candleW + 4}
                  height={bodyH + 4}
                  fill="none"
                  stroke={fill}
                  strokeWidth={1}
                  opacity={0.4}
                  rx={1}
                />
              )}
            </g>
          );
        })}
      </g>

      {/* ── Volume bars ───────────────────────────────────────────── */}
      {visible.map((tick, i) => {
        const isBull = tick.close >= tick.open;
        const cx     = PAD.left + i * slotW + slotW / 2;
        const vTop   = vy(tick.volume);
        const vBot   = height - PAD.bottom;

        return (
          <rect
            key={`vol-${tick.timestamp}`}
            x={cx - candleW / 2}
            y={vTop}
            width={candleW}
            height={Math.max(vBot - vTop, 1)}
            fill={isBull ? 'url(#volGradBull)' : 'url(#volGradBear)'}
            opacity={0.7}
          />
        );
      })}

      {/* ── Current price line ────────────────────────────────────── */}
      {lastTick && (
        <>
          <line
            x1={PAD.left}
            y1={py(lastTick.close)}
            x2={PAD.left + mainW}
            y2={py(lastTick.close)}
            stroke="#00D4AA"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.6}
          />
          <rect
            x={PAD.left + mainW + 1}
            y={py(lastTick.close) - 9}
            width={PAD.right - 3}
            height={18}
            fill="#00D4AA"
            rx={3}
          />
          <text
            x={PAD.left + mainW + 5}
            y={py(lastTick.close) + 5}
            fill="#000"
            fontSize={10}
            fontFamily="JetBrains Mono, monospace"
            fontWeight="600"
          >
            {lastTick.close.toFixed(2)}
          </text>
        </>
      )}

      {/* ── X-axis time labels ────────────────────────────────────── */}
      {timeLabels.map(({ i, label }) => {
        const cx = PAD.left + i * slotW + slotW / 2;
        return (
          <text
            key={i}
            x={cx}
            y={height - PAD.bottom + 14}
            textAnchor="middle"
            fill="#454F6B"
            fontSize={10}
            fontFamily="JetBrains Mono, monospace"
          >
            {label}
          </text>
        );
      })}

      {/* ── X axis baseline ───────────────────────────────────────── */}
      <line
        x1={PAD.left}
        y1={height - PAD.bottom}
        x2={PAD.left + mainW}
        y2={height - PAD.bottom}
        stroke="#1E2840"
        strokeWidth={1}
      />

      {/* ── Y axis baseline ───────────────────────────────────────── */}
      <line
        x1={PAD.left + mainW}
        y1={PAD.top}
        x2={PAD.left + mainW}
        y2={height - PAD.bottom}
        stroke="#1E2840"
        strokeWidth={1}
      />

      {/* ── Volume label ──────────────────────────────────────────── */}
      {lastTick && (
        <text
          x={PAD.left + 4}
          y={height - PAD.bottom - V_H + 12}
          fill="#454F6B"
          fontSize={9}
          fontFamily="JetBrains Mono, monospace"
        >
          VOL {fmtVolume(lastTick.volume)}
        </text>
      )}
    </svg>
  );
};
