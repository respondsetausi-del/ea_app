const API2TRADE_BASE = (process.env.API2TRADE_BASE_URL || 'https://mt5.mt4api.dev').replace(/\/$/, '');
const API2TRADE_KEY = process.env.API2TRADE_API_KEY || '';
const API2TRADE_USER = process.env.API2TRADE_USERNAME || '';
const API2TRADE_PASS = process.env.API2TRADE_PASSWORD || '';

const TIMEOUT_MS = 30000;

function getAuthHeaders(): Record<string, string> {
  if (API2TRADE_USER && API2TRADE_PASS) {
    const encoded = Buffer.from(`${API2TRADE_USER}:${API2TRADE_PASS}`).toString('base64');
    return { Authorization: `Basic ${encoded}` };
  }
  if (API2TRADE_KEY) {
    return { 'x-api-key': API2TRADE_KEY };
  }
  throw new Error('Api2Trade credentials not configured');
}

async function api2tradeGet<T = any>(path: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
  const url = new URL(`${API2TRADE_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { ...getAuthHeaders(), Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Api2Trade ${res.status}: ${body || res.statusText}`);
    }

    return await res.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Account Management ─────────────────────────────────────

export interface ConnectExResult {
  message?: string;
  user?: number;
  [key: string]: unknown;
}

export async function connectEx(
  id: string,
  server: string,
  user: string,
  password: string,
): Promise<ConnectExResult> {
  return api2tradeGet<ConnectExResult>('ConnectEx', { id, server, user, password });
}

export async function disconnect(id: string): Promise<{ message: string }> {
  return api2tradeGet('Disconnect', { id });
}

export async function checkConnect(id: string): Promise<any> {
  return api2tradeGet('CheckConnect', { id });
}

// ── Account Info ────────────────────────────────────────────

export interface AccountSummary {
  balance: number;
  credit: number;
  profit: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  leverage: number;
  currency: string;
}

export async function getAccountSummary(id: string): Promise<AccountSummary> {
  return api2tradeGet<AccountSummary>('AccountSummary', { id });
}

// ── Liveness + Reconnect ────────────────────────────────────
//
// Verify the session behind `id` is live and, if not, silently
// re-establish it under the SAME id from stored credentials.
//
// The probe IS the app's real source of truth: an authenticated
// AccountSummary that returns a real leverage means the broker still
// holds the live MT5 session behind this UUID. If the broker expired
// the session (idle timeout / infra restart), the probe fails and we
// re-authenticate under the same UUID so the client's persisted handle
// stays stable and nothing downstream has to be rewired.
export async function ensureConnected(
  id: string,
  server: string,
  user: string,
  password: string,
): Promise<{ reconnected: boolean }> {
  try {
    const summary = await getAccountSummary(id);
    if (summary?.leverage) return { reconnected: false };
  } catch {
    /* probe failed -> treat as dead, re-establish below */
  }

  // Re-auth under the same id. Tolerate ConnectEx throwing
  // (e.g. "already connected") — the summary re-check is the gate.
  await connectEx(id, server, user, password).catch(() => {});
  const summary = await getAccountSummary(id);
  if (!summary?.leverage) throw new Error('Reconnect failed');
  return { reconnected: true };
}

export interface AccountInfo {
  login: number;
  type: string;
  userName: string;
  country: string;
  balance: number;
  credit: number;
  leverage: number;
  email: string;
}

export async function getAccountInfo(id: string): Promise<AccountInfo> {
  return api2tradeGet<AccountInfo>('Account', { id });
}

// ── Orders ──────────────────────────────────────────────────

export interface Order {
  ticket: number;
  profit: number;
  swap: number;
  commission: number;
  openPrice: number;
  openTime: string;
  closePrice: number;
  closeTime: string;
  lots: number;
  orderType: string;
  symbol: string;
  comment: string;
  stopLoss: number;
  takeProfit: number;
}

export async function getOpenOrders(id: string): Promise<Order[]> {
  return api2tradeGet<Order[]>('OpenedOrders', { id });
}

export async function getClosedOrders(id: string): Promise<Order[]> {
  return api2tradeGet<Order[]>('ClosedOrders', { id });
}

export async function getOpenOrder(id: string, ticket: number): Promise<Order> {
  return api2tradeGet<Order>('OpenedOrder', { id, ticket });
}

// ── Trading ─────────────────────────────────────────────────

export type Operation = 'Buy' | 'Sell' | 'BuyLimit' | 'SellLimit' | 'BuyStop' | 'SellStop';

export interface TradeParams {
  id: string;
  symbol: string;
  operation: Operation;
  volume: number;
  price?: number;
  slippage?: number;
  stoploss?: number;
  takeprofit?: number;
  comment?: string;
}

export async function orderSend(params: TradeParams): Promise<Order> {
  return api2tradeGet<Order>('OrderSend', params as any);
}

export interface ModifyParams {
  id: string;
  ticket: number;
  stoploss: number;
  takeprofit: number;
  price?: number;
}

export async function orderModify(params: ModifyParams): Promise<Order> {
  return api2tradeGet<Order>('OrderModify', params as any);
}

export interface CloseParams {
  id: string;
  ticket: number;
  lots?: number;
  price?: number;
  slippage?: number;
}

