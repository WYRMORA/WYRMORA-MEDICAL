CREATE TABLE IF NOT EXISTS private_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose VARCHAR(40) NOT NULL CHECK (purpose IN ('product_image','seller_credential','pharmacist_credential')),
  object_key TEXT NOT NULL UNIQUE,
  original_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','uploaded','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS private_assets_owner_idx ON private_assets(owner_user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS private_assets_review_idx ON private_assets(purpose,status,created_at);
