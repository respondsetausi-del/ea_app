// Access entitlement for server-side trading (SERVER ONLY).
//
// The app checks a user's access at login. That is enough while a human is
// driving, and not enough at all here: the batch engine trades with the app
// closed, and — since the session keeper now revives dropped connections on
// its own — an expired user's loop would otherwise keep trading indefinitely.
// Nothing in the app can stop it, because the app isn't running.
//
// So the server asks the dashboard directly, on a cadence, and kills flights
// whose access has ended.
import { getSessionEmail } from '@/server-api/mt5/session-keeper';

const DASHBOARD = (process.env.DASHBOARD_URL || process.env.EXPO_PUBLIC_DASHBOARD_URL || 'https://eanaptune.vercel.app').replace(/\/$/, '');

/** Entitlement changes on the scale of days; re-asking per cycle is wasteful. */
const TTL_MS = 15 * 60 * 1000;
const TIMEOUT_MS = 10_000;

interface Entry {
  at: number;
  allowed: boolean;
  reason: string;
}

const cache = new Map<string, Entry>();

export interface Entitlement {
  allowed: boolean;
  reason: string;
}

/**
 * Is this email still entitled to trade?
 *
 * Fails OPEN on an unreachable dashboard. A licensing outage must not close
 * live positions and strand people mid-trade — that's a far worse failure than
 * a few extra hours of access for someone whose window just lapsed. Only a
 * clear, authoritative "no" stops a flight.
 */
export async function checkEntitlement(email: string): Promise<Entitlement> {
  if (!email) return { allowed: true, reason: 'no email on session (legacy) — allowing' };

  const hit = cache.get(email);
  if (hit && Date.now() - hit.at < TTL_MS) return { allowed: hit.allowed, reason: hit.reason };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${DASHBOARD}/api/v1/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email }),
      signal: controller.signal,
    });
    if (!res.ok) return { allowed: true, reason: `dashboard ${res.status} — allowing` };

    const data: any = await res.json();
    // `authorized` already folds in approved + active + inside the window.
    const allowed = !!data?.authorized;
    const reason = allowed
      ? `authorized${data?.daysRemaining != null ? ` (${data.daysRemaining}d left)` : ''}`
      : data?.expired
        ? `access expired${data?.expiresAt ? ` on ${String(data.expiresAt).slice(0, 10)}` : ''}`
        : `not authorized (${data?.status ?? 'unknown'})`;

    cache.set(email, { at: Date.now(), allowed, reason });
    return { allowed, reason };
  } catch (e: any) {
    // Timeout, DNS, TLS — all "we don't know", so don't act on it.
    return { allowed: true, reason: `entitlement check failed (${e?.name || 'error'}) — allowing` };
  } finally {
    clearTimeout(timer);
  }
}

/** Entitlement for whoever owns this MT5 session. */
export async function checkSessionEntitlement(uuid: string): Promise<Entitlement> {
  const email = getSessionEmail(uuid);
  if (!email) return { allowed: true, reason: 'session has no owner recorded — allowing' };
  return checkEntitlement(email);
}

/** Drop a cached decision so a renewal takes effect without waiting out the TTL. */
export function invalidateEntitlement(email: string): void {
  cache.delete(email);
}
