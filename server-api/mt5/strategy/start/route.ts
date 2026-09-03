import { startStrategy } from '@/server-api/mt5/strategy/engine';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({} as any));
    const id = body?.id as string;

    // `symbols` is the current shape; `symbol` is still accepted so an older
    // client build doesn't break against a newer server.
    const symbols: string[] = Array.isArray(body?.symbols)
      ? body.symbols.map((s: unknown) => String(s).trim()).filter(Boolean)
      : (body?.symbol ? [String(body.symbol).trim()] : []);

    const volume = Number(body?.volume);
    const count = Number(body?.count) || 1;
    const intervalMinutes = Number(body?.intervalMinutes) || 10;
    const comment = (body?.comment as string) || '';

    if (!id || symbols.length === 0 || !volume) {
      return Response.json({ error: 'id, symbols and volume are required' }, { status: 400 });
    }

    const result = startStrategy({
      id,
      symbols,
      volume,
      count,
      intervalMs: intervalMinutes * 60_000,
      comment,
      timeframe: (body?.timeframe as string) || 'M15',
      fastPeriod: Number(body?.fastPeriod) || 20,
      slowPeriod: Number(body?.slowPeriod) || 50,
      minSeparationPct: body?.minSeparationPct !== undefined ? Number(body.minSeparationPct) : undefined,
      perSymbol: (body?.perSymbol && typeof body.perSymbol === 'object') ? body.perSymbol : {},
      // Risk sizing. Omitted values fall back to the engine's defaults rather
      // than to zero, which would mean "no stop".
      atrPeriod: body?.atrPeriod !== undefined ? Number(body.atrPeriod) : undefined,
      slAtrMult: body?.slAtrMult !== undefined ? Number(body.slAtrMult) : undefined,
      tpAtrMult: body?.tpAtrMult !== undefined ? Number(body.tpAtrMult) : undefined,
    });

    if (!result.ok) return Response.json(result, { status: 400 });
    return Response.json(result);
  } catch (error: any) {
    console.error('MT5 strategy/start error:', error);
    return Response.json({ error: error?.message || 'Failed to start' }, { status: 502 });
  }
}
