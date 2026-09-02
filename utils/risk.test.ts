import { describe, expect, it } from 'bun:test';
import { atr, decimalsOf, extractBars, round, stopPrice, targetPrice, type Bar } from './risk';

/** Bars with a known, constant true range of 2.0. */
function flatRangeBars(count: number, range = 2): Bar[] {
  const out: Bar[] = [];
  for (let i = 0; i < count; i++) {
    const close = 100;
    out.push({ high: close + range / 2, low: close - range / 2, close });
  }
  return out;
}

describe('decimalsOf', () => {
  it('takes the most precise price it was shown', () => {
    expect(decimalsOf(1.23, 1.23456)).toBe(5);
  });
  it('handles whole numbers and ignores unusable values', () => {
    expect(decimalsOf(2000, null, undefined, NaN)).toBe(0);
  });
  it('never exceeds 8, so a float artefact cannot produce a rejected stop', () => {
    expect(decimalsOf(0.1234567890123)).toBeLessThanOrEqual(8);
  });
});

describe('atr', () => {
  it('measures a constant range', () => {
    // Every bar spans 2.0 and closes at the midpoint, so TR is 2.0 throughout.
    expect(atr(flatRangeBars(20), 14)).toBeCloseTo(2, 6);
  });

  it('needs period + 1 bars, because true range needs the previous close', () => {
    expect(atr(flatRangeBars(14), 14)).toBeNull();
    expect(atr(flatRangeBars(15), 14)).not.toBeNull();
  });

  it('counts a gap through the previous close, not just the bar range', () => {
    const bars: Bar[] = [
      { high: 100, low: 99, close: 99.5 },
      // Opens far above: true range is measured from the previous close.
      { high: 120, low: 119, close: 119.5 },
    ];
    expect(atr(bars, 1)).toBeCloseTo(120 - 99.5, 6);
  });

  it('returns null rather than 0 when the data is unusable', () => {
    expect(atr([], 14)).toBeNull();
    expect(atr(flatRangeBars(20).map(b => ({ ...b, high: NaN })), 14)).toBeNull();
  });
});

describe('stopPrice / targetPrice', () => {
  it('puts the stop below entry for a buy and above for a sell', () => {
    expect(stopPrice(2000, 10, 'Buy', 1.5, 2)).toBe(1985);
    expect(stopPrice(2000, 10, 'Sell', 1.5, 2)).toBe(2015);
  });

  it('puts the target the profitable side of entry', () => {
    expect(targetPrice(2000, 10, 'Buy', 2, 2)).toBe(2020);
    expect(targetPrice(2000, 10, 'Sell', 2, 2)).toBe(1980);
  });

  it('rounds to the symbol precision so the broker accepts it', () => {
    // 5-decimal FX: an unrounded stop here would carry float noise.
    // 1.10000 - (0.00033 * 1.5) = 1.099505, which is 1.09951 at 5 decimals.
    const sl = stopPrice(1.10000, 0.00033, 'Buy', 1.5, 5);
    expect(sl).toBe(1.09951);
    expect(String(sl).split('.')[1].length).toBeLessThanOrEqual(5);
  });

  it('returns null when it cannot size one, rather than a bogus level', () => {
    expect(stopPrice(2000, 0, 'Buy', 1.5, 2)).toBeNull();
    expect(stopPrice(0, 10, 'Buy', 1.5, 2)).toBeNull();
    expect(targetPrice(2000, 10, 'Buy', 0, 2)).toBeNull();   // take-profit disabled
  });
});

describe('extractBars', () => {
  it('reads the shapes the broker actually returns', () => {
    expect(extractBars([{ high: 2, low: 1, close: 1.5 }])).toHaveLength(1);
    expect(extractBars({ data: [{ High: 2, Low: 1, Close: 1.5 }] })).toHaveLength(1);
    expect(extractBars({ candles: [{ h: 2, l: 1, c: 1.5 }] })).toHaveLength(1);
  });

  it('drops unusable bars instead of inventing values', () => {
    expect(extractBars([{ high: 2, low: 1 }])).toHaveLength(0);          // no close
    expect(extractBars([{ high: 1, low: 2, close: 1.5 }])).toHaveLength(0); // inverted
    expect(extractBars([{ high: 0, low: 0, close: 0 }])).toHaveLength(0);
    expect(extractBars([42])).toHaveLength(0);                            // closes only
  });

  it('survives junk without throwing', () => {
    expect(extractBars(null)).toEqual([]);
    expect(extractBars({ error: 'nope' })).toEqual([]);
  });
});

describe('round', () => {
  it('does not leave float noise behind', () => {
    expect(round(1.005, 2)).toBe(1.0);
    expect(round(2000.123456, 2)).toBe(2000.12);
  });
});
