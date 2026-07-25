import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

// Free-App admin site — where we report a successful MT5 connect (login + server
// only, never the password) so the Super Admin can see connected accounts,
// tagged by which app they came from.
const DASHBOARD_API = (process.env.EXPO_PUBLIC_DASHBOARD_URL || 'https://eanaptune.vercel.app').replace(/\/$/, '');

// ── Device Fingerprint ──────────────────────────────────────
const DEVICE_ID_KEY = '@tradeport_device_id';

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
  mentor?: string;
  ref_code?: string;
}

export interface Account {
  id: string;
  email: string;
  status: string;
  paid: boolean;
  used: boolean;
  invalidMentor?: number;
  expired?: boolean;
  expiry_date?: string | null;
  device_mismatch?: boolean;
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
}

// ── API Service ─────────────────────────────────────────────
class ApiService {
  async authenticate(authBody: AuthBody): Promise<Account> {
    if (!authBody?.email) throw new Error('Email is required');
    const email = authBody.email.trim().toLowerCase();
    const mentorId = (authBody.mentor || '').toString().trim();

    // The Mentor ID is an EA's id. Validate it — and whether this email is
    // invited to that EA — against the EA NAPTUNE dashboard config endpoint.
    let res: Response;
    try {
      res = await fetch(
        `${DASHBOARD_API}/api/v1/config/${encodeURIComponent(mentorId)}?email=${encodeURIComponent(email)}`,
        { method: 'GET', headers: { 'Accept': 'application/json' } }
      );
    } catch (networkError) {
      throw new Error('Network error contacting the licensing server. Check your connection.');
    }

    // 404 → the Mentor ID doesn't match any active EA.
    if (res.status === 404) {
      return {
        id: email, email, status: 'ok', paid: false, used: false,
        invalidMentor: 1, expired: false, expiry_date: null, device_mismatch: false,
      };
    }

    let data: { user_authorized?: boolean } = {};
    try {
      data = await res.json();
    } catch {
      throw new Error('Authentication failed');
    }

    const authorized = !!data.user_authorized;
    return {
      id: email,
      email,
      status: authorized ? 'ok' : 'not_found',
      paid: authorized, // invited to this EA → may proceed to the license step
      used: false,
      invalidMentor: 0,
      expired: false,
      expiry_date: null,
      device_mismatch: false,
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
    const email = licenseBody?.email?.trim().toLowerCase();
    if (!licenceKey || !email) return { message: 'error' };

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
      return { message: 'error' };
    }
    clearTimeout(timeout);

    let site: {
      user_authorized?: boolean;
      ea?: { id: string; name: string; description: string; mentor_id: string; image_url: string | null };
      branding?: { app_name?: string; glow_color?: string; logo_url?: string | null; robot_image_url?: string | null; tagline?: string | null } | null;
    };
    try {
      site = await res.json();
    } catch {
      return { message: 'error' };
    }

    if (!site?.user_authorized || !site?.ea) {
      return { message: 'error' };
    }

    const ea = site.ea;
    const branding = site.branding || {};
    // The branding robot/hero (or logo) image is a full Supabase storage URL —
    // the app renders owner.logo directly when it's absolute.
    const image = ea.image_url || branding.robot_image_url || branding.logo_url || '';

    return {
      message: 'accept',
      data: {
        user: email,
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
  async connectMT5(server: string, login: string, password: string): Promise<{ uuid: string; message: string }> {
    const res = await fetch(`${BASE_URL}/api/mt5/connect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ server, login, password }) });
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

  async getMT5Quotes(uuid: string, symbols: string[]): Promise<any[]> {
    if (!symbols.length) return [];
    const qs = symbols.map((s) => `symbols=${encodeURIComponent(s)}`).join('&');
    const res = await fetch(`${BASE_URL}/api/mt5/symbols?id=${encodeURIComponent(uuid)}&action=quotes&${qs}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to fetch quotes');
    return Array.isArray(data) ? data : [];
  }

  async sendMT5Trade(params: { id: string; action: 'open' | 'modify' | 'close'; symbol?: string; operation?: string; volume?: number; ticket?: number; lots?: number; comment?: string }): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/mt5/trade`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Trade failed');
    return data;
  }

  async startBatch(uuid: string, opts: { symbol: string; volume: number; count: number; intervalMinutes: number; comment?: string }): Promise<any> {
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
