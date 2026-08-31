import { startBatch } from '@/server-api/mt5/batch/engine';

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

    const result = startBatch({
      id,
      symbols,
      volume,
      count,
      intervalMs: intervalMinutes * 60_000,
      comment,
      strategy: body?.strategy === 'flip' ? 'flip' : 'ma-cross',
      timeframe: (body?.timeframe as string) || 'M15',
      fastPeriod: Number(body?.fastPeriod) || 20,
      slowPeriod: Number(body?.slowPeriod) || 50,
      minSeparationPct: body?.minSeparationPct !== undefined ? Number(body.minSeparationPct) : undefined,
      perSymbol: (body?.perSymbol && typeof body.perSymbol === 'object') ? body.perSymbol : {},
    });

    if (!result.ok) return Response.json(result, { status: 400 });
    return Response.json(result);
  } catch (error: any) {
    console.error('MT5 batch/start error:', error);
    return Response.json({ error: error?.message || 'Failed to start' }, { status: 502 });
  }
}
