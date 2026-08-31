import { orderSend, orderModify, orderClose, normalizeVolume } from '@/services/api2trade';
import type { Operation } from '@/services/api2trade';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({}));
    const action = (body?.action as string)?.toLowerCase();

    if (action === 'open') {
      const id = body?.id as string;
      // Never uppercase: broker symbols are case-sensitive and suffixed
      // (`XAUUSD.mic`, `.US30.mic`). `XAUUSD.MIC` is rejected outright.
      const symbol = body?.symbol as string;
      const operation = body?.operation as Operation;
      const volume = Number(body?.volume);

      if (!id || !symbol || !operation || !volume) {
        return Response.json({ error: 'id, symbol, operation, and volume are required' }, { status: 400 });
      }

      // Clamp to the broker's min/step/max here rather than in each caller, so
      // the scanner, the batch loop and manual trades all get it.
      const safeVolume = await normalizeVolume(id, symbol, volume);

      const result = await orderSend({
        id,
        symbol,
        operation,
        volume: safeVolume,
        price: body?.price ? Number(body.price) : undefined,
        slippage: body?.slippage ? Number(body.slippage) : undefined,
        stoploss: body?.stoploss ? Number(body.stoploss) : undefined,
        takeprofit: body?.takeprofit ? Number(body.takeprofit) : undefined,
        comment: body?.comment,
      });

      // OrderSend answers 200 even when the broker rejects the order, so a
      // ticket is the only proof it was actually placed.
      if (!result || typeof result.ticket !== 'number' || result.ticket <= 0) {
        const reason = (result as any)?.error || (result as any)?.message || 'Broker rejected the order';
        console.error('MT5 order rejected:', symbol, safeVolume, reason);
        return Response.json({ error: reason, order: result, volume: safeVolume }, { status: 502 });
      }

      return Response.json(result);
    }

    if (action === 'modify') {
      const id = body?.id as string;
      const ticket = Number(body?.ticket);
      if (!id || !ticket) {
        return Response.json({ error: 'id and ticket are required' }, { status: 400 });
      }

      const result = await orderModify({
        id,
        ticket,
        stoploss: Number(body?.stoploss || 0),
        takeprofit: Number(body?.takeprofit || 0),
        price: body?.price ? Number(body.price) : undefined,
      });
      return Response.json(result);
    }

    if (action === 'close') {
      const id = body?.id as string;
      const ticket = Number(body?.ticket);
      if (!id || !ticket) {
        return Response.json({ error: 'id and ticket are required' }, { status: 400 });
      }

      const result = await orderClose({
        id,
        ticket,
        lots: body?.lots ? Number(body.lots) : undefined,
        price: body?.price ? Number(body.price) : undefined,
        slippage: body?.slippage ? Number(body.slippage) : undefined,
      });
      return Response.json(result);
    }

    return Response.json({ error: 'Invalid action. Use: open, modify, close' }, { status: 400 });
  } catch (error) {
    console.error('MT5 trade error:', error);
    const msg = error instanceof Error ? error.message : 'Trade failed';
    return Response.json({ error: msg }, { status: 502 });
  }
}
