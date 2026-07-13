import { handleOptions, json, getDb } from "../_db.js";
import { grantIapOrder, IAP_ORDER_STATUS } from "../_iap.js";

/** Internal fulfillment: pending ledger row → fulfilled grant payload (no fake payment). */
export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const secret = context.env?.IAP_WEBHOOK_SECRET;
  if (!secret) {
    return json({ ok: false, error: "provider_unconfigured" }, { status: 501, req });
  }

  const adminSig = req.headers.get("X-IAP-Grant-Signature") || req.headers.get("x-iap-grant-signature");
  if (adminSig !== `grant:${secret}`) {
    return json({ ok: false, error: "unauthorized" }, { status: 401, req });
  }

  let body = null;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, { status: 400, req });
  }

  const orderId = typeof body?.order_id === "string" ? body.order_id.trim() : "";
  if (!orderId) return json({ ok: false, error: "missing_order_id" }, { status: 400, req });

  try {
    const db = getDb(context.env);
    const result = await grantIapOrder(db, orderId);
    if (!result.ok) {
      const status = result.reason === "not_found" ? 404 : result.reason === "already_fulfilled" ? 409 : 400;
      return json({ ok: false, error: result.reason }, { status, req });
    }
    return json(
      {
        ok: true,
        order_id: orderId,
        status: IAP_ORDER_STATUS.fulfilled,
        grant: result.grant,
        note: "ledger_fulfilled_client_delivery_still_required",
      },
      { req }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "db_error";
    return json({ ok: false, error: msg }, { status: 500, req });
  }
}
