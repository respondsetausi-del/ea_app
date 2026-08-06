// MT5 session keeper (SERVER ONLY).
//
// Api2Trade sessions die on their own: broker idle timeouts, infra restarts,
// the dedicated server recycling. Until now only the *client* could revive one
// — it held the credentials and called /api/mt5/reconnect before trading. That
// works while someone has the app open, and not at all otherwise, which is
// precisely when the server-side batch engine is doing the trading. A flight
// whose session expired would keep looping, fail every call, and log "hold"
// forever while the app still showed the bot as running.
//
// This module owns the session's liveness on the server:
//   • credentials are registered on connect and survive a reboot
//   • a heartbeat probes every live session and revives dead ones
//   • callers can wrap any Api2Trade call so a mid-flight death is repaired
//     and the call retried, instead of surfacing as a lost cycle
//
// SECURITY: reviving a session without the app means the server must hold the
// MT5 password. It is encrypted at rest with AES-256-GCM under MT5_SESSION_KEY.
// Without that env var the credentials are kept in memory only — sessions then
// survive expiry but not a server restart. That's the safe default: it fails
// toward "less persistence", never toward "plaintext passwords in MySQL".
import crypto from 'crypto';
import { connectEx, getAccountSummary } from '@/services/api2trade';
import { getPool } from '@/app/api/_db';

interface Credentials {
  server: string;
  login: string;
  password: string;
  /**
   * The app account this session belongs to.
   *
   * Without it the server cannot tell whose bot is running: the batch engine
   * is keyed by MT5 uuid, access is keyed by email, and nothing joined the
   * two. That gap is what would let an expired user's server-side loop keep
   * trading forever — the app can lock them out, but the loop never sees it.
   */
  email?: string;
}

interface Session extends Credentials {
  /** Last time we confirmed the broker still holds this session. */
  lastOk: number;
  /** Consecutive revive failures — used to back off a hopeless session. */
  failures: number;
  reviving: Promise<boolean> | null;
}

const sessions = new Map<string, Session>();

const HEARTBEAT_MS = 4 * 60 * 1000;
/** Stop hammering a session that will not come back (bad password, dead account). */
const MAX_FAILURES = 20;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let tableReady = false;

// ── Encryption at rest ──────────────────────────────────────

function encryptionKey(): Buffer | null {
  const raw = process.env.MT5_SESSION_KEY || '';
  if (!raw) return null;
  // Accept hex, base64 or a passphrase; always end up with 32 bytes.
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
  const b64 = Buffer.from(raw, 'base64');
  if (b64.length === 32) return b64;
  return crypto.createHash('sha256').update(raw).digest();
}

