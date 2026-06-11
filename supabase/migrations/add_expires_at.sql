ALTER TABLE document_assets
ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '3 days');

CREATE INDEX IF NOT EXISTS document_assets_expires_at_idx
ON document_assets(expires_at)
WHERE expires_at IS NOT NULL;

UPDATE document_assets
SET expires_at = created_at + interval '3 days'
WHERE expires_at IS NULL;