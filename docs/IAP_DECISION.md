# IAP 决策 — v0.41.6

**决定：v0.42 之前不做真支付。** GitHub：[#7](https://github.com/yzhan722/kittens-mvp-live/issues/7)（v0.41.2 milestone，已关 / not planned）。

理由：

1. 公开图鉴榜真人个位数，开支付只会增加退款与客服，不会增加乐趣。
2. `modules/iap_stub.js` 与 `/api/iap/webhook` 在未配置 `IAP_WEBHOOK_SECRET` 时拒绝，不得伪造 `ok: true`。
3. 游戏内未来币月卡（`monthly_card.js`）是本地货币，不是法币 IAP。不要把两条通路混为一谈。

要改口必须同时具备：商户、验签密钥、履约 worker、退款/幂等，再开 `iap_enabled`。