function encrypt(plain: string, key: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

function decrypt(payload: string, key: Buffer): string | null {
  try {
    const [ivB64, tagB64, dataB64] = payload.split('.');
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    // Wrong key or tampered row — treat as unusable rather than throwing.
    return null;
  }
}

// ── Persistence ─────────────────────────────────────────────
//
// Gated the same way batch persistence is: local and production share one
// MySQL, so a dev server must not resurrect production sessions.
const PERSIST = process.env.RENDER === 'true' || process.env.BATCH_PERSIST === '1';

async function ensureTable(): Promise<void> {
  if (tableReady) return;
  const pool = await getPool();
  await pool.query(
    `CREATE TABLE IF NOT EXISTS tp_mt5_sessions (
      uuid VARCHAR(80) PRIMARY KEY,
      server VARCHAR(190) NOT NULL,
      login VARCHAR(100) NOT NULL,
      secret TEXT NOT NULL,
      email VARCHAR(190) NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
  );
  tableReady = true;
}

function persist(uuid: string, c: Credentials): void {
  if (!PERSIST) return;
  const key = encryptionKey();
  if (!key) {
    console.warn('[MT5:session] MT5_SESSION_KEY not set — credentials kept in memory only; sessions will not survive a restart');
    return;
  }
  (async () => {
    try {
      await ensureTable();
      const pool = await getPool();
      await pool.query(
        `INSERT INTO tp_mt5_sessions (uuid, server, login, secret, email) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE server = VALUES(server), login = VALUES(login), secret = VALUES(secret), email = VALUES(email)`,
        [uuid, c.server, c.login, encrypt(c.password, key), c.email ?? null],
      );
    } catch (e: any) {
      console.error('[MT5:session] persist error:', e?.message || e);
    }
  })();
}

function unpersist(uuid: string): void {
  if (!PERSIST) return;
  (async () => {
    try { await ensureTable(); const pool = await getPool(); await pool.query('DELETE FROM tp_mt5_sessions WHERE uuid = ?', [uuid]); }
    catch (e: any) { console.error('[MT5:session] unpersist error:', e?.message || e); }
  })();
}

// ── Public API ──────────────────────────────────────────────

/** Called after any successful connect so the server can revive this session later. */
export function registerSession(uuid: string, c: Credentials): void {
  if (!uuid || !c?.server || !c?.login || !c?.password) return;
  sessions.set(uuid, { ...c, lastOk: Date.now(), failures: 0, reviving: null });
  persist(uuid, c);
  startHeartbeat();
  console.log(`[MT5:session] registered ${uuid} (${c.login}@${c.server})`);
}

export function forgetSession(uuid: string): void {
  sessions.delete(uuid);
  unpersist(uuid);
  if (sessions.size === 0 && heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  console.log(`[MT5:session] forgot ${uuid}`);
}

export function isRegistered(uuid: string): boolean {
  return sessions.has(uuid);
}

/** Which app account owns this session. Undefined for pre-email sessions. */
export function getSessionEmail(uuid: string): string | undefined {
  return sessions.get(uuid)?.email;
}

/** True when the broker still holds this session. */
async function probe(uuid: string): Promise<boolean> {
  try {
    const summary = await getAccountSummary(uuid);
    // ConnectEx reports success even on bad credentials, but leverage is 0 —
    // so leverage is the real liveness signal, not a 200.
    return !!summary?.leverage;
  } catch {
    return false;
  }
}

/**
 * Make sure `uuid` is live, reconnecting under the SAME uuid if it isn't.
 *
 * Concurrent callers share one revive attempt: a cycle reconciling six symbols
 * would otherwise fire six ConnectEx calls at a broker that just dropped us.
 */
export async function ensureLive(uuid: string): Promise<boolean> {
  const s = sessions.get(uuid);
  if (!s) return probe(uuid); // Not ours to revive — report what we can see.

  if (s.reviving) return s.reviving;

  const attempt = (async () => {
    if (await probe(uuid)) {
      s.lastOk = Date.now();
      s.failures = 0;
      return true;
    }

    if (s.failures >= MAX_FAILURES) {
      console.error(`[MT5:session] ${uuid} given up after ${s.failures} failed revives`);
      return false;
    }

    console.warn(`[MT5:session] ${uuid} looks dead — reconnecting`);
    // Tolerate ConnectEx throwing ("already connected" and friends); the
    // re-probe below is the gate that actually decides.
    await connectEx(uuid, s.server, s.login, s.password).catch(() => {});
    const live = await probe(uuid);
    if (live) {
      s.lastOk = Date.now();
      s.failures = 0;
      console.log(`[MT5:session] ${uuid} reconnected`);
    } else {
      s.failures += 1;
      console.error(`[MT5:session] ${uuid} reconnect failed (${s.failures})`);
    }
    return live;
  })().finally(() => { s.reviving = null; });

  s.reviving = attempt;
  return attempt;
}

/**
 * Run an Api2Trade call, reviving the session and retrying once if it fails.
 *
 * This is what makes a dropped connection invisible to the batch engine: the
 * first call fails, the session is rebuilt under the same uuid, and the call
 * runs again — instead of the cycle being lost.
 */
export async function withSession<T>(uuid: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (firstError) {
    const live = await ensureLive(uuid);
    if (!live) throw firstError;
    return fn();
  }
}

// ── Heartbeat ───────────────────────────────────────────────

function startHeartbeat(): void {
  if (heartbeatTimer || sessions.size === 0) return;
  heartbeatTimer = setInterval(() => {
    for (const uuid of [...sessions.keys()]) {
      // ensureLive already probes first, so this both keeps the session warm
      // and wakes it back up the moment the broker has dropped it.
      ensureLive(uuid).catch(() => {});
    }
  }, HEARTBEAT_MS);
  console.log(`[MT5:session] heartbeat started (every ${Math.round(HEARTBEAT_MS / 60000)}m)`);
}

/** Reload persisted sessions on boot so resumed flights have a live account. */
export async function resumeSessions(): Promise<void> {
  if (!PERSIST) { console.log('[MT5:session] resume disabled (not production) — skipping'); return; }
  const key = encryptionKey();
  if (!key) { console.warn('[MT5:session] MT5_SESSION_KEY not set — cannot restore sessions'); return; }
  try {
    await ensureTable();
    const pool = await getPool();
    const [rows]: any = await pool.query('SELECT uuid, server, login, secret, email FROM tp_mt5_sessions');
    if (!Array.isArray(rows) || rows.length === 0) return;
    for (const row of rows) {
      const password = decrypt(row.secret, key);
      if (!password) { console.error(`[MT5:session] could not decrypt ${row.uuid} — skipping`); continue; }
      sessions.set(row.uuid, {
        server: row.server, login: row.login, password, email: row.email || undefined,
        lastOk: 0, failures: 0, reviving: null,
      });
    }
    console.log(`[MT5:session] restored ${sessions.size} session(s)`);
    startHeartbeat();
    // Revive immediately — a resumed flight may be due to trade at once.
    await Promise.all([...sessions.keys()].map((u) => ensureLive(u).catch(() => false)));
  } catch (e: any) {
    console.error('[MT5:session] resumeSessions error:', e?.message || e);
  }
}

export function sessionStatus() {
  return [...sessions.entries()].map(([uuid, s]) => ({
    uuid,
    login: s.login,
    server: s.server,
    lastOk: s.lastOk,
    ageMs: s.lastOk ? Date.now() - s.lastOk : null,
    failures: s.failures,
  }));
}
