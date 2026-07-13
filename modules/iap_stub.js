/** Honest IAP stub — catalog only; no fake payment success until a real provider is wired. */

export const DONATE_QR_PATH = "./assets/donate_qr.jpg";

/** @type {readonly { sku: string, type: string, title: string, priceCny: number, futurecoin?: number, desc?: string }[]} */
export const IAP_CATALOG = Object.freeze([
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
]);

export function donateQrPath() {
  return DONATE_QR_PATH;
}

export function getCatalog() {
  return IAP_CATALOG.map((item) => ({
    ...item,
    purchasable: false,
    reason: "provider_unconfigured",
  }));
}

/**
 * @param {string} sku
 * @returns {{ ok: boolean, reason?: string, [key: string]: unknown }}
 */
export function purchase(sku) {
  const item = IAP_CATALOG.find((i) => i.sku === sku);
  if (!item) return { ok: false, reason: "unknown_sku" };
  const provider =
    typeof globalThis !== "undefined" && globalThis.window
      ? globalThis.window.KITTENS_IAP_PROVIDER
      : null;
  if (!provider || typeof provider.purchase !== "function") {
    return { ok: false, reason: "provider_unconfigured" };
  }
  return provider.purchase(sku);
}
