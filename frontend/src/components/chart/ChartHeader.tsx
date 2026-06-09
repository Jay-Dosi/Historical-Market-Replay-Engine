import React from 'react';
import type { TickData } from '../../types/market';
import { fmtUSD, fmtVolume, pctChange } from '../../utils/format';

interface Props {
  ticks:     TickData[];
  lastTick:  TickData | null;
  status:    string;
}

export const ChartHeader: React.FC<Props> = ({ ticks, lastTick, status }) => {
  const firstTick   = ticks[0];
  const change      = firstTick && lastTick ? pctChange(firstTick.close, lastTick.close) : null;
  const isPos       = change !== null && change >= 0;

  if (!lastTick) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: '0 16px',
      height: '100%',
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      <div style={{ display: 'flex', gap: 16 }}>
        {[
          { label: 'O', value: lastTick.open },
          { label: 'H', value: lastTick.high },
          { label: 'L', value: lastTick.low  },
          { label: 'C', value: lastTick.close },
        ].map(({ label, value }) => (
          <span key={label} style={{ fontSize: 11, color: 'var(--txt-2)' }}>
            <span style={{ color: 'var(--txt-3)', marginRight: 3 }}>{label}</span>
            {value.toFixed(2)}
          </span>
        ))}
        <span style={{ fontSize: 11, color: 'var(--txt-2)' }}>
          <span style={{ color: 'var(--txt-3)', marginRight: 3 }}>V</span>
          {fmtVolume(lastTick.volume)}
        </span>
      </div>

      {change !== null && (
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: isPos ? 'var(--bull)' : 'var(--bear)',
          background: isPos ? 'rgba(0,200,150,0.08)' : 'rgba(255,69,96,0.08)',
          padding: '2px 8px',
          borderRadius: 3,
        }}>
          {isPos ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
        </span>
      )}
    </div>
  );
};
