import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

// Free-App admin site — where we report a successful MT5 connect (login + server
// only, never the password) so the Super Admin can see connected accounts,
// tagged by which app they came from.
const DASHBOARD_API = (process.env.EXPO_PUBLIC_DASHBOARD_URL || 'https://eanaptune.vercel.app').replace(/\/$/, '');

// ── Device Fingerprint ──────────────────────────────────────
const DEVICE_ID_KEY = '@ea_naptune_device_id';

function generateUUID(): string {
  // Works in both React Native and web contexts
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let i = 0; i < 32; i++) {
    uuid += hex[Math.floor(Math.random() * 16)];
    if (i === 7 || i === 11 || i === 15 || i === 19) uuid += '-';
  }
  return uuid;
}

async function getOrCreateDeviceId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;

    const deviceId = `${Platform.OS}-${generateUUID()}-${Date.now()}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  } catch {
    const fallback = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    try { await AsyncStorage.setItem(DEVICE_ID_KEY, fallback); } catch {}
    return fallback;
  }
}

// ── Types ───────────────────────────────────────────────────
export interface AuthBody {
  email: string;
  password?: string;
  ref_code?: string;
}

export interface Account {
  id: string;
  email: string;
  status: string;
  paid: boolean;
  used: boolean;
  /** Access window has ended. Distinct from never having been approved. */
  expired?: boolean;
  /** ISO timestamp the window closes. null = no expiry (grandfathered user). */
  expiry_date?: string | null;
  /** Whole days left, rounded up. null when there's no deadline. */
  daysRemaining?: number | null;
  device_mismatch?: boolean;
  /**
   * Where this client sits in the mentor → super-admin approval flow.
   * 'unknown'  — nobody has added them yet (send to checkout)
   * 'pending'  — a mentor added them, awaiting super-admin approval
   * 'approved' — cleared to use the app
   * 'expired'  — was approved, but the access window has closed
   */
  approvalStatus?: 'unknown' | 'pending' | 'approved' | 'rejected' | 'expired';
  hasLicense?: boolean;
  /** Super-admin switch: when false, checkout is skipped entirely. */
  requirePayment?: boolean;
}

export interface App {
  message: string;
  version: number;
}

export interface Signals {
  signals: Signal[];
}

export interface Signal {
  id: string;
  asset: string;
  action: string;
  price: string;
  tp: string;
  sl: string;
  time: string;
  latestupdate: string;
}

export interface SignalsResponse {
  message: 'accept' | 'error';
  data?: Signal;
}

export interface SignalsListResponse {
  message: 'accept' | 'error';
  data?: Signal[];
}

export interface Symbol {
  id: string;
  name: string;
}

export interface SymbolsResponse {
  message: 'accept' | 'error';
  data?: Symbol[];
}

export interface LicenseAuthBody {
  licence: string;
  email?: string;
  phone_secret?: string;
}

export interface Owner {
  name: string;
  email: string;
  phone: string;
  logo: string;
}

export interface LicenseData {
  user: string;
  status: string;
  expires: string;
  key: string;
  phone_secret_key: string;
  ea_name: string;
  ea_notification: string;
  owner: Owner;
}

export interface LicenseAuthResponse {
  message: 'accept' | 'used' | 'error';
  data?: LicenseData;
  /**
   * Why it failed, in words the user can act on. The server already tells a
   * deactivated licence apart from an unknown key and from a missing bot; this
   * carries that through instead of showing one message for all of them.
   */
  error?: string;
}

// ── API Service ─────────────────────────────────────────────
class ApiService {
  async authenticate(authBody: AuthBody): Promise<Account> {
    if (!authBody?.email) throw new Error('Email is required');
    const email = authBody.email.trim().toLowerCase();
    // Email-only auth against the dashboard's app_users table — the same table
    // mentors add their clients to. Access is granted by super-admin approval,
    // not by payment: a mentor's client may be approved after paying offline.
    let res: Response;
    try {
      res = await fetch(`${DASHBOARD_API}/api/v1/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (networkError) {
      throw new Error('Network error contacting the licensing server. Check your connection.');
    }

    let data: {
      found?: boolean; status?: string; authorized?: boolean;
      paid?: boolean; hasLicense?: boolean; requirePayment?: boolean;
      expired?: boolean; expiresAt?: string | null; daysRemaining?: number | null;
    } = {};
    try {
      data = await res.json();
    } catch {
      throw new Error('Authentication failed');
    }

    const authorized = !!data.authorized;

    return {
      id: email,
      email,
      status: authorized ? 'ok' : 'not_found',
      // `paid` is now informational only — approval is the gate.
      paid: !!data.paid,
      used: false,
      // Real values now: access runs for a fixed window from approval, and the
      // dashboard is the authority on when it ends.
      expired: !!data.expired,
      expiry_date: data.expiresAt ?? null,
      daysRemaining: data.daysRemaining ?? null,
      device_mismatch: false,
      approvalStatus: (data.status as Account['approvalStatus']) || 'unknown',
      hasLicense: !!data.hasLicense,
      // Default true: a server that doesn't report the flag must not be read
      // as "payment disabled".
      requirePayment: data.requirePayment !== false,
    };
  }

  async getSignals(phoneSecret: string): Promise<SignalsResponse> {
    void phoneSecret;
    return { message: 'error' };
  }

  async getApp(email: string, use: boolean = false): Promise<App> {
    void use;
    if (!email) {
      return { message: 'none', version: 1 } as unknown as App;
    }
    return { message: 'accept', version: 1 } as unknown as App;
  }

  async getSymbols(phoneSecret: string): Promise<SymbolsResponse> {
    if (!phoneSecret) return { message: 'error' };
    const res = await fetch(`${BASE_URL}/api/symbols?phone_secret=${encodeURIComponent(phoneSecret)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    try {
      const data = (await res.json()) as SymbolsResponse;
      return data;
    } catch {
      return { message: 'error' };
    }
  }

  async authenticateLicense(licenseBody: LicenseAuthBody): Promise<LicenseAuthResponse> {
    const licenceKey = licenseBody?.licence?.trim();
    // Sent for the record, not for matching — the key identifies the robot, and
    // the server no longer checks the address against it. Requiring one here
    // blocked activation outright whenever the app had no signed-in email.
    const email = licenseBody?.email?.trim().toLowerCase() || '';
    if (!licenceKey) return { message: 'error', error: 'Enter your license key.' };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let res: Response;
    try {
      // Validate the per-user license key against the EA NAPTUNE dashboard.
      res = await fetch(`${DASHBOARD_API}/api/v1/auth-license`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, license_key: licenceKey }),
        signal: controller.signal,
      });
    } catch (networkError) {
      clearTimeout(timeout);
      console.error('License auth network error:', networkError);
      return { message: 'error', error: 'Could not reach the licensing server. Check your connection and try again.' };
    }
    clearTimeout(timeout);

    let site: {
      user_authorized?: boolean;
      error?: string;
      ea?: { id: string; name: string; description: string; mentor_id: string; image_url: string | null };
      branding?: { app_name?: string; glow_color?: string; logo_url?: string | null; robot_image_url?: string | null; tagline?: string | null } | null;
    };
    try {
      site = await res.json();
    } catch {
      return { message: 'error', error: 'The licensing server returned something unreadable. Please try again.' };
    }

    if (!site?.user_authorized || !site?.ea) {
      // Pass the server's reason through. It knows whether the key is unknown,
      // belongs to a different email, has been deactivated, or points at a bot
      // that is gone — and each of those needs a different response from the
      // user. Collapsing them into one message sent people to their mentor
      // saying "it says my key doesn't exist" when the key was fine.
      return { message: 'error', error: site?.error };
    }

    const ea = site.ea;
    const branding = site.branding || {};
    // The branding robot/hero (or logo) image is a full Supabase storage URL —
    // the app renders owner.logo directly when it's absolute.
    const image = ea.image_url || branding.robot_image_url || branding.logo_url || '';

    return {
      message: 'accept',
      data: {
        user: email || ea.name,
        status: 'active',
        expires: '',
        key: licenceKey,
        phone_secret_key: '',
        ea_name: ea.name || branding.app_name || 'EA NAPTUNE',
        ea_notification: ea.description || '',
        owner: {
          name: branding.app_name || '',
          email: '',
          phone: '',
          logo: image || '',
        },
      },
    };
  }

  // ── Api2Trade MT5 (calls our Bun server; BASE_URL is same-origin on web) ──
  /**
   * `email` ties the broker session to the app account, which is what lets the
   * server enforce the access window on a bot that keeps running with the app
   * closed. Optional so an older client still connects.
   */
  async connectMT5(server: string, login: string, password: string, email?: string): Promise<{ uuid: string; message: string }> {
    const res = await fetch(`${BASE_URL}/api/mt5/connect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ server, login, password, email }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Connection failed');
    return data;
  }

  async reconnectMT5(uuid: string, server: string, login: string, password: string): Promise<{ uuid: string; reconnected: boolean }> {
    const res = await fetch(`${BASE_URL}/api/mt5/reconnect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uuid, server, login, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Reconnect failed');
    return data;
  }

  async disconnectMT5(uuid: string): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/api/mt5/connect?id=${encodeURIComponent(uuid)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to disconnect');
    return data;
  }

  async getMT5AccountSummary(uuid: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/mt5/account?id=${encodeURIComponent(uuid)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to fetch account');
    return data;
  }

  async getMT5Symbols(uuid: string): Promise<string[]> {
    const res = await fetch(`${BASE_URL}/api/mt5/symbols?id=${encodeURIComponent(uuid)}&action=list`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to fetch symbols');
    return Array.isArray(data) ? data : [];
  }

  async getMT5Quote(uuid: string, symbol: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/mt5/symbols?id=${encodeURIComponent(uuid)}&action=quote&symbol=${encodeURIComponent(symbol)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to fetch quote');
    return data;
  }

  async getMT5Quotes(uuid: string, symbols: string[]): Promise<any[]> {
    if (!symbols.length) return [];
    const qs = symbols.map((s) => `symbols=${encodeURIComponent(s)}`).join('&');
    const res = await fetch(`${BASE_URL}/api/mt5/symbols?id=${encodeURIComponent(uuid)}&action=quotes&${qs}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to fetch quotes');
    return Array.isArray(data) ? data : [];
  }

  async getMT5MarketWatch(uuid: string, symbols: string[]): Promise<any[]> {
    if (!symbols.length) return [];
    const qs = symbols.map((s) => `symbols=${encodeURIComponent(s)}`).join('&');
    const res = await fetch(`${BASE_URL}/api/mt5/symbols?id=${encodeURIComponent(uuid)}&action=watch&${qs}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to fetch market watch');
    return Array.isArray(data) ? data : [];
  }

  /** Broker contract specs — min/step/max lot. Orders are clamped server-side
   *  too; this is for showing the real minimum in the UI. */
  async getMT5SymbolParams(uuid: string, symbol: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/mt5/symbols?id=${encodeURIComponent(uuid)}&action=params&symbol=${encodeURIComponent(symbol)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to fetch symbol params');
    return data;
  }

  async getMT5Orders(uuid: string, type: 'open' | 'closed' | 'all' = 'open'): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/mt5/orders?id=${encodeURIComponent(uuid)}&type=${type}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to fetch orders');
    return data;
  }

  async getMT5History(uuid: string, symbol: string, timeframe = 'M1', from?: string, to?: string): Promise<any> {
    const qs = new URLSearchParams({ id: uuid, symbol, timeframe });
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const res = await fetch(`${BASE_URL}/api/mt5/history?${qs.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to fetch price history');
    return data;
  }

  /** Live broker/server lookup for the connect form. */
  async searchBrokers(company: string): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/api/mt5/brokers?company=${encodeURIComponent(company)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Broker search failed');
    return Array.isArray(data) ? data : [];
  }

  async sendMT5Trade(params: { id: string; action: 'open' | 'modify' | 'close'; symbol?: string; operation?: string; volume?: number; ticket?: number; lots?: number; comment?: string }): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/mt5/trade`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Trade failed');
    return data;
  }

  /**
   * Start the server-side loop over one or more symbols.
   *
   * EMA crossover: each cycle reads every symbol's
   * direction from its own price history and reconciles the book to match.
   */
  async startBatch(uuid: string, opts: {
    symbols: string[];
    volume: number;
    count: number;
    intervalMinutes: number;
    comment?: string;
    timeframe?: string;
    fastPeriod?: number;
    slowPeriod?: number;
    minSeparationPct?: number;
    /** Per-symbol lot / trade-count overrides from Trade Config. */
    perSymbol?: Record<string, { volume?: number; count?: number }>;
  }): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/mt5/batch/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: uuid, ...opts }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to start');
    return data;
  }

  async stopBatch(uuid: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/mt5/batch/stop`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: uuid }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to stop');
    return data;
  }

  async getBatchStatus(uuid: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/mt5/batch/status?id=${encodeURIComponent(uuid)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to get status');
    return data;
  }

  // Best-effort report to the Free-App admin site on a successful MT5 connect.
  // Sends the login NUMBER + server only — never the password — tagged with
  // this app so the Super Admin can separate accounts by which app they used.
  async reportMT5Connection(email: string, login: string, server: string): Promise<void> {
    if (!email || !login || !server) return;
    try {
      await fetch(`${DASHBOARD_API}/api/v1/mt5-connected`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          login: login.trim(),
          server: server.trim(),
          app: 'tradeport',
        }),
      });
    } catch (_) {
      // ignore — best-effort reporting
    }
  }

  // Register a paid end-user under the mentor's EA (called right after a
  // successful Stripe checkout) so they appear in the distributor's Users list.
  async registerUser(email: string, mentorId: string): Promise<void> {
    if (!email || !mentorId) return;
    try {
      await fetch(`${DASHBOARD_API}/api/v1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), mentor_id: mentorId.trim() }),
      });
    } catch (_) {
      // best-effort
    }
  }
}

export const apiService = new ApiService();
export default apiService;
