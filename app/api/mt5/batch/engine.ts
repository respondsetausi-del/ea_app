// Server-side batch engine (SERVER ONLY). Runs on the Bun server so it keeps
// trading while the app is backgrounded or closed.
//
// Two strategies:
//
//   'ma-cross'  Every cycle, each symbol's direction is read from an EMA
//               crossover on its own price history, and the book is reconciled
//               to match. This is the default.
//
//   'flip'      The original behaviour: pick a random direction, hold the
//               interval, then flip. Kept because it's what existing persisted
//               flights were started with, but it has no edge — it pays the
//               spread on every flip in exchange for a coin toss.
//
// Hardened for reboots: each flight is persisted to MySQL and resumeBatches()
// reloads active flights on startup. Keep-alive self-pings /health to reduce
// free-tier sleep (an external uptime pinger is still the dependable fix).
import { orderSend, orderClose, getOpenOrders, getPriceHistory, normalizeVolume } from '@/services/api2trade';
import { crossSignal, extractCloses, type Direction } from '@/utils/moving-average';
import { ensureLive, withSession } from '@/app/api/mt5/session-keeper';
import { checkSessionEntitlement } from '@/app/api/mt5/entitlement';
import { getPool } from '@/app/api/_db';

type Strategy = 'ma-cross' | 'flip';

interface Position {
  dir: Direction | null;
  tickets: number[];
  /** Why the engine last did (or didn't) do something with this symbol. */
  note: string;
}

/** Per-symbol overrides, so a symbol keeps the lot it was given in Trade Config. */
type PerSymbol = Record<string, { volume?: number; count?: number }>;

interface Flight {
  symbols: string[];
  volume: number;
  count: number;
  perSymbol: PerSymbol;
  intervalMs: number;
  comment: string;
  strategy: Strategy;
  timeframe: string;
  fastPeriod: number;
  slowPeriod: number;
  minSeparationPct: number;
  positions: Record<string, Position>;
  timer: ReturnType<typeof setTimeout> | null;
  active: boolean;
  status: string;
  legCount: number;
  startedAt: number;
  nextFlipAt: number;
}

const flights = new Map<string, Flight>();
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
let tableReady = false;

// Persistence + resume only run in production (Render). A local dev server
// sharing the same MySQL would otherwise reload — and TRADE — live flights.
// Opt in locally with BATCH_PERSIST=1 (with your own DB) if you must.
const PERSIST = process.env.RENDER === 'true' || process.env.BATCH_PERSIST === '1';

// Which app owns a persisted flight.
//
// _db.ts falls back to a hard-coded MySQL host and the `eaconverter` database
// when DB_* is unset, so any other deployment built from this codebase lands in
// the same database and the same tp_mt5_batches table. Resume used to read
// every row in it, which means one instance could pick up another's flights and
// trade symbols that were never configured here.
const APP_ID = process.env.BATCH_APP_ID || 'ea_naptune';

// A live flight rewrites its row every cycle (default 5 minutes), so a row that
// has not been touched for hours belongs to a bot that is no longer running.
// Without this, a flight whose owner closed the app without pressing Stop sat
// in the table indefinitely and started trading again on the next restart —
// with whatever symbols were configured back then.
const MAX_RESUME_AGE_HOURS = Number(process.env.BATCH_MAX_RESUME_AGE_HOURS || 6);

// ── Persistence (best-effort — the loop still runs in-memory if the DB is down) ──
async function ensureTable(): Promise<void> {
  if (tableReady) return;
  const pool = await getPool();
  await pool.query(
    `CREATE TABLE IF NOT EXISTS tp_mt5_batches (
      uuid VARCHAR(80) PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
  );
  // Added after the table shipped, so tolerate it already existing.
  try {
    await pool.query('ALTER TABLE tp_mt5_batches ADD COLUMN app VARCHAR(40) NULL');
    console.log('[Batch:srv] added app column to tp_mt5_batches');
  } catch { /* already there */ }
  tableReady = true;
}

function persist(id: string, f: Flight): void {
  if (!PERSIST) return;
  (async () => {
    try {
      await ensureTable();
      const pool = await getPool();
      const data = JSON.stringify({
        symbols: f.symbols, volume: f.volume, count: f.count, perSymbol: f.perSymbol, intervalMs: f.intervalMs,
        comment: f.comment, strategy: f.strategy, timeframe: f.timeframe,
        fastPeriod: f.fastPeriod, slowPeriod: f.slowPeriod, minSeparationPct: f.minSeparationPct,
        positions: f.positions, nextFlipAt: f.nextFlipAt,
        legCount: f.legCount, startedAt: f.startedAt,
      });
      await pool.query(
        `INSERT INTO tp_mt5_batches (uuid, data, app) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data), app = VALUES(app)`,
        [id, data, APP_ID],
      );
    } catch (e: any) { console.error('[Batch:srv] persist error:', e?.message || e); }
  })();
}

function unpersist(id: string): void {
  if (!PERSIST) return;
  (async () => {
    try { await ensureTable(); const pool = await getPool(); await pool.query('DELETE FROM tp_mt5_batches WHERE uuid = ?', [id]); }
    catch (e: any) { console.error('[Batch:srv] unpersist error:', e?.message || e); }
  })();
}

// ── Keep-alive (reduce free-tier sleep; external pinger still recommended) ──
function ensureKeepAlive(): void {
  const url = process.env.RENDER_EXTERNAL_URL;
  if (!url || keepAliveTimer) return;
  const base = url.replace(/\/$/, '');
  keepAliveTimer = setInterval(() => { fetch(`${base}/health`).catch(() => {}); }, 4 * 60 * 1000);
  console.log('[Batch:srv] keep-alive started for', base);
}

function maybeStopKeepAlive(): void {
  if ([...flights.values()].some((f) => f.active)) return;
  if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null; }
}

function pos(f: Flight, symbol: string): Position {
  if (!f.positions[symbol]) f.positions[symbol] = { dir: null, tickets: [], note: '' };
  return f.positions[symbol];
}

// ── Trading primitives ──

/** The lot and trade count this symbol should use. */
function sizing(f: Flight, symbol: string): { volume: number; count: number } {
  const o = f.perSymbol?.[symbol] || {};
  return {
    volume: Number(o.volume) > 0 ? Number(o.volume) : f.volume,
    count: Math.max(1, Number(o.count) > 0 ? Number(o.count) : f.count),
  };
}

/** Open the symbol's configured number of orders, keeping only ones that ticketed. */
async function openLeg(id: string, f: Flight, symbol: string, dir: Direction): Promise<void> {
  const { volume: requested, count } = sizing(f, symbol);
  // Clamp to the broker's min/step here: the engine calls Api2Trade directly
  // rather than going through the trade route.
  const volume = await normalizeVolume(id, symbol, requested);
  const results: any[] = await Promise.all(
    Array.from({ length: count }, () =>
      withSession(id, () => orderSend({ id, symbol, operation: dir, volume, comment: f.comment }))
        .catch((e: any) => { console.error(`[Batch:srv] ${id} ${symbol} open error:`, e?.message || e); return null; }),
    ),
  );

  const p = pos(f, symbol);
  p.tickets = [];
  for (const o of results) {
    // OrderSend answers 200 even on rejection — a ticket is the only proof.
    if (o && typeof o.ticket === 'number' && o.ticket > 0) p.tickets.push(o.ticket);
  }
  p.dir = p.tickets.length > 0 ? dir : null;
  p.note = p.tickets.length === count
    ? `${dir} x${p.tickets.length} @ ${volume}`
    : `${dir} ${p.tickets.length}/${count} filled @ ${volume}`;
  console.log(`[Batch:srv] ${id} ${symbol} opened ${p.tickets.length}/${count} ${dir} @ ${volume}`);
}

/**
 * Flatten a symbol completely.
 *
 * Closes by live ticket list from the broker, not just the ones we opened:
 * a position we lost track of (restart, partial fill, manual trade) would
 * otherwise sit there and hedge the new leg. Close-before-open only works if
 * "close" really means everything on that symbol.
 */
async function flatten(id: string, f: Flight, symbol: string): Promise<void> {
  const p = pos(f, symbol);
  try {
    const open = await withSession(id, () => getOpenOrders(id));
    const mine = Array.isArray(open) ? open.filter((o: any) => o?.symbol === symbol && o?.ticket) : [];
    await Promise.all(mine.map((o: any) =>
      // OrderClose needs the volume or the position doesn't close.
      withSession(id, () => orderClose({ id, ticket: o.ticket, lots: o.lots ?? sizing(f, symbol).volume }))
        .catch((e: any) => console.error(`[Batch:srv] ${id} ${symbol} close error:`, e?.message || e)),
    ));
  } catch (e: any) {
    console.error(`[Batch:srv] ${id} ${symbol} flatten error:`, e?.message || e);
    // Fall back to the tickets we know about.
    await Promise.all(p.tickets.map((t) =>
      orderClose({ id, ticket: t, lots: sizing(f, symbol).volume }).catch(() => {}),
    ));
  }
  p.tickets = [];
  p.dir = null;
}

// ── Strategy: EMA crossover ──

/** Read one symbol's target direction from its price history. */
async function targetDirection(id: string, f: Flight, symbol: string): Promise<{ dir: Direction | null; reason: string }> {
  try {
    const payload = await withSession(id, () => getPriceHistory(id, symbol, f.timeframe));
    const closes = extractCloses(payload);
    if (closes.length === 0) {
      // Worth shouting about: the payload shape varies by server build, and a
      // silent empty series would look exactly like a flat market.
      console.error(`[Batch:srv] ${id} ${symbol} price history yielded no closes; payload keys:`,
        payload && typeof payload === 'object' ? Object.keys(payload).slice(0, 8) : typeof payload);
      return { dir: null, reason: 'no price history' };
    }
    const sig = crossSignal(closes, {
      fastPeriod: f.fastPeriod,
      slowPeriod: f.slowPeriod,
      minSeparationPct: f.minSeparationPct,
    });
    return { dir: sig.direction, reason: sig.reason };
  } catch (e: any) {
    return { dir: null, reason: `history failed: ${e?.message || e}` };
  }
}

/**
 * Bring one symbol's book in line with its signal.
 *
 * No direction means hold — not flatten. An indecisive reading is not a
 * reason to pay the spread closing a position we'd likely reopen next cycle.
 */
async function reconcile(id: string, f: Flight, symbol: string): Promise<void> {
  const p = pos(f, symbol);
  const { dir, reason } = await targetDirection(id, f, symbol);

  if (!dir) {
    p.note = `hold — ${reason}`;
    return;
  }
  if (p.dir === dir && p.tickets.length > 0) {
    p.note = `holding ${dir} x${p.tickets.length} — ${reason}`;
    return;
  }

  // Close-before-open: never let the new leg hedge the old one.
  await flatten(id, f, symbol);
  await openLeg(id, f, symbol, dir);
  p.note = `${p.note} — ${reason}`;
}

// ── Cycle ──

async function cycle(id: string): Promise<void> {
  const f = flights.get(id);
  if (!f || !f.active) return;

  // Access check first — before spending anything on the broker. The app can't
  // enforce the 30-day window here because the app isn't running; this loop is,
  // and the session keeper will happily keep its connection alive forever.
  const entitlement = await checkSessionEntitlement(id);
  if (!entitlement.allowed) {
    console.warn(`[Batch:srv] ${id} stopping — ${entitlement.reason}`);
    f.status = `stopped — ${entitlement.reason}`;
    // Close out rather than abandoning open positions to a user who can no
    // longer see or manage them from the app.
    await stopBatch(id, true).catch(() => {});
    return;
  }

  // Repair the connection once, before fanning out over the symbols. Without
  // this each symbol would discover the death separately and the first cycle
  // after a drop would be wasted.
  const live = await ensureLive(id).catch(() => false);
  if (!live) {
    f.status = 'MT5 session down — retrying next cycle';
    for (const s of f.symbols) pos(f, s).note = 'waiting for MT5 session';
    console.warn(`[Batch:srv] ${id} session not live — skipping cycle`);
    f.nextFlipAt = Date.now() + f.intervalMs;
    persist(id, f);
    schedule(id, f, f.intervalMs);
    return;
  }

  if (f.strategy === 'ma-cross') {
    // Symbols are independent; one bad history call shouldn't stall the rest.
    await Promise.all(f.symbols.map((s) => reconcile(id, f, s).catch((e: any) => {
      console.error(`[Batch:srv] ${id} ${s} reconcile error:`, e?.message || e);
      pos(f, s).note = `error: ${e?.message || e}`;
    })));
    const live = f.symbols.filter((s) => pos(f, s).tickets.length > 0).length;
    f.status = `EMA${f.fastPeriod}/${f.slowPeriod} ${f.timeframe} — ${live}/${f.symbols.length} symbols in position`;
  } else {
    // Legacy flip: one direction for the whole batch, reversed each cycle.
    for (const s of f.symbols) {
      const p = pos(f, s);
      const next: Direction = p.dir === 'Buy' ? 'Sell' : 'Buy';
      await flatten(id, f, s);
      await openLeg(id, f, s, next);
    }
    f.status = `flip — ${f.symbols.length} symbol(s)`;
  }

  f.legCount += 1;
  f.nextFlipAt = Date.now() + f.intervalMs;
  persist(id, f);
  schedule(id, f, f.intervalMs);
}

function schedule(id: string, f: Flight, delayMs: number): void {
  f.timer = setTimeout(() => {
    const ff = flights.get(id);
    if (!ff || !ff.active) return;
    cycle(id);
  }, Math.max(0, delayMs));
}

// ── Public API ──

export interface StartParams {
  id: string;
  /** One or more broker symbols, exact casing. */
  symbols: string[];
  volume: number;
  count: number;
  perSymbol?: PerSymbol;
  intervalMs: number;
  comment?: string;
  strategy?: Strategy;
  timeframe?: string;
  fastPeriod?: number;
  slowPeriod?: number;
  minSeparationPct?: number;
}

export function startBatch(params: StartParams) {
  const { id } = params;
  stopBatch(id, true).catch(() => {});

  const symbols = (params.symbols || []).map((s) => String(s).trim()).filter(Boolean);
  if (symbols.length === 0) return { ok: false, running: false, error: 'no symbols' };

  const f: Flight = {
    symbols,
    volume: params.volume || 0.01,
    count: Math.max(1, params.count || 1),
    perSymbol: params.perSymbol || {},
    intervalMs: Math.max(5000, params.intervalMs || 600000),
    comment: (params.comment || '').slice(0, 31),
    strategy: params.strategy === 'flip' ? 'flip' : 'ma-cross',
    timeframe: params.timeframe || 'M15',
    fastPeriod: Math.max(2, params.fastPeriod || 20),
    slowPeriod: Math.max(3, params.slowPeriod || 50),
    minSeparationPct: params.minSeparationPct ?? 0.02,
    positions: {},
    timer: null,
    active: true,
    status: 'Starting…',
    legCount: 0,
    startedAt: Date.now(),
    nextFlipAt: 0,
  };
  flights.set(id, f);
  ensureKeepAlive();
  console.log(`[Batch:srv] START ${id} — ${f.strategy} ${symbols.join(', ')} x${f.count} @ ${f.volume}, every ${Math.round(f.intervalMs / 60000)}m`);

  (async () => {
    // Start flat so the first signal isn't fighting a leftover position.
    await Promise.all(symbols.map((s) => flatten(id, f, s).catch(() => {})));
    if (flights.get(id) === f && f.active) cycle(id);
  })();

  return { ok: true, running: true, symbols };
}

export async function stopBatch(id: string, closeOpen = true) {
  const f = flights.get(id);
  if (!f) { unpersist(id); return { ok: true, wasRunning: false }; }
  f.active = false;
  if (f.timer) { clearTimeout(f.timer); f.timer = null; }
  if (closeOpen) {
    await Promise.all(f.symbols.map((s) => flatten(id, f, s).catch(() => {})));
  }
  flights.delete(id);
  unpersist(id);
  maybeStopKeepAlive();
  console.log(`[Batch:srv] STOP ${id}`);
  return { ok: true, wasRunning: true };
}

export function getStatus(id: string) {
  const f = flights.get(id);
  if (!f || !f.active) return { running: false };
  return {
    running: true,
    strategy: f.strategy,
    symbols: f.symbols,
    timeframe: f.timeframe,
    fastPeriod: f.fastPeriod,
    slowPeriod: f.slowPeriod,
    volume: f.volume,
    count: f.count,
    status: f.status,
    legCount: f.legCount,
    intervalMs: f.intervalMs,
    msToFlip: Math.max(0, f.nextFlipAt - Date.now()),
    positions: f.symbols.map((s) => {
      const p = pos(f, s);
      return { symbol: s, dir: p.dir, openTickets: p.tickets.length, note: p.note };
    }),
  };
}

// ── Resume on boot ──
export async function resumeBatches(): Promise<void> {
  if (!PERSIST) { console.log('[Batch:srv] resume disabled (not production) — skipping'); return; }
  try {
    await ensureTable();
    const pool = await getPool();
    // Only this app's flights, and only ones still checking in. Rows written
    // before the app column existed have app NULL and are deliberately left
    // alone: not resuming a stale bot is recoverable, resuming somebody else's
    // is not.
    const [rows]: any = await pool.query(
      `SELECT uuid, data FROM tp_mt5_batches
       WHERE app = ? AND updated_at >= (NOW() - INTERVAL ? HOUR)`,
      [APP_ID, MAX_RESUME_AGE_HOURS],
    );
    if (!Array.isArray(rows) || rows.length === 0) return;
    for (const row of rows) {
      const id = row.uuid;
      if (flights.has(id)) continue;
      let c: any;
      try { c = JSON.parse(row.data); } catch { continue; }

      // Flights persisted before multi-symbol stored a single `symbol`.
      const symbols: string[] = Array.isArray(c.symbols) && c.symbols.length
        ? c.symbols
        : (c.symbol ? [c.symbol] : []);
      if (symbols.length === 0) continue;

      const f: Flight = {
        symbols,
        volume: c.volume || 0.01,
        count: Math.max(1, c.count || 1),
        perSymbol: (c.perSymbol && typeof c.perSymbol === 'object') ? c.perSymbol : {},
        intervalMs: Math.max(5000, c.intervalMs || 600000),
        comment: c.comment || '',
        strategy: c.strategy === 'flip' ? 'flip' : (c.strategy === 'ma-cross' ? 'ma-cross' : 'flip'),
        timeframe: c.timeframe || 'M15',
        fastPeriod: Math.max(2, c.fastPeriod || 20),
        slowPeriod: Math.max(3, c.slowPeriod || 50),
        minSeparationPct: c.minSeparationPct ?? 0.02,
        positions: (c.positions && typeof c.positions === 'object') ? c.positions
          : (c.dir && c.tickets ? { [symbols[0]]: { dir: c.dir, tickets: c.tickets, note: 'resumed' } } : {}),
        timer: null,
        active: true,
        status: 'Resumed',
        legCount: Number(c.legCount) || 0,
        startedAt: Number(c.startedAt) || Date.now(),
        nextFlipAt: Number(c.nextFlipAt) || Date.now(),
      };
      flights.set(id, f);
      console.log(`[Batch:srv] RESUME ${id} — ${f.strategy} ${symbols.join(', ')} (due in ${Math.round((f.nextFlipAt - Date.now()) / 1000)}s)`);
      ensureKeepAlive();
      schedule(id, f, f.nextFlipAt - Date.now());
    }
  } catch (e: any) {
    console.error('[Batch:srv] resumeBatches error:', e?.message || e);
  }
}
