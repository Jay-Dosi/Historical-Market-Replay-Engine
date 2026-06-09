/** Format a dollar amount with commas and 2 decimal places. */
export function fmtUSD(n: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency:              'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

/** Format a large number with K/M/B suffix. */
export function fmtVolume(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/** Format a percentage with sign. */
export function fmtPct(n: number, decimals = 2): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

/** Format ISO-8601 timestamp to HH:MM:SS in UTC. */
export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(11, 19);
}

/** Format ISO-8601 timestamp to YYYY-MM-DD. */
export function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

/** Format ISO-8601 timestamp to MM/DD HH:MM. */
export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
}

/** Compute percentage change between two prices. */
export function pctChange(from: number, to: number): number {
  if (from === 0) return 0;
  return ((to - from) / from) * 100;
}

/** Clamp a number between min and max. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
