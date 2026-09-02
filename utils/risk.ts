/**
 * Risk maths for the trading engine. Pure functions, no I/O.
 *
 * This decides where a losing trade stops losing, so it is kept free of any
 * broker call and can be tested on its own.
 */

export type Direction = 'Buy' | 'Sell';

export interface Bar {
  high: number;
  low: number;
  close: number;
}

/**
 * Price decimals for a symbol, inferred from prices the broker actually sent.
 *
 * Gold quotes 2, FX majors 5, indices 1-2. A stop carrying more precision than
 * the symbol allows is rejected outright, so this is not cosmetic — it is the
 * difference between a protected position and a naked one.
 */
export function decimalsOf(...prices: Array<number | null | undefined>): number {
  let max = 0;
  for (const p of prices) {
    if (p === null || p === undefined || !isFinite(p)) continue;
    const s = String(p);
    const dot = s.indexOf('.');
    if (dot >= 0) max = Math.max(max, s.length - dot - 1);
  }
  return Math.min(8, max);
}

export function round(price: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(price * f) / f;
}

/**
 * Wilder's Average True Range over the last `period` bars.
 *
 * True range needs the previous close, so the first bar cannot contribute and
 * `period + 1` bars are required. Returns null when there aren't enough, which
 * the caller must treat as "cannot size a stop" rather than as zero.
 */
export function atr(bars: Bar[], period: number): number | null {
  if (!Array.isArray(bars) || period < 1 || bars.length < period + 1) return null;

  const trueRanges: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const { high, low } = bars[i];
    const prevClose = bars[i - 1].close;
    if (![high, low, prevClose].every((v) => isFinite(v))) return null;
    trueRanges.push(Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose),
    ));
  }
  if (trueRanges.length < period) return null;

  // Wilder's smoothing: a simple average to seed, then a running update.
  let value = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    value = (value * (period - 1) + trueRanges[i]) / period;
  }
  return isFinite(value) && value > 0 ? value : null;
}

/** Protective stop: `mult` x ATR the wrong side of entry. */
export function stopPrice(
  entry: number, atrValue: number, dir: Direction, mult: number, decimals: number,
): number | null {
  if (!(atrValue > 0) || !(entry > 0) || mult <= 0) return null;
  const distance = atrValue * mult;
  return round(dir === 'Buy' ? entry - distance : entry + distance, decimals);
}

/** Target, or null when take-profit is switched off (mult <= 0). */
export function targetPrice(
  entry: number, atrValue: number, dir: Direction, mult: number, decimals: number,
): number | null {
  if (!(atrValue > 0) || !(entry > 0) || mult <= 0) return null;
  const distance = atrValue * mult;
  return round(dir === 'Buy' ? entry + distance : entry - distance, decimals);
}

/**
 * Tolerant parser for the broker's price history — highs and lows, not just
 * closes, because true range needs the bar's range.
 *
 * Returns [] when any bar is unusable rather than filling gaps: a stop sized
 * from invented data is worse than no stop, because it looks protected.
 */
export function extractBars(payload: any): Bar[] {
  const rows =
    Array.isArray(payload) ? payload
    : Array.isArray(payload?.data) ? payload.data
    : Array.isArray(payload?.candles) ? payload.candles
    : Array.isArray(payload?.bars) ? payload.bars
    : Array.isArray(payload?.history) ? payload.history
    : [];

  const bars: Bar[] = [];
  for (const row of rows) {
    if (typeof row === 'number' || !row) continue;
    const high = Number(row.high ?? row.High ?? row.h ?? row.highPrice ?? row.HighPrice);
    const low = Number(row.low ?? row.Low ?? row.l ?? row.lowPrice ?? row.LowPrice);
    const close = Number(row.close ?? row.Close ?? row.c ?? row.closePrice ?? row.ClosePrice);
    if (![high, low, close].every((v) => isFinite(v) && v > 0)) continue;
    if (high < low) continue;
    bars.push({ high, low, close });
  }
  return bars;
}