export async function orderClose(params: CloseParams): Promise<Order> {
  return api2tradeGet<Order>('OrderClose', params as any);
}

// ── Market Data ─────────────────────────────────────────────

export interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  time: string;
  last: number;
  volume: number;
}

export async function getQuote(id: string, symbol: string): Promise<Quote> {
  return api2tradeGet<Quote>('GetQuote', { id, symbol });
}

export async function getQuoteMany(id: string, symbols: string[]): Promise<Quote[]> {
  const url = new URL(`${API2TRADE_BASE}/GetQuoteMany`);
  url.searchParams.set('id', id);
  for (const s of symbols) url.searchParams.append('symbols', s);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { ...getAuthHeaders(), Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Api2Trade ${res.status}`);
    return await res.json() as Quote[];
  } finally {
    clearTimeout(timeout);
  }
}

export async function getSymbolList(id: string): Promise<string[]> {
  return api2tradeGet<string[]>('SymbolList', { id });
}

// ── Symbol contract specs ───────────────────────────────────
//
// Needed before every order: brokers reject volumes below their minimum with
// INVALID_VOLUME, and OrderSend still answers HTTP 200 when they do — so an
// under-minimum lot looks like a placed trade and silently isn't one. Indexes
// are the usual victim (0.01 lot on .US30.mic is below min).

export interface SymbolParams {
  volumeMin?: number;
  volumeStep?: number;
  volumeMax?: number;
  digits?: number;
  [key: string]: unknown;
}

export async function getSymbolParams(id: string, symbol: string): Promise<SymbolParams> {
  return api2tradeGet<SymbolParams>('SymbolParams', { id, symbol });
}

/** The minimum-volume field is named differently across broker configs. */
const MIN_KEYS = ['volumeMin', 'minVolume', 'lotMin', 'minLot', 'tradeVolumeMin'];
const STEP_KEYS = ['volumeStep', 'lotStep', 'tradeVolumeStep'];
const MAX_KEYS = ['volumeMax', 'maxVolume', 'lotMax', 'maxLot', 'tradeVolumeMax'];

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = Number(obj?.[k]);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return null;
}

/** Specs change rarely; one lookup per symbol per 10 min keeps orders fast. */
const paramCache = new Map<string, { at: number; params: SymbolParams }>();
const PARAM_TTL_MS = 10 * 60 * 1000;

async function cachedParams(id: string, symbol: string): Promise<SymbolParams | null> {
  const key = id + ' ' + symbol;
  const hit = paramCache.get(key);
  if (hit && Date.now() - hit.at < PARAM_TTL_MS) return hit.params;
  try {
    const params = await getSymbolParams(id, symbol);
    paramCache.set(key, { at: Date.now(), params });
    return params;
  } catch {
    // A failed spec lookup must not block the trade — send the requested
    // volume and let the broker be the judge.
    return null;
  }
}

/**
 * Clamp a requested lot to what the broker will actually accept: at least the
 * minimum, at most the maximum, and on the volume step.
 *
 * Also absorbs the locale-comma bug — `parseFloat('0,10')` is `0`, which fell
 * through to a below-minimum lot and a silent no-trade.
 */
export async function normalizeVolume(id: string, symbol: string, volume: number | string): Promise<number> {
  const requested = parseFloat(String(volume).replace(',', '.'));
  const params = await cachedParams(id, symbol);

  const min = params ? pickNumber(params, MIN_KEYS) : null;
  const step = params ? pickNumber(params, STEP_KEYS) : null;
  const max = params ? pickNumber(params, MAX_KEYS) : null;

  let v = Number.isFinite(requested) && requested > 0 ? requested : (min ?? 0.01);
  if (min !== null && v < min) v = min;
  if (max !== null && v > max) v = max;
  if (step !== null && step > 0) {
    // Round to the step, then floor back under max if rounding pushed past it.
    const steps = Math.round(v / step);
    v = steps * step;
    if (min !== null && v < min) v = min;
    if (max !== null && v > max) v = Math.floor(max / step) * step;
  }

  // Broker lot sizes are 2dp in practice; float steps leave 0.30000000000000004.
  return Math.round(v * 1e8) / 1e8;
}

// ── Price history ───────────────────────────────────────────

export async function getPriceHistory(
  id: string,
  symbol: string,
  timeframe: string,
  from?: string,
  to?: string,
): Promise<any> {
  return api2tradeGet('PriceHistory', { id, symbol, timeframe, from: from ?? '', to: to ?? '' });
}

// ── Broker directory ────────────────────────────────────────

/** Server-name lookup for the connect form. Not account-scoped — no id. */
export async function searchBrokers(company: string): Promise<any[]> {
  const result = await api2tradeGet<any>('Search', { company });
  return Array.isArray(result) ? result : [];
}

export async function getMarketWatch(id: string, symbols: string[]): Promise<any[]> {
  const url = new URL(`${API2TRADE_BASE}/MarketWatchMany`);
  url.searchParams.set('id', id);
  for (const s of symbols) url.searchParams.append('symbols', s);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { ...getAuthHeaders(), Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Api2Trade ${res.status}`);
    return await res.json() as any[];
  } finally {
    clearTimeout(timeout);
  }
}
