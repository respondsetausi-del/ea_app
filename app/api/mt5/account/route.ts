import { getAccountSummary, getAccountInfo } from '@/services/api2trade';

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return Response.json({ error: 'Account UUID required' }, { status: 400 });

    const detail = url.searchParams.get('detail');

    if (detail === 'full') {
      const [summary, info] = await Promise.all([
        getAccountSummary(id),
        getAccountInfo(id),
      ]);
      return Response.json({ summary, info });
    }

    const summary = await getAccountSummary(id);
    return Response.json(summary);
  } catch (error) {
    console.error('MT5 account error:', error);
    return Response.json({ error: 'Failed to fetch account info' }, { status: 502 });
  }
}
