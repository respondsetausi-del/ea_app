import { getStatus } from '@/server-api/mt5/strategy/engine';

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
    return Response.json(getStatus(id));
  } catch (error: any) {
    console.error('MT5 strategy/status error:', error);
    return Response.json({ error: error?.message || 'Failed to get status' }, { status: 502 });
  }
}
