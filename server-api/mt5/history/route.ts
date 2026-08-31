import { getPriceHistory } from '@/services/api2trade';

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const symbol = url.searchParams.get('symbol');
    if (!id || !symbol) {
      return Response.json({ error: 'Account UUID and symbol required' }, { status: 400 });
    }

    // M1 matches the RSI(14) cadence the auto-trader runs on.
    const timeframe = url.searchParams.get('timeframe') || 'M1';
    const from = url.searchParams.get('from') || undefined;
    const to = url.searchParams.get('to') || undefined;

    return Response.json(await getPriceHistory(id, symbol, timeframe, from, to));
  } catch (error) {
    console.error('MT5 history error:', error);
    return Response.json({ error: 'Failed to fetch price history' }, { status: 502 });
  }
}
