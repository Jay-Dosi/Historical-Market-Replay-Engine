import React from 'react';
import type { PortfolioSnapshot } from '../../types/market';
import { fmtUSD, fmtPct } from '../../utils/format';

interface Props {
  portfolio: PortfolioSnapshot | null;
  lastPrice: number | null;
}

export const PortfolioPanel: React.FC<Props> = ({ portfolio, lastPrice }) => {
  if (!portfolio) {
    return (
      <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 11 }}>
        Subscribe to a session to view portfolio
      </div>
    );
  }

  // Compute mark-to-market value of open positions
  const positionEntries = Object.entries(portfolio.positions);
  const openMarketValue = lastPrice
    ? positionEntries.reduce((acc, [, qty]) => acc + qty * lastPrice, 0)
    : 0;
  const totalEquity = portfolio.cashBalance + openMarketValue;
  const totalPnl    = totalEquity - portfolio.initialCash;
  const pnlPct      = portfolio.initialCash > 0 ? (totalPnl / portfolio.initialCash) * 100 : 0;
  const isPnlPos    = totalPnl >= 0;

  return (
    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Equity row */}
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 5,
        padding: '10px 12px',
      }}>
        <div className="label" style={{ margin: 0, marginBottom: 4 }}>Total Equity</div>
        <div style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--txt-1)',
          letterSpacing: '-0.01em',
        }}>
          {fmtUSD(totalEquity)}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
          color: isPnlPos ? 'var(--bull)' : 'var(--bear)',
        }}>
          {isPnlPos ? '▲' : '▼'} {fmtUSD(Math.abs(totalPnl))}
          &nbsp;({fmtPct(pnlPct)})
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <StatCard label="Cash" value={fmtUSD(portfolio.cashBalance, 0)} />
        <StatCard label="Open Value" value={openMarketValue > 0 ? fmtUSD(openMarketValue, 0) : '—'} />
        <StatCard label="Initial Cash" value={fmtUSD(portfolio.initialCash, 0)} />
        <StatCard label="Return" value={fmtPct(pnlPct)} color={isPnlPos ? 'var(--bull)' : 'var(--bear)'} />
      </div>

      {/* Positions */}
      {positionEntries.length > 0 && (
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Open Positions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {positionEntries.map(([sym, qty]) => {
              const mktVal = lastPrice ? qty * lastPrice : null;
              return (
                <div
                  key={sym}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    padding: '7px 10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{
                      fontFamily: 'Space Grotesk, sans-serif',
                      fontWeight: 600, fontSize: 12,
                      color: 'var(--accent)',
                    }}>
                      {sym}
                    </span>
                    <span className="font-mono" style={{ marginLeft: 8, fontSize: 11, color: 'var(--txt-2)' }}>
                      {qty} shares
                    </span>
                  </div>
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--txt-1)' }}>
                    {mktVal !== null ? fmtUSD(mktVal, 0) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {positionEntries.length === 0 && (
        <p style={{ fontSize: 11, color: 'var(--txt-3)', textAlign: 'center', margin: 0 }}>
          No open positions
        </p>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div style={{
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '7px 10px',
  }}>
    <div className="label" style={{ margin: 0, marginBottom: 2, fontSize: 10 }}>{label}</div>
    <div className="font-mono" style={{ fontSize: 12, color: color ?? 'var(--txt-1)' }}>{value}</div>
  </div>
);
