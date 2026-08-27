/**
 * One definition of "the symbols this account is configured to trade".
 *
 * The home screen built this list inline when starting the bot, and Trade
 * Config didn't build it at all — it changed the stored symbols and left a
 * running batch alone. So removing a symbol stopped it appearing in the app
 * while the server kept trading it, and the only way to actually stop it was
 * to stop the whole bot.
 *
 * Both screens now derive the batch from the same place.
 */

export interface ConfiguredSymbol {
  symbol: string;
  lotSize: string;
  numberOfTrades: string;
}

export interface BatchParams {
  symbols: string[];
  volume: number;
  count: number;
  perSymbol: Record<string, { volume?: number; count?: number }>;
  intervalMinutes: number;
  strategy: 'ma-cross';
  timeframe: string;
  fastPeriod: number;
  slowPeriod: number;
  comment: string;
}

function num(value: unknown, fallback: number, integer = false): number {
  const parsed = integer
    ? parseInt(String(value), 10)
    : parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Build the batch payload from the configured symbols.
 *
 * `fallbackLot` / `fallbackCount` cover a symbol saved without usable numbers;
 * each symbol otherwise keeps exactly what Trade Config gave it.
 * Returns null when nothing is configured — the caller should stop the bot
 * rather than start one with an empty list.
 */
export function buildBatchParams(
  configured: ConfiguredSymbol[] | null | undefined,
  fallbackLot: number,
  fallbackCount: number,
  comment: string,
): BatchParams | null {
  const list = (configured || []).filter((s) => s && s.symbol);
  if (list.length === 0) return null;

  // Last entry wins, matching activateMT5Symbol, which replaces a symbol's
  // config rather than appending a second one.
  const bySymbol = new Map<string, ConfiguredSymbol>();
  for (const s of list) bySymbol.set(s.symbol, s);

  const perSymbol: Record<string, { volume?: number; count?: number }> = {};
  for (const [symbol, s] of bySymbol) {
    perSymbol[symbol] = {
      volume: num(s.lotSize, fallbackLot),
      count: num(s.numberOfTrades, fallbackCount, true),
    };
  }

  return {
    symbols: [...bySymbol.keys()],
    volume: fallbackLot,
    count: fallbackCount,
    perSymbol,
    // The crossover reads M15 closes; polling every 5 minutes samples it
    // several times per bar without hammering PriceHistory.
    intervalMinutes: 5,
    strategy: 'ma-cross',
    timeframe: 'M15',
    fastPeriod: 20,
    slowPeriod: 50,
    comment,
  };
}
