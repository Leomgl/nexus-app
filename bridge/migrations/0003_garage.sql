-- NEXUS LINK: permit GARAGE source without resetting existing pair IDs or ciphertext.
-- Preserve all pairs/messages via a shadow copy, then rebuild FK and indexes.
CREATE TABLE connections_v3(
 id TEXT PRIMARY KEY,
 source_app TEXT NOT NULL CHECK(source_app IN ('gaming','rituel','vestiaire','garage')),
 writer_hash TEXT NOT NULL,
 reader_hash TEXT NOT NULL,
 scopes_json TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 revoked_at INTEGER,
 last_activity INTEGER
);
CREATE TABLE encrypted_events_v3(
 id TEXT PRIMARY KEY,
 connection_id TEXT NOT NULL REFERENCES connections_v3(id) ON DELETE CASCADE,
 source_key TEXT NOT NULL,
 revision INTEGER NOT NULL,
 scope TEXT NOT NULL,
 nonce TEXT NOT NULL,
 ciphertext TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 ack_at INTEGER,
 UNIQUE(connection_id,source_key,revision)
);
INSERT INTO connections_v3(id,source_app,writer_hash,reader_hash,scopes_json,created_at,revoked_at,last_activity)
 SELECT id,source_app,writer_hash,reader_hash,scopes_json,created_at,revoked_at,last_activity FROM connections;
INSERT INTO encrypted_events_v3(id,connection_id,source_key,revision,scope,nonce,ciphertext,created_at,ack_at)
 SELECT id,connection_id,source_key,revision,scope,nonce,ciphertext,created_at,ack_at FROM encrypted_events;
DROP TABLE encrypted_events;
DROP TABLE connections;
ALTER TABLE connections_v3 RENAME TO connections;
ALTER TABLE encrypted_events_v3 RENAME TO encrypted_events;
CREATE INDEX idx_connections_source ON connections(source_app,revoked_at);
CREATE INDEX idx_events_inbox ON encrypted_events(connection_id,ack_at,created_at);
-- After migration, verify counts and PRAGMA foreign_key_check before publishing new client.
