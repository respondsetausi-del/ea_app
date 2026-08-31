import { sessionStatus, ensureLive, isRegistered } from '@/server-api/mt5/session-keeper';

/**
 * Connection health for the sessions this server is keeping alive.
 *
 * `?id=UUID` forces a probe (and a revive if it's dead) and reports the
 * result — this is the honest answer to "is my account actually connected",
 * as opposed to whatever the client last cached.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      const live = await ensureLive(id);
      return Response.json({ uuid: id, live, managed: isRegistered(id) });
    }

    // Never returns credentials — only liveness metadata.
    return Response.json({ sessions: sessionStatus() });
  } catch (error) {
    console.error('MT5 session status error:', error);
    return Response.json({ error: 'Failed to read session status' }, { status: 502 });
  }
}
