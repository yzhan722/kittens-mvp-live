#!/usr/bin/env node
/**
 * IAP ledger drill — unit + live honest stub behaviour.
 * Real merchant still needs IAP_WEBHOOK_SECRET + provider; this proves the ledger path.
 */
import assert from "node:assert/strict";
import { verifyWebhookSignature, parseWebhookPayload, IAP_SKU_GRANTS } from "../functions/api/_iap.js";

{
  assert.equal(verifyWebhookSignature("", "{}", "stub:x").reason, "provider_unconfigured");
  assert.equal(verifyWebhookSignature("sec", "{}", "").reason, "missing_signature");
  assert.equal(verifyWebhookSignature("sec", "{}", "bad").reason, "invalid_signature");
  assert.ok(verifyWebhookSignature("sec", '{"a":1}', "stub:sec").ok);
}

{
  assert.equal(parseWebhookPayload(null), null);
  assert.equal(parseWebhookPayload({ sku: "x" }), null);
  const p = parseWebhookPayload({
    sku: "futurecoin_pack_s",
    order_id: "ord_1",
    uid: "u1",
    amount_cny: 6,
  });
  assert.equal(p.sku, "futurecoin_pack_s");
  assert.equal(p.orderId, "ord_1");
  assert.ok(IAP_SKU_GRANTS.futurecoin_pack_s.futurecoin === 60);
}

const base = String(process.argv[2] || "https://game.pokeauto.online").replace(/\/$/, "");

const catalog = await fetch(`${base}/api/iap/catalog`);
assert.equal(catalog.status, 200, "catalog status");
const cat = await catalog.json();
assert.ok(Array.isArray(cat.items) && cat.items.length >= 1, "catalog items");
assert.ok(cat.items.every((i) => i.purchasable === false || i.purchasable == null || i.title), "catalog readable");

const webhook = await fetch(`${base}/api/iap/webhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-IAP-Signature": "stub:test" },
  body: JSON.stringify({ sku: "futurecoin_pack_s", order_id: "drill_1", uid: "u", amount_cny: 6 }),
});
// Without secret configured: 501 provider_unconfigured (honest). With secret: 401 invalid sig is also OK for drill.
assert.ok([401, 501].includes(webhook.status), `webhook expected 401/501 got ${webhook.status}`);
const wh = await webhook.json().catch(() => ({}));
assert.ok(wh.ok === false, "webhook not ok without valid merchant");

const grant = await fetch(`${base}/api/iap/grant`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-IAP-Grant-Signature": "grant:test" },
  body: JSON.stringify({ order_id: "drill_1" }),
});
assert.ok([401, 501].includes(grant.status), `grant expected 401/501 got ${grant.status}`);

console.log("iap-ledger-selfcheck: OK (stub honest; merchant secret not required for this drill)");
