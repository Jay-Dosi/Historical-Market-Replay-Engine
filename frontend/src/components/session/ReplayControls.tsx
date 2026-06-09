import React from 'react';
import type { SessionStatus } from '../../types/market';

interface Props {
  status:        SessionStatus;
  speed:         number;
  onPause:       () => void;
  onResume:      () => void;
  onStop:        () => void;
}

const statusLabels: Record<SessionStatus, { label: string; color: string }> = {
  idle:        { label: 'IDLE',        color: 'var(--txt-3)' },
  started:     { label: 'LIVE',        color: 'var(--bull)' },
  paused:      { label: 'PAUSED',      color: 'var(--amber)' },
  completed:   { label: 'COMPLETED',   color: 'var(--accent)' },
  stopped:     { label: 'STOPPED',     color: 'var(--txt-2)' },
  downloading: { label: 'DOWNLOADING', color: 'var(--amber)' },
};

export const ReplayControls: React.FC<Props> = ({
  status, speed, onPause, onResume, onStop,
}) => {
  const { label, color } = statusLabels[status];
  const isRunning  = status === 'started';
  const isPaused   = status === 'paused';
  const isDone     = status === 'completed' || status === 'stopped';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: color,
            display: 'inline-block',
            animation: isRunning ? 'pulse-dot 1.4s infinite' : 'none',
          }}
        />
        <span style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          color,
        }}>
          {label}
        </span>
        {isRunning && (
          <span
            className="font-mono animate-warp-glow"
            style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}
          >
            {speed}×
          </span>
        )}
      </div>

      {/* Control buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {isRunning ? (
          <button className="btn btn-ghost" onClick={onPause} style={{ gridColumn: '1' }}>
            ⏸ Pause
          </button>
        ) : isPaused ? (
          <button className="btn btn-accent" onClick={onResume} style={{ gridColumn: '1' }}>
            ▶ Resume
          </button>
        ) : (
          <button className="btn btn-ghost" disabled style={{ gridColumn: '1' }}>
            ⏸ Pause
          </button>
        )}

        <button
          className="btn btn-danger"
          onClick={onStop}
          disabled={isDone || status === 'idle'}
          style={{ gridColumn: '2' }}
        >
          ⏹ Stop
        </button>
      </div>
    </div>
  );
};
