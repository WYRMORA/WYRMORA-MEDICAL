CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider VARCHAR(30) NOT NULL CHECK (provider IN ('khalti')),
  purchase_order_id VARCHAR(80) NOT NULL UNIQUE,
  pidx VARCHAR(120) UNIQUE,
  provider_transaction_id VARCHAR(120),
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa >= 1000),
  status VARCHAR(24) NOT NULL DEFAULT 'initiating' CHECK (status IN ('initiating','pending','completed','failed','refunded','refund_requested')),
  payment_url TEXT,
  provider_status VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_one_open_per_order_idx
  ON payment_transactions(order_id) WHERE status IN ('initiating','pending','completed','refund_requested');
CREATE INDEX IF NOT EXISTS payment_user_idx ON payment_transactions(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS payment_events (
  id BIGSERIAL PRIMARY KEY,
  provider VARCHAR(30) NOT NULL,
  event_key VARCHAR(180) NOT NULL,
  payment_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider,event_key)
);
