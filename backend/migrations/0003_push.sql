-- V0.4 Notifications: privacy-preserving scheduled Web Push.
-- No note text, event titles or contact names are stored here.
CREATE TABLE IF NOT EXISTS push_devices (
  device_id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_test INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_push_devices_vault ON push_devices(vault_id);
CREATE TABLE IF NOT EXISTS push_jobs (
  device_id TEXT NOT NULL REFERENCES push_devices(device_id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('event','task')),
  fire_at INTEGER NOT NULL,
  delivered_at INTEGER,
  PRIMARY KEY(device_id,job_id)
);
CREATE INDEX IF NOT EXISTS idx_push_jobs_due ON push_jobs(fire_at, delivered_at);
INSERT OR IGNORE INTO schema_migrations(version) VALUES (3);
