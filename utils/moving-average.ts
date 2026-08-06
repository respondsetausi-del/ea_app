/**
 * Moving averages and the crossover state used to pick a trade direction.
 *
 * Deliberately *state-based*, not event-based: the direction is decided by
 * which average is currently on top, never by "a cross happened on this bar".
 * The engine polls every few minutes, so a cross that opens and closes between
 * two polls would be invisible to an event-based reading — and a missed cross
 * means holding the wrong side until the next one. Asking "where are we now?"
 * is always answerable, and it composes with close-before-open: whatever the
 * current state is, that's what we should be holding.
 */

export type Direction = 'Buy' | 'Sell';

/** Simple moving average of the last `period` values. */
export function sma(values: number[], period: number): number | null {
  if (!Array.isArray(values) || values.length < period || period <= 0) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) sum += values[i];
  return sum / period;
}

/**
 * Exponential moving average, seeded with the SMA of the first `period` values
 * so early bars don't skew it the way seeding with a single close does.
 */
export function ema(values: number[], period: number): number | null {
  if (!Array.isArray(values) || values.length < period || period <= 0) return null;
  const k = 2 / (period + 1);
  let acc = 0;
  for (let i = 0; i < period; i++) acc += values[i];
  let prev = acc / period;
  for (let i = period; i < values.length; i++) prev = values[i] * k + prev * (1 - k);
  return prev;
}

export interface CrossSignal {
  direction: Direction | null;
  fast: number | null;
  slow: number | null;
  /** How far apart the averages are, relative to price. Used as a noise gate. */
  separationPct: number | null;
  reason: string;
}

export interface CrossOptions {
  fastPeriod?: number;
  slowPeriod?: number;
  /**
   * Minimum gap between the averages, as a percent of price, before a
   * direction is taken. When the two lines are sitting on top of each other
   * the "signal" is noise, and acting on it is what turns a crossover system
   * into a spread-paying machine in a ranging market. 0 disables the gate.
   */
  minSeparationPct?: number;
}

/**
 * Resolve closes into a target direction.
 *
 * Returns `direction: null` when there isn't enough history, or when the
 * averages are too close to call — the engine treats that as "hold whatever
 * you have, open nothing new" rather than as a reason to flip.
 */
export function crossSignal(closes: number[], opts: CrossOptions = {}): CrossSignal {
  const fastPeriod = opts.fastPeriod ?? 20;
  const slowPeriod = opts.slowPeriod ?? 50;
  const minSeparationPct = opts.minSeparationPct ?? 0.02;

  if (!Array.isArray(closes) || closes.length < slowPeriod) {
    return {
      direction: null,
      fast: null,
      slow: null,
      separationPct: null,
      reason: `need ${slowPeriod} closes, have ${closes?.length ?? 0}`,
    };
  }

  const fast = ema(closes, fastPeriod);
  const slow = ema(closes, slowPeriod);
  if (fast === null || slow === null || !isFinite(fast) || !isFinite(slow)) {
    return { direction: null, fast, slow, separationPct: null, reason: 'averages unavailable' };
  }

  const price = closes[closes.length - 1];
  const separationPct = price > 0 ? (Math.abs(fast - slow) / price) * 100 : 0;

  if (minSeparationPct > 0 && separationPct < minSeparationPct) {
    return {
      direction: null,
      fast,
      slow,
      separationPct,
      reason: `averages too close (${separationPct.toFixed(4)}% < ${minSeparationPct}%)`,
    };
  }

  const direction: Direction = fast > slow ? 'Buy' : 'Sell';
  return {
    direction,
    fast,
    slow,
    separationPct,
    reason: `EMA${fastPeriod} ${fast > slow ? '>' : '<'} EMA${slowPeriod} by ${separationPct.toFixed(4)}%`,
  };
}

/**
 * Pull closing prices out of an Api2Trade PriceHistory payload.
 *
 * The response shape isn't pinned down in the docs and varies by server build,
 * so this accepts the forms seen in the wild (bare numbers, {close}, {c},
 * {Close}) and anything wrapped in a `data`/`candles`/`bars` envelope, rather
 * than assuming one and silently yielding an empty series.
 */
export function extractCloses(payload: any): number[] {
  const rows =
    Array.isArray(payload) ? payload
    : Array.isArray(payload?.data) ? payload.data
    : Array.isArray(payload?.candles) ? payload.candles
    : Array.isArray(payload?.bars) ? payload.bars
    : Array.isArray(payload?.history) ? payload.history
    : [];

  const closes: number[] = [];
  for (const row of rows) {
    const v =
      typeof row === 'number' ? row
      : row?.close ?? row?.Close ?? row?.c ?? row?.closePrice ?? row?.ClosePrice;
    const n = Number(v);
    if (isFinite(n) && n > 0) closes.push(n);
  }
  return closes;
}
