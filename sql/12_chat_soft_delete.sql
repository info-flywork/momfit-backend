-- Soft delete: silinen sohbetler ücretsiz oluşturma kotasında sayılmaya devam eder.

ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;
