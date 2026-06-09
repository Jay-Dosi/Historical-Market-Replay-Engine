import React, { useState } from 'react';
import type { OrderPayload } from '../../types/market';
import { fmtUSD } from '../../utils/format';

interface Props {
  symbol:      string;
  lastPrice:   number | null;
  cashBalance: number | null;
  position:    number;
  canTrade:    boolean;
  onOrder:     (p: OrderPayload) => void;
}

export const OrderDesk: React.FC<Props> = ({
  symbol, lastPrice, cashBalance, position, canTrade, onOrder,
}) => {
  const [qty, setQty]   = useState<number>(1);
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');

  const estimatedValue = lastPrice ? lastPrice * qty : null;
  const canBuy  = canTrade && !!lastPrice && !!cashBalance && cashBalance >= (lastPrice * qty);
  const canSell = canTrade && position >= qty;

  const submit = () => {
    if (!canTrade || !lastPrice) return;
    onOrder({ symbol, type: side, quantity: qty });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Side toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button
          className={`btn ${side === 'BUY' ? 'btn-bull' : 'btn-ghost'}`}
          onClick={() => setSide('BUY')}
          style={{ fontSize: 13, fontWeight: 700 }}
        >
          ▲ BUY
        </button>
        <button
          className={`btn ${side === 'SELL' ? 'btn-bear' : 'btn-ghost'}`}
          onClick={() => setSide('SELL')}
          style={{ fontSize: 13, fontWeight: 700 }}
        >
          ▼ SELL
        </button>
      </div>

      {/* Price display */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '8px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span className="label" style={{ margin: 0 }}>Execution Price</span>
        <span className="font-mono" style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600 }}>
          {lastPrice ? fmtUSD(lastPrice) : '—'}
        </span>
      </div>

      {/* Quantity */}
      <div>
        <label className="label">Quantity (shares)</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setQty(q => Math.max(1, q - 1))}
            style={{ padding: '6px 10px', fontSize: 14 }}
          >
            −
          </button>
          <input
            type="number"
            value={qty}
            min={1}
            onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ textAlign: 'center' }}
          />
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setQty(q => q + 1)}
            style={{ padding: '6px 10px', fontSize: 14 }}
          >
            +
          </button>
        </div>
      </div>

      {/* Quick qty buttons */}
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 5, 10, 25, 50].map(q => (
          <button
            key={q}
            className={`btn btn-ghost`}
            style={{ flex: 1, padding: '4px 0', fontSize: 11 }}
            onClick={() => setQty(q)}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Estimated value */}
      {estimatedValue !== null && (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '6px 10px',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span className="label" style={{ margin: 0 }}>Est. Value</span>
          <span className="font-mono" style={{ fontSize: 12, color: 'var(--txt-1)' }}>
            {fmtUSD(estimatedValue)}
          </span>
        </div>
      )}

      {/* Position info */}
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{
          flex: 1,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '5px 8px',
        }}>
          <div className="label" style={{ margin: 0, fontSize: 10 }}>Cash</div>
          <div className="font-mono" style={{ fontSize: 11, color: 'var(--txt-1)' }}>
            {cashBalance !== null ? fmtUSD(cashBalance, 0) : '—'}
          </div>
        </div>
        <div style={{
          flex: 1,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '5px 8px',
        }}>
          <div className="label" style={{ margin: 0, fontSize: 10 }}>Position</div>
          <div className="font-mono" style={{ fontSize: 11, color: position > 0 ? 'var(--bull)' : 'var(--txt-2)' }}>
            {position} sh
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        className={`btn ${side === 'BUY' ? 'btn-bull' : 'btn-bear'}`}
        onClick={submit}
        disabled={side === 'BUY' ? !canBuy : !canSell}
        style={{ width: '100%', padding: '10px 0', fontSize: 13, fontWeight: 700 }}
      >
        {side === 'BUY' ? '▲' : '▼'} Place {side} Order
      </button>

      {!canTrade && (
        <p style={{ fontSize: 10, color: 'var(--txt-3)', textAlign: 'center', margin: 0 }}>
          Start a replay session to trade
        </p>
      )}
    </div>
  );
};
