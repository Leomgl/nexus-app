-- V0.3: opaque encrypted cloud backup with one-time invitation.
CREATE TABLE IF NOT EXISTS vault_invitations (
 hash TEXT PRIMARY KEY,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 consumed_at TEXT
);
CREATE TABLE IF NOT EXISTS vaults (
 id TEXT PRIMARY KEY,
 verifier TEXT NOT NULL UNIQUE,
 invitation_hash TEXT NOT NULL UNIQUE REFERENCES vault_invitations(hash),
 payload TEXT,
 version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vaults_verifier ON vaults(verifier);
INSERT OR IGNORE INTO schema_migrations(version) VALUES(2);
