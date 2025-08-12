CREATE TABLE IF NOT EXISTS __drizzle_migrations
(
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    hash       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT current_timestamp
);

SELECT * FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations';