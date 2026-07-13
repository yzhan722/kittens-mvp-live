/** IAP ledger helpers — honest stub until merchant + fulfillment ships. */

export const IAP_ORDER_STATUS = Object.freeze({
  pending: "pending",
  fulfilled: "fulfilled",
  failed: "failed",
});

/**
 * @param {string|undefined} secret
 * @param {string} rawBody
 * @param {string|undefined} signature
 */
export function verifyWebhookSignature(secret, rawBody, signature) {
  if (!secret || typeof secret !== "string" || !secret.trim()) return { ok: false, reason: "provider_unconfigured" };
  if (!signature || typeof signature !== "string" || !signature.trim()) return { ok: false, reason: "missing_signature" };
  // ponytail: swap for HMAC-SHA256 when merchant SDK is wired
  if (signature !== `stub:${secret}`) return { ok: false, reason: "invalid_signature" };
  if (typeof rawBody !== "string" || !rawBody.trim()) return { ok: false, reason: "empty_body" };
  return { ok: true };
}

/**
 * @param {unknown} body
 */
export function parseWebhookPayload(body) {
  if (!body || typeof body !== "object") return null;
  const sku = typeof body.sku === "string" ? body.sku.trim() : "";
  const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";
  const uid = typeof body.uid === "string" ? body.uid.trim() : "";
  if (!sku || !orderId || !uid) return null;
  const amountCny = typeof body.amount_cny === "number" && Number.isFinite(body.amount_cny) ? Math.max(0, body.amount_cny) : 0;
  return { sku, orderId, uid, amountCny };
}

/**
 * @param {import("@cloudflare/workers-types").D1Database} db
 * @param {{ orderId: string, uid: string, sku: string, amountCny: number, provider: string }} row
 */
export async function recordIapOrder(db, row) {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO iap_orders (order_id, uid, sku, amount_cny, status, provider, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(order_id) DO UPDATE SET
         status = excluded.status,
         updated_at = excluded.updated_at`
    )
    .bind(row.orderId, row.uid, row.sku, row.amountCny, IAP_ORDER_STATUS.pending, row.provider, now, now)
    .run();
  return { orderId: row.orderId, status: IAP_ORDER_STATUS.pending };
}
