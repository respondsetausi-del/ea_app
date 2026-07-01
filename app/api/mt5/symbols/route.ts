import { getSymbolList, getQuote, getQuoteMany, getMarketWatch } from '@/services/api2trade';

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return Response.json({ error: 'Account UUID required' }, { status: 400 });

    const action = url.searchParams.get('action') || 'list';

    if (action === 'list') {
      const symbols = await getSymbolList(id);
      return Response.json(symbols);
    }

    if (action === 'quote') {
      const symbol = url.searchParams.get('symbol');
      if (!symbol) return Response.json({ error: 'Symbol required' }, { status: 400 });
      const quote = await getQuote(id, symbol);
      return Response.json(quote);
    }

    if (action === 'quotes') {
      const symbols = url.searchParams.getAll('symbols');
      if (!symbols.length) return Response.json({ error: 'Symbols required' }, { status: 400 });
      const quotes = await getQuoteMany(id, symbols);
      return Response.json(quotes);
    }

    if (action === 'watch') {
      const symbols = url.searchParams.getAll('symbols');
      if (!symbols.length) return Response.json({ error: 'Symbols required' }, { status: 400 });
      const watch = await getMarketWatch(id, symbols);
      return Response.json(watch);
    }

    return Response.json({ error: 'Invalid action. Use: list, quote, quotes, watch' }, { status: 400 });
  } catch (error) {
    console.error('MT5 symbols error:', error);
    return Response.json({ error: 'Failed to fetch symbol data' }, { status: 502 });
  }
}
