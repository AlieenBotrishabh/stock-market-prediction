/**
 * Display formatting.
 *
 * Indian market conventions throughout: the lakh/crore system and en-IN
 * digit grouping (1,23,456.78 rather than 123,456.78).
 *
 * Every helper distinguishes "no value" from zero. The previous version
 * used falsy checks (`if (!price) return '0.00'`), which rendered a
 * genuine 0 — and every null — as "0.00", making missing data look like
 * real data.
 */

/** True for values that should render as a dash rather than a number. */
const isBlank = (v) => v == null || v === '' || (typeof v === 'number' && !Number.isFinite(v));

const toNumber = (v) => {
  if (typeof v === 'number') return v;
  if (isBlank(v)) return null;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

export const DASH = '—';

/** Price with en-IN grouping. `₹1,23,456.78` */
export function formatPrice(value, { currency = true, decimals = 2 } = {}) {
  const n = toNumber(value);
  if (n === null) return DASH;
  const formatted = n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return currency ? `₹${formatted}` : formatted;
}

/** Signed percentage. `+2.45%` */
export function formatPercent(value, { decimals = 2, signed = true } = {}) {
  const n = toNumber(value);
  if (n === null) return DASH;
  const sign = signed && n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

/** Signed absolute change. `+₹12.50` */
export function formatChange(value, { currency = true } = {}) {
  const n = toNumber(value);
  if (n === null) return DASH;
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  const abs = Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return `${sign}${currency ? '₹' : ''}${abs}`;
}

/**
 * Market cap in Indian units.
 *
 * IndianAPI reports market cap already denominated in crore, so the
 * default assumes that. Pass `inCrore: false` for a raw rupee figure.
 */
export function formatMarketCap(value, { inCrore = true } = {}) {
  const n = toNumber(value);
  if (n === null) return DASH;
  const crore = inCrore ? n : n / 1e7;
  if (crore >= 1e5) return `₹${(crore / 1e5).toFixed(2)} L Cr`;
  if (crore >= 1) return `₹${crore.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
  return `₹${(crore * 100).toFixed(2)} L`;
}

/** Share volume in Indian units. `28.09 L`, `2.81 Cr` */
export function formatVolume(value) {
  const n = toNumber(value);
  if (n === null) return DASH;
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)} K`;
  return n.toLocaleString('en-IN');
}

/** Compact number for tiles. */
export function formatCompact(value, decimals = 2) {
  const n = toNumber(value);
  if (n === null) return DASH;
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
}

/** Where `value` sits between low and high, clamped to 0–100. */
export function percentOfRange(value, low, high) {
  const v = toNumber(value); const lo = toNumber(low); const hi = toNumber(high);
  if (v === null || lo === null || hi === null || hi <= lo) return null;
  return Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
}

/** Tailwind text colour for a signed change. */
export const changeColor = (v) => {
  const n = toNumber(v);
  if (n === null) return 'text-white/40';
  return n > 0 ? 'text-accent-green' : n < 0 ? 'text-accent-red' : 'text-white/60';
};

export const changeBg = (v) => {
  const n = toNumber(v);
  if (n === null) return 'bg-white/5 text-white/40';
  return n > 0
    ? 'bg-accent-green/15 text-accent-green'
    : n < 0 ? 'bg-accent-red/15 text-accent-red' : 'bg-white/10 text-white/60';
};

/** "2 hours ago" / "just now" from an ISO timestamp. */
export function formatRelativeTime(iso) {
  if (!iso) return DASH;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return DASH;
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hr ago`;
  const days = Math.round(seconds / 86400);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

/** Date in IST, e.g. "21 Aug 2026". */
export function formatDate(value, { withTime = false } = {}) {
  if (!value) return DASH;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    timeZone: 'Asia/Kolkata',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/** Short axis label, e.g. "21 Aug". */
export function formatShortDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });
}

/** Seconds -> "4h 18m" for the market countdown. */
export function formatDuration(totalSeconds) {
  if (totalSeconds == null || totalSeconds < 0) return DASH;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default {
  formatPrice, formatPercent, formatChange, formatMarketCap, formatVolume,
  formatCompact, percentOfRange, changeColor, changeBg, formatRelativeTime,
  formatDate, formatShortDate, formatDuration, DASH,
};
