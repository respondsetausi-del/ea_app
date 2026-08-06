import { connectEx, disconnect, getAccountSummary } from '@/services/api2trade';
import { registerSession, forgetSession } from '@/app/api/mt5/session-keeper';
import crypto from 'crypto';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({}));
    const server = (body?.server as string)?.trim();
    const login = (body?.login as string)?.toString().trim();
    const password = (body?.password as string)?.trim();
    // Optional, but it's what lets the server enforce access on a bot running
    // with the app closed. Older clients simply don't send it.
    const email = (body?.email as string)?.trim().toLowerCase() || undefined;

    if (!server || !login || !password) {
      return Response.json({ error: 'Server, login, and password are required' }, { status: 400 });
    }

    const uuid = crypto.randomUUID();
    await connectEx(uuid, server, login, password);

    const summary = await getAccountSummary(uuid);
    if (!summary.leverage) {
      await disconnect(uuid).catch(() => {});
      return Response.json({ error: 'Invalid credentials. Please check your login, password, and server.' }, { status: 401 });
    }

    // Hand the credentials to the session keeper so the server can revive this
    // session on its own — the batch engine trades with the app closed.
    registerSession(uuid, { server, login, password, email });

    return Response.json({ uuid, message: 'Account connected successfully' });
  } catch (error) {
    console.error('MT5 connect error:', error);
    const msg = error instanceof Error ? error.message : 'Connection failed';
    return Response.json({ error: msg }, { status: 502 });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return Response.json({ error: 'Account UUID required' }, { status: 400 });

    // Forget first: an explicit disconnect must not be undone by the heartbeat.
    forgetSession(id);
    const result = await disconnect(id);
    return Response.json(result);
  } catch (error) {
    console.error('MT5 disconnect error:', error);
    return Response.json({ error: 'Failed to disconnect account' }, { status: 502 });
  }
}
