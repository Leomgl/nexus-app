CREATE TABLE IF NOT EXISTS connections (
 id TEXT PRIMARY KEY,
 source_app TEXT NOT NULL CHECK(source_app IN ('gaming','rituel')),
 writer_hash TEXT NOT NULL,
 reader_hash TEXT NOT NULL,
 scopes_json TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 revoked_at INTEGER,
 last_activity INTEGER
);
CREATE INDEX IF NOT EXISTS idx_connections_source ON connections(source_app,revoked_at);
CREATE TABLE IF NOT EXISTS encrypted_events (
 id TEXT PRIMARY KEY,
 connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
 source_key TEXT NOT NULL,
 revision INTEGER NOT NULL,
 scope TEXT NOT NULL,
 nonce TEXT NOT NULL,
 ciphertext TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 ack_at INTEGER,
 UNIQUE(connection_id,source_key,revision)
);
CREATE INDEX IF NOT EXISTS idx_events_inbox ON encrypted_events(connection_id,ack_at,created_at);
CREATE TABLE IF NOT EXISTS pairing_rate (
 day_key TEXT PRIMARY KEY,
 count INTEGER NOT NULL CHECK(count BETWEEN 1 AND 100),
 updated_at INTEGER NOT NULL
);