/**
 * NSE market status.
 *
 * Replaces the old client-side check in Footer.jsx, which called
 * `new Date().getHours()` — the *viewer's* local hour — while its comment
 * claimed IST. A user in New York saw "Market Open" at 09:15 ET.
 *
 * Two sources, in order of trust:
 *  1. Yahoo's `meta.currentTradingPeriod.regular` — exchange-supplied
 *     session start/end epochs. This is authoritative and implicitly
 *     handles NSE trading holidays, so there is no hand-maintained holiday
 *     list to go stale.
 *  2. A pure IST clock fallback (09:15–15:30, Mon–Fri) for when Yahoo is
 *     unreachable. This one CANNOT know about holidays, so responses
 *     derived from it are flagged `source: 'clock'`.
 */

const IST_TZ = 'Asia/Kolkata';

const SESSION = {
  openMinutes: 9 * 60 + 15,   // 09:15 IST
  closeMinutes: 15 * 60 + 30, // 15:30 IST
  preOpenMinutes: 9 * 60,     // 09:00 IST — NSE pre-open call auction
};

/**
 * Wall-clock fields for an instant, in IST.
 * Uses Intl rather than manual offset arithmetic so it stays correct
 * regardless of the server's own timezone.
 */
export function istParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TZ,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(
    fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  );

  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  const hour = Number(parts.hour) % 24; // Intl can emit "24" at midnight
  const minute = Number(parts.minute);

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute,
    second: Number(parts.second),
    weekday: weekdayIndex,
    isWeekend: weekdayIndex === 0 || weekdayIndex === 6,
    minutesOfDay: hour * 60 + minute,
    iso: `${parts.year}-${parts.month}-${parts.day}T${String(hour).padStart(2, '0')}:${parts.minute}:${parts.second}+05:30`,
    label: `${parts.day}/${parts.month}/${parts.year} ${String(hour).padStart(2, '0')}:${parts.minute}:${parts.second} IST`,
  };
}

/** Next weekday 09:15 IST strictly after `from`, as an epoch ms. */
function nextWeekdayOpen(from = new Date()) {
  for (let addDays = 0; addDays <= 7; addDays += 1) {
    const probe = new Date(from.getTime() + addDays * 86_400_000);
    const p = istParts(probe);
    if (p.isWeekend) continue;
    if (addDays === 0 && p.minutesOfDay >= SESSION.openMinutes) continue;
    // Reconstruct 09:15 IST on that calendar date (IST is a fixed +05:30).
    const utcMs = Date.UTC(p.year, p.month - 1, p.day, 9, 15) - 19_800_000;
    if (utcMs > from.getTime()) return utcMs;
  }
  return null;
}

/**
 * Derive status from Yahoo's exchange-supplied trading period.
 * @param {{regular?:{start:number,end:number}}} tradingPeriod
 * @param {number} marketTimeMs last tick time from meta.regularMarketTime
 */
function fromTradingPeriod(tradingPeriod, marketTimeMs, now) {
  const regular = tradingPeriod?.regular;
  if (!regular?.start || !regular?.end) return null;

  const start = regular.start * 1000;
  const end = regular.end * 1000;
  const t = now.getTime();

  let phase;
  if (t < start) phase = 'pre';
  else if (t <= end) phase = 'open';
  else phase = 'closed';

  // A zero-length window means the exchange published no session for today
  // (holiday). Treat as closed regardless of the clock.
  if (start === end) phase = 'closed';

  const isOpen = phase === 'open';
  const nextChange = phase === 'pre' ? start : phase === 'open' ? end : nextWeekdayOpen(now);

  return {
    isOpen,
    phase,
    sessionStart: new Date(start).toISOString(),
    sessionEnd: new Date(end).toISOString(),
    nextOpen: isOpen ? null : new Date(nextChange ?? start).toISOString(),
    nextClose: isOpen ? new Date(end).toISOString() : null,
    secondsUntilChange: nextChange ? Math.max(0, Math.round((nextChange - t) / 1000)) : null,
    lastTradeTime: marketTimeMs ? new Date(marketTimeMs).toISOString() : null,
    source: 'exchange',
  };
}

/** Pure IST clock fallback. Holiday-blind by construction. */
function fromClock(now) {
  const p = istParts(now);
  const m = p.minutesOfDay;

  let phase;
  if (p.isWeekend) phase = 'closed';
  else if (m < SESSION.preOpenMinutes) phase = 'closed';
  else if (m < SESSION.openMinutes) phase = 'pre';
  else if (m < SESSION.closeMinutes) phase = 'open';
  else phase = 'closed';

  const isOpen = phase === 'open';
  const todayUtcMidnightIst = Date.UTC(p.year, p.month - 1, p.day) - 19_800_000;
  const closeMs = todayUtcMidnightIst + SESSION.closeMinutes * 60_000;
  const openMs = todayUtcMidnightIst + SESSION.openMinutes * 60_000;
  const nextChange = isOpen ? closeMs : phase === 'pre' ? openMs : nextWeekdayOpen(now);

  return {
    isOpen,
    phase,
    sessionStart: new Date(openMs).toISOString(),
    sessionEnd: new Date(closeMs).toISOString(),
    nextOpen: isOpen ? null : new Date(nextChange ?? openMs).toISOString(),
    nextClose: isOpen ? new Date(closeMs).toISOString() : null,
    secondsUntilChange: nextChange ? Math.max(0, Math.round((nextChange - now.getTime()) / 1000)) : null,
    lastTradeTime: null,
    // Flagged so callers know holidays are not accounted for.
    source: 'clock',
    note: 'Derived from IST clock only — NSE trading holidays are not reflected.',
  };
}

/**
 * Current NSE market status.
 * @param {{tradingPeriod?:object, marketTimeMs?:number}} hints
 *        Pass `meta.currentTradingPeriod` from any recent Yahoo quote to get
 *        holiday-accurate results.
 */
export function getMarketStatus(hints = {}, now = new Date()) {
  const base =
    fromTradingPeriod(hints.tradingPeriod, hints.marketTimeMs, now) ?? fromClock(now);

  const p = istParts(now);
  return {
    ...base,
    exchange: 'NSE',
    timezone: IST_TZ,
    serverTimeIST: p.iso,
    serverTimeLabel: p.label,
    asOf: now.toISOString(),
  };
}

/** True when the regular session is live — used to pick cache TTLs. */
export function isMarketOpen(hints = {}, now = new Date()) {
  return getMarketStatus(hints, now).isOpen;
}

export default { getMarketStatus, isMarketOpen, istParts };
