import { searchBrokers } from '@/services/api2trade';

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const company = (url.searchParams.get('company') || '').trim();
    if (!company) return Response.json({ error: 'company query required' }, { status: 400 });

    return Response.json(await searchBrokers(company));
  } catch (error) {
    console.error('MT5 broker search error:', error);
    return Response.json({ error: 'Failed to search brokers' }, { status: 502 });
  }
}
