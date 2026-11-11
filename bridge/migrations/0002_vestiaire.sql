-- NEXUS LINK V0.21.2 — add Vestiaire without destroying existing pairs / ciphertext
-- D1 enforces foreign keys; rebuild parent and child together to preserve ON DELETE CASCADE rows.
-- Both old tables are untouched until BOTH new tables have been fully copied.
-- Tested locally in SQLite with 3 pairs / 40 events and 0 FK violations.
CREATE TABLE connections_v2(
 id TEXT PRIMARY KEY,
 source_app TEXT NOT NULL CHECK(source_app IN ('gaming','rituel','vestiaire')),
 writer_hash TEXT NOT NULL,
 reader_hash TEXT NOT NULL,
 scopes_json TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 revoked_at INTEGER,
 last_activity INTEGER
);
CREATE TABLE encrypted_events_v2(
 id TEXT PRIMARY KEY,
 connection_id TEXT NOT NULL REFERENCES connections_v2(id) ON DELETE CASCADE,
 source_key TEXT NOT NULL,
 revision INTEGER NOT NULL,
 scope TEXT NOT NULL,
 nonce TEXT NOT NULL,
 ciphertext TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 ack_at INTEGER,
 UNIQUE(connection_id,source_key,revision)
);
INSERT INTO connections_v2(id,source_app,writer_hash,reader_hash,scopes_json,created_at,revoked_at,last_activity)
 SELECT id,source_app,writer_hash,reader_hash,scopes_json,created_at,revoked_at,last_activity FROM connections;
INSERT INTO encrypted_events_v2(id,connection_id,source_key,revision,scope,nonce,ciphertext,created_at,ack_at)
 SELECT id,connection_id,source_key,revision,scope,nonce,ciphertext,created_at,ack_at FROM encrypted_events;
DROP TABLE encrypted_events;
DROP TABLE connections;
ALTER TABLE connections_v2 RENAME TO connections;
ALTER TABLE encrypted_events_v2 RENAME TO encrypted_events;
CREATE INDEX idx_connections_source ON connections(source_app,revoked_at);
CREATE INDEX idx_events_inbox ON encrypted_events(connection_id,ack_at,created_at);
-- Post-migration verification must confirm preflight counts 3 connections, 40 events,
-- and PRAGMA foreign_key_check returns zero rows.
