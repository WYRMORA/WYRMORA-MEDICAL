CREATE TABLE IF NOT EXISTS account_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose VARCHAR(32) NOT NULL CHECK (purpose IN ('email_verification','password_reset')),
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS account_tokens_user_purpose_idx
  ON account_tokens(user_id, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS account_tokens_expiry_idx
  ON account_tokens(expires_at) WHERE consumed_at IS NULL;
