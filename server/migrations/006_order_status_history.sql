CREATE TABLE IF NOT EXISTS order_status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  actor_id BIGINT REFERENCES users(id),
  from_status VARCHAR(24),
  to_status VARCHAR(24) NOT NULL CHECK (to_status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
  note VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_status_history_order_idx
  ON order_status_history(order_id, created_at DESC);

INSERT INTO order_status_history(order_id, actor_id, from_status, to_status, note, created_at)
SELECT o.id, NULL, NULL, o.order_status, 'Existing order status recorded during migration', o.created_at
FROM orders o
WHERE NOT EXISTS (
  SELECT 1 FROM order_status_history h WHERE h.order_id = o.id
);
