CREATE TABLE IF NOT EXISTS medicine_reports (
  id BIGSERIAL PRIMARY KEY,
  medicine_id TEXT NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  reporter_name VARCHAR(100),
  reporter_email VARCHAR(254),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 15 AND 2000),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','in_review','resolved')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS medicine_reports_status_created_idx
  ON medicine_reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS medicine_reports_medicine_idx
  ON medicine_reports(medicine_id);
