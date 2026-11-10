-- NEXUS: schéma de référence V1 déjà appliqué à D1. Authentification et synchro NON activées.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('note','event','task','person','project','purchase','transaction')),
  title TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_items_user_kind ON items(user_id, kind, deleted_at, updated_at);
CREATE TABLE IF NOT EXISTS note_contents (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS event_details (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  location TEXT,
  details TEXT
);
CREATE TABLE IF NOT EXISTS task_details (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  due_at TEXT,
  done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0,1)),
  completed_at TEXT
);
CREATE TABLE IF NOT EXISTS person_details (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  role TEXT,
  phone TEXT,
  email TEXT
);
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  target_item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK(relation_type IN ('derived_from','with_person','related_to','prepares_for','mentions','belongs_to','financed_by','purchased_for')),
  created_at TEXT NOT NULL,
  CHECK(source_item_id <> target_item_id),
  UNIQUE(user_id,source_item_id,target_item_id,relation_type)
);
CREATE INDEX IF NOT EXISTS idx_links_source ON links(user_id, source_item_id);
CREATE INDEX IF NOT EXISTS idx_links_target ON links(user_id, target_item_id);
-- Les appartenances des deux éléments liés au user_id doivent être validées côté Worker.


-- Extension V0.2, tables appliquées sur D1 vide
CREATE TABLE IF NOT EXISTS project_details (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','completed')),
  deadline TEXT,
  budget_cents INTEGER CHECK(budget_cents >= 0)
);
CREATE TABLE IF NOT EXISTS purchase_details (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  estimated_cents INTEGER CHECK(estimated_cents >= 0),
  shop TEXT,
  priority INTEGER NOT NULL DEFAULT 1 CHECK(priority IN (1,2,3)),
  status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','purchased','canceled')),
  purchased_at TEXT
);
CREATE TABLE IF NOT EXISTS transaction_details (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('income','expense')),
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
  occurred_on TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Autres'
);
CREATE INDEX IF NOT EXISTS idx_transactions_day ON transaction_details(occurred_on,kind);
CREATE TABLE IF NOT EXISTS budget_limits (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL CHECK(length(month)=7),
  limit_cents INTEGER NOT NULL CHECK(limit_cents > 0),
  PRIMARY KEY(user_id,month)
);
-- Le Worker doit vérifier que les objets reliés appartiennent toujours au même user_id.
-- Ne pas accepter une valeur user_id fournie par le client comme preuve d'autorisation.
