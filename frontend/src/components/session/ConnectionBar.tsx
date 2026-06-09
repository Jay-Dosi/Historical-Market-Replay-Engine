import React from 'react';
import type { WsStatus } from '../../types/market';

interface Props {
  status:       WsStatus;
  onConnect:    () => void;
  onDisconnect: () => void;
}

const STATUS_CONFIG: Record<WsStatus, { label: string; color: string; pulse: boolean }> = {
  disconnected: { label: 'Disconnected', color: '#454F6B', pulse: false },
  connecting:   { label: 'Connecting…',  color: '#F5C842', pulse: true  },
  connected:    { label: 'Connected',    color: '#00D4AA', pulse: false },
  error:        { label: 'Error',        color: '#FF4560', pulse: false },
};

export const ConnectionBar: React.FC<Props> = ({ status, onConnect, onDisconnect }) => {
  const cfg        = STATUS_CONFIG[status];
  const isConn     = status === 'connected';
  const canConnect = status === 'disconnected' || status === 'error';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 14px',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: cfg.color,
            display: 'inline-block',
            animation: cfg.pulse ? 'pulse-dot 1s infinite' : 'none',
          }}
        />
        <span style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: 11, fontWeight: 600,
          color: cfg.color,
          letterSpacing: '0.04em',
        }}>
          {cfg.label}
        </span>
      </div>

      {canConnect ? (
        <button
          className="btn btn-accent"
          style={{ padding: '4px 12px', fontSize: 11 }}
          onClick={onConnect}
        >
          Connect
        </button>
      ) : isConn ? (
        <button
          className="btn btn-ghost"
          style={{ padding: '4px 12px', fontSize: 11 }}
          onClick={onDisconnect}
        >
          Disconnect
        </button>
      ) : null}
    </div>
  );
};
