import { stopBatch } from '@/server-api/mt5/batch/engine';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({} as any));
    const id = body?.id as string;
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
    const result = await stopBatch(id, true);
    return Response.json(result);
  } catch (error: any) {
    console.error('MT5 batch/stop error:', error);
    return Response.json({ error: error?.message || 'Failed to stop' }, { status: 502 });
  }
}
