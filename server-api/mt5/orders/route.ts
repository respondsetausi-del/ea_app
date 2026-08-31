import { getOpenOrders, getClosedOrders } from '@/services/api2trade';

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return Response.json({ error: 'Account UUID required' }, { status: 400 });

    const type = (url.searchParams.get('type') || 'open').toLowerCase();

    if (type === 'open') return Response.json(await getOpenOrders(id));
    if (type === 'closed') return Response.json(await getClosedOrders(id));
    if (type === 'all') {
      const [open, closed] = await Promise.all([getOpenOrders(id), getClosedOrders(id)]);
      return Response.json({ open, closed });
    }

    return Response.json({ error: 'Invalid type. Use: open, closed, all' }, { status: 400 });
  } catch (error) {
    console.error('MT5 orders error:', error);
    return Response.json({ error: 'Failed to fetch orders' }, { status: 502 });
  }
}
