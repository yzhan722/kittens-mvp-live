import { handleOptions, json, getDb } from "../_db.js";
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  recordIapOrder,
  IAP_ORDER_STATUS,
} from "../_iap.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const secret = context.env?.IAP_WEBHOOK_SECRET;
  if (!secret) {
    return json({ ok: false, error: "provider_unconfigured" }, { status: 501, req });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("X-IAP-Signature") || req.headers.get("x-iap-signature");
  const verified = verifyWebhookSignature(secret, rawBody, signature);
  if (!verified.ok) {
    const status = verified.reason === "provider_unconfigured" ? 501 : 401;
    return json({ ok: false, error: verified.reason }, { status, req });
  }

  let body = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: "invalid_json" }, { status: 400, req });
  }

  const payload = parseWebhookPayload(body);
  if (!payload) return json({ ok: false, error: "invalid_payload" }, { status: 400, req });

  try {
    const db = getDb(context.env);
    const recorded = await recordIapOrder(db, {
      orderId: payload.orderId,
      uid: payload.uid,
      sku: payload.sku,
      amountCny: payload.amountCny,
      provider: "stub",
    });
    // ponytail: fulfillment (grant SKU) runs here after provider confirms payment
    return json(
      {
        ok: true,
        recorded: true,
        order_id: recorded.orderId,
        status: IAP_ORDER_STATUS.pending,
        fulfill: false,
        reason: "fulfillment_not_wired",
      },
      { req }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "db_error";
    return json({ ok: false, error: msg }, { status: 500, req });
  }
}
