import { handleOptions, json } from "../_db.js";

// ponytail: keep SKUs in sync with modules/iap_stub.js
const CATALOG = [
  {
    sku: "monthly_card_cny",
    type: "subscription",
    title: "月卡",
    priceCny: 30,
    desc: "30 天每日领取未来币与道具",
  },
  {
    sku: "futurecoin_pack_s",
    type: "consumable",
    title: "未来币小礼包",
    priceCny: 6,
    futurecoin: 60,
  },
  {
    sku: "futurecoin_pack_m",
    type: "consumable",
    title: "未来币中礼包",
    priceCny: 30,
    futurecoin: 350,
  },
  {
    sku: "futurecoin_pack_l",
    type: "consumable",
    title: "未来币大礼包",
    priceCny: 98,
    futurecoin: 1200,
  },
];

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "GET") return json({ error: "method not allowed" }, { status: 405, req });
  return json(
    {
      ok: true,
      iap_enabled: false,
      items: CATALOG.map((item) => ({
        ...item,
        purchasable: false,
        reason: "provider_unconfigured",
      })),
    },
    { req }
  );
}
