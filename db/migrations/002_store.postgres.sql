-- Ledger, workspaces, memberships, admin indexes (replaces DynamoDB single-table items).
CREATE TABLE IF NOT EXISTS store_items (
  pk TEXT NOT NULL,
  sk TEXT NOT NULL,
  data JSONB NOT NULL,
  gsi1pk TEXT,
  gsi1sk TEXT,
  gsi2pk TEXT,
  gsi2sk TEXT,
  PRIMARY KEY (pk, sk)
);

CREATE INDEX IF NOT EXISTS store_items_gsi1_idx ON store_items (gsi1pk, gsi1sk) WHERE gsi1pk IS NOT NULL;
CREATE INDEX IF NOT EXISTS store_items_gsi2_idx ON store_items (gsi2pk, gsi2sk) WHERE gsi2pk IS NOT NULL;
