-- Chat mesaj ekleri (görsel / belge)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT NULL;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(32) NULL;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255) NULL;
