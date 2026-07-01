// Server-side batch engine (SERVER ONLY). Start → open a batch → hold the
// interval → close all → flip direction → reopen, looping. Runs on the Bun
// server so it keeps going while the app is backgrounded/closed.
//
// Hardened for reboots: each flight is persisted to MySQL and resumeBatches()
// reloads active flights on server startup and continues the loop. Keep-alive
// self-pings /health to reduce free-tier sleep (an external uptime pinger is
// still the dependable anti-sleep on free tier).
import { orderSend, orderClose, getOpenOrders } from '@/services/api2trade';
import { getPool } from '@/app/api/_db';

type Leg = 'Buy' | 'Sell';

interface Flight {
  symbol: string;
  volume: number;
  count: number;
  intervalMs: number;
  comment: string;
  dir: Leg;
  tickets: number[];
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
  tableReady = true;
}

function persist(id: string, f: Flight): void {
  if (!PERSIST) return;
  (async () => {
    try {
      await ensureTable();
      const pool = await getPool();
      const data = JSON.stringify({
        symbol: f.symbol, volume: f.volume, count: f.count, intervalMs: f.intervalMs,
        comment: f.comment, dir: f.dir, tickets: f.tickets, nextFlipAt: f.nextFlipAt,
        legCount: f.legCount, startedAt: f.startedAt,
      });
      await pool.query(
        'INSERT INTO tp_mt5_batches (uuid, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
        [id, data],
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

// ── Trading primitives (all concurrent) ──
async function openBatch(id: string, f: Flight): Promise<void> {
  const dir = f.dir;
  const results: any[] = await Promise.all(
    Array.from({ length: f.count }, () =>
      orderSend({ id, symbol: f.symbol, operation: dir, volume: f.volume, comment: f.comment })
        .catch((e: any) => { console.error(`[Batch:srv] ${id} open error:`, e?.message || e); return null; }),
    ),
  );
  f.tickets = [];
  for (const o of results) {
    if (o && typeof o.ticket === 'number' && o.ticket > 0) f.tickets.push(o.ticket);
    else if (o) f.status = `Broker rejected ${dir} ${f.symbol}: ${o?.error || o?.message || 'no ticket'}`;
  }
  console.log(`[Batch:srv] ${id} opened ${f.tickets.length}/${f.count} ${dir} ${f.symbol}`);
}

async function closeBatch(id: string, f: Flight): Promise<void> {
  const toClose = [...f.tickets];
  f.tickets = [];
  await Promise.all(toClose.map((t) =>
    orderClose({ id, ticket: t, lots: f.volume })
      .then(() => console.log(`[Batch:srv] ${id} closed ${t}`))
      .catch((e: any) => console.error(`[Batch:srv] ${id} close error:`, e?.message || e)),
  ));
}

// Close any positions already open on this symbol so a flight starts flat.
async function cleanSymbol(id: string, symbol: string): Promise<void> {
  try {
    const open = await getOpenOrders(id);
    if (!Array.isArray(open)) return;
    const mine = open.filter((o: any) => o?.symbol === symbol && o?.ticket);
    if (mine.length === 0) return;
    await Promise.all(mine.map((o: any) => orderClose({ id, ticket: o.ticket, lots: o.lots }).catch(() => {})));
  } catch (e: any) { console.error(`[Batch:srv] ${id} cleanSymbol error:`, e?.message || e); }
}

function scheduleFlip(id: string, f: Flight, delayMs: number): void {
  f.timer = setTimeout(async () => {
    const ff = flights.get(id);
    if (!ff || !ff.active) return;
    await closeBatch(id, ff);
    ff.dir = ff.dir === 'Buy' ? 'Sell' : 'Buy'; // flip each cycle
    cycle(id);
  }, Math.max(0, delayMs));
}

async function cycle(id: string): Promise<void> {
  const f = flights.get(id);
  if (!f || !f.active) return;
  await openBatch(id, f);
  f.legCount += 1;
  f.nextFlipAt = Date.now() + f.intervalMs;
  f.status = `${f.dir} ${f.symbol} x${f.tickets.length} — flips in ${Math.round(f.intervalMs / 60000)}m`;
  persist(id, f);
  scheduleFlip(id, f, f.intervalMs);
}

// ── Public API ──
export function startBatch(params: { id: string; symbol: string; volume: number; count: number; intervalMs: number; comment?: string }) {
  const { id } = params;
  stopBatch(id, true).catch(() => {});
  const f: Flight = {
    symbol: params.symbol,
    volume: params.volume || 0.01,
    count: Math.max(1, params.count || 1),
    intervalMs: Math.max(5000, params.intervalMs || 600000),
    comment: (params.comment || '').slice(0, 31),
    dir: Math.random() < 0.5 ? 'Buy' : 'Sell', // random first side; flips each cycle
    tickets: [],
    timer: null,
    active: true,
    status: 'Starting…',
    legCount: 0,
    startedAt: Date.now(),
    nextFlipAt: 0,
  };
  flights.set(id, f);
  ensureKeepAlive();
  console.log(`[Batch:srv] START ${id} — ${f.symbol} x${f.count} @ ${f.volume}, flip every ${Math.round(f.intervalMs / 60000)}m`);
  (async () => {
    await cleanSymbol(id, f.symbol);
    if (flights.get(id) === f && f.active) cycle(id);
  })();
  return { ok: true, running: true };
}

export async function stopBatch(id: string, closeOpen = true) {
  const f = flights.get(id);
  if (!f) { unpersist(id); return { ok: true, wasRunning: false }; }
  f.active = false;
  if (f.timer) { clearTimeout(f.timer); f.timer = null; }
  if (closeOpen && f.tickets.length) {
    await Promise.all(f.tickets.map((t) =>
      orderClose({ id, ticket: t, lots: f.volume })
        .then(() => console.log(`[Batch:srv] ${id} closed ${t} on stop`))
        .catch((e: any) => console.error(`[Batch:srv] ${id} stop-close error:`, e?.message || e)),
    ));
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
    symbol: f.symbol,
    volume: f.volume,
    count: f.count,
    dir: f.dir,
    openTickets: f.tickets.length,
    status: f.status,
    legCount: f.legCount,
    intervalMs: f.intervalMs,
    msToFlip: Math.max(0, f.nextFlipAt - Date.now()),
  };
}

// ── Resume on boot ──
export async function resumeBatches(): Promise<void> {
  if (!PERSIST) { console.log('[Batch:srv] resume disabled (not production) — skipping'); return; }
  try {
    await ensureTable();
    const pool = await getPool();
    const [rows]: any = await pool.query('SELECT uuid, data FROM tp_mt5_batches');
    if (!Array.isArray(rows) || rows.length === 0) return;
    for (const row of rows) {
      const id = row.uuid;
      if (flights.has(id)) continue;
      let c: any;
      try { c = JSON.parse(row.data); } catch { continue; }
      const f: Flight = {
        symbol: c.symbol,
        volume: c.volume || 0.01,
        count: Math.max(1, c.count || 1),
        intervalMs: Math.max(5000, c.intervalMs || 600000),
        comment: c.comment || '',
        dir: c.dir === 'Sell' ? 'Sell' : 'Buy',
        tickets: Array.isArray(c.tickets) ? c.tickets : [],
        timer: null,
        active: true,
        status: 'Resumed',
        legCount: Number(c.legCount) || 0,
        startedAt: Number(c.startedAt) || Date.now(),
        nextFlipAt: Number(c.nextFlipAt) || Date.now(),
      };
      flights.set(id, f);
      console.log(`[Batch:srv] RESUME ${id} — ${f.symbol} x${f.count} flip every ${Math.round(f.intervalMs / 60000)}m (due in ${Math.round((f.nextFlipAt - Date.now()) / 1000)}s)`);
      ensureKeepAlive();
      // Continue the loop: fire the next flip after the remaining hold (or now if overdue).
      scheduleFlip(id, f, f.nextFlipAt - Date.now());
    }
  } catch (e: any) {
    console.error('[Batch:srv] resumeBatches error:', e?.message || e);
  }
}
