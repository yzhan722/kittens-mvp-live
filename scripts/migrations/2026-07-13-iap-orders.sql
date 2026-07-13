-- Additive migration: IAP order ledger (webhook records pending; fulfillment TBD)
CREATE TABLE IF NOT EXISTS iap_orders (
  order_id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  sku TEXT NOT NULL,
  amount_cny REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'stub',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_iap_orders_uid ON iap_orders(uid);
CREATE INDEX IF NOT EXISTS idx_iap_orders_status ON iap_orders(status);
