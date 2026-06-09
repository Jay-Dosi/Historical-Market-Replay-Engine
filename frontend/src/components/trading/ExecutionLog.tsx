import React from 'react';
import type { ExecutionReport } from '../../types/market';
import { fmtUSD, fmtDateTime } from '../../utils/format';

interface Props { executions: ExecutionReport[]; }

export const ExecutionLog: React.FC<Props> = ({ executions }) => {
  if (executions.length === 0) {
    return (
      <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 11 }}>
        No trades yet
      </div>
    );
  }

  return (
    <div style={{ overflowY: 'auto', maxHeight: 200 }}>
      {executions.map((ex, i) => {
        const isFilled = ex.status === 'FILLED';
        const isBuy    = ex.type === 'BUY';
        return (
          <div
            key={ex.orderId}
            className="animate-slide-in"
            style={{
              padding: '7px 14px',
              borderBottom: '1px solid var(--border)',
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: '0 8px',
              alignItems: 'center',
              animationDelay: `${i === 0 ? 0 : 0}ms`,
            }}
          >
            {/* Side badge */}
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                fontFamily: 'Space Grotesk, sans-serif',
                letterSpacing: '0.05em',
                padding: '2px 5px',
                borderRadius: 3,
                color: isBuy ? 'var(--bull)' : 'var(--bear)',
                background: isBuy
                  ? 'rgba(0,200,150,0.12)'
                  : 'rgba(255,69,96,0.12)',
                border: `1px solid ${isBuy ? 'rgba(0,200,150,0.2)' : 'rgba(255,69,96,0.2)'}`,
              }}
            >
              {ex.type}
            </span>

            {/* Details */}
            <div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--txt-1)' }}>
                  {ex.quantity} {ex.symbol}
                </span>
                {!isFilled && (
                  <span style={{
                    fontSize: 9, color: 'var(--bear)',
                    background: 'rgba(255,69,96,0.1)',
                    padding: '1px 4px', borderRadius: 2,
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 700,
                  }}>
                    REJECTED
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: 'var(--txt-3)', marginTop: 1, fontFamily: 'JetBrains Mono, monospace' }}>
                {fmtDateTime(ex.executedAt)}
              </div>
            </div>

            {/* Price */}
            <div style={{ textAlign: 'right' }}>
              <div className="font-mono" style={{ fontSize: 11, color: isFilled ? 'var(--txt-1)' : 'var(--txt-3)' }}>
                {fmtUSD(ex.executedPrice)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--txt-3)', fontFamily: 'JetBrains Mono, monospace' }}>
                {fmtUSD(ex.totalValue, 0)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
