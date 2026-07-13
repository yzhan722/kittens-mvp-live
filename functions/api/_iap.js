/** IAP ledger helpers — honest stub until merchant + fulfillment ships. */

export const IAP_ORDER_STATUS = Object.freeze({
  pending: "pending",
  fulfilled: "fulfilled",
  failed: "failed",
});

/** SKU → grant payload (sync with catalog / iap_stub). */
export const IAP_SKU_GRANTS = Object.freeze({
  monthly_card_cny: { type: "subscription", monthlyCardDays: 30 },
  futurecoin_pack_s: { type: "consumable", futurecoin: 60 },
  futurecoin_pack_m: { type: "consumable", futurecoin: 350 },
  futurecoin_pack_l: { type: "consumable", futurecoin: 1200 },
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

/**
 * Mark a pending order fulfilled and return grant payload.
 * ponytail: does not push to client save — operator/worker must deliver separately.
 * @param {import("@cloudflare/workers-types").D1Database} db
 * @param {string} orderId
 */
export async function grantIapOrder(db, orderId) {
  const id = typeof orderId === "string" ? orderId.trim() : "";
  if (!id) return { ok: false, reason: "missing_order_id" };

  const row = await db.prepare(`SELECT order_id, sku, status FROM iap_orders WHERE order_id = ?`).bind(id).first();
  if (!row) return { ok: false, reason: "not_found" };
  if (row.status === IAP_ORDER_STATUS.fulfilled) return { ok: false, reason: "already_fulfilled" };
  if (row.status === IAP_ORDER_STATUS.failed) return { ok: false, reason: "order_failed" };

  const grant = IAP_SKU_GRANTS[row.sku];
  if (!grant) return { ok: false, reason: "unknown_sku" };

  const now = Date.now();
  await db
    .prepare(`UPDATE iap_orders SET status = ?, updated_at = ? WHERE order_id = ?`)
    .bind(IAP_ORDER_STATUS.fulfilled, now, id)
    .run();

  return { ok: true, grant: { sku: row.sku, ...grant } };
}
