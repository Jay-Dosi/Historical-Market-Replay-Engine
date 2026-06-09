import React, { useState } from 'react';
import type { SubscribePayload } from '../../types/market';

interface Props {
  onSubscribe:     (p: SubscribePayload) => void;
  disabled:        boolean;
}

const SPEED_PRESETS = [1, 10, 30, 60, 120, 390, 1000];

export const SubscribeForm: React.FC<Props> = ({ onSubscribe, disabled }) => {
  const [form, setForm] = useState<SubscribePayload>({
    symbol:      'AAPL',
    region:      'US',
    exchange:    'NASDAQ',
    startDate:   '2024-01-02T09:30:00Z',
    endDate:     '2024-01-05T16:00:00Z',
    speed:       60,
    initialCash: 100000,
    dataSource:  'LOCAL',
  });

  const set = <K extends keyof SubscribePayload>(k: K, v: SubscribePayload[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubscribe(form);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Data Source */}
      <div>
        <label className="label">Data Source</label>
        <select
          style={{ width: '100%', padding: '6px 8px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg-elevated)', color: 'var(--txt-1)' }}
          value={form.dataSource}
          onChange={e => set('dataSource', e.target.value as 'LOCAL' | 'YAHOO_API')}
          disabled={disabled}
        >
          <option value="LOCAL">Local Database (Fastest)</option>
          <option value="YAHOO_API">Yahoo Finance API (Dynamic)</option>
        </select>
      </div>

      {/* Symbol */}
      <div>
        <label className="label">Symbol</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {['AAPL', 'TSLA', 'SPY'].map(s => (
            <button
              key={s}
              type="button"
              className={`btn ${form.symbol === s ? 'btn-accent' : 'btn-ghost'}`}
              style={{ flex: 1, padding: '5px 0', fontSize: 11 }}
              onClick={() => set('symbol', s)}
              disabled={disabled}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Region + Exchange */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label className="label">Region</label>
          <input
            value={form.region ?? ''}
            onChange={e => set('region', e.target.value)}
            placeholder="US"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="label">Exchange</label>
          <input
            value={form.exchange ?? ''}
            onChange={e => set('exchange', e.target.value)}
            placeholder="NASDAQ"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Date range */}
      <div>
        <label className="label">Start Date (UTC)</label>
        <input
          type="text"
          value={form.startDate}
          onChange={e => set('startDate', e.target.value)}
          placeholder="2024-01-02T09:30:00Z"
          disabled={disabled}
        />
      </div>
      <div>
        <label className="label">End Date (UTC)</label>
        <input
          type="text"
          value={form.endDate}
          onChange={e => set('endDate', e.target.value)}
          placeholder="2024-01-05T16:00:00Z"
          disabled={disabled}
        />
      </div>

      {/* Speed */}
      <div>
        <label className="label">
          Speed&nbsp;
          <span className="text-accent font-mono" style={{ fontSize: 12 }}>
            {form.speed}×
          </span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {SPEED_PRESETS.map(s => (
            <button
              key={s}
              type="button"
              className={`btn ${form.speed === s ? 'btn-accent' : 'btn-ghost'}`}
              style={{ flex: '0 0 auto', padding: '4px 8px', fontSize: 11 }}
              onClick={() => set('speed', s)}
              disabled={disabled}
            >
              {s}×
            </button>
          ))}
        </div>
        <input
          type="range"
          min={1}
          max={3900}
          step={1}
          value={form.speed}
          onChange={e => set('speed', Number(e.target.value))}
          disabled={disabled}
          style={{ width: '100%', marginTop: 6, accentColor: 'var(--accent)' }}
        />
      </div>

      {/* Initial cash */}
      <div>
        <label className="label">Starting Cash ($)</label>
        <input
          type="number"
          value={form.initialCash}
          onChange={e => set('initialCash', Number(e.target.value))}
          min={1000}
          step={1000}
          disabled={disabled}
        />
      </div>

      <button
        type="submit"
        className="btn btn-accent"
        disabled={disabled}
        style={{ width: '100%', marginTop: 4, padding: '10px 0', fontSize: 13 }}
      >
        ▶ Start Replay
      </button>
    </form>
  );
};
