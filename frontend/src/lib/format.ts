export const fmtNum = (n: number): string => {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return Math.round(n).toString();
};

export const fmtInt = (n: number): string => Math.round(n).toLocaleString('en-US');
export const fmtMoney = (n: number): string => '$' + fmtNum(n);
export const fmtMoneyFull = (n: number): string => '$' + Math.round(n).toLocaleString('en-US');
export const fmtPct = (n: number): string => n.toFixed(1) + '%';

export const timeAgo = (ts: number): string => {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return s + 's ago';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
};

export const clockTime = (ts: number): string =>
  new Date(ts).toLocaleTimeString('en-US', { hour12: false });
