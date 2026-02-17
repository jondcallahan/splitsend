import { Database } from "bun:sqlite";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DB_PATH = join(import.meta.dirname, "..", "data", "splitsend.db");

// Ensure data directory exists
mkdirSync(join(import.meta.dirname, "..", "data"), { recursive: true });

const db = new Database(DB_PATH, { create: true });

// Enable WAL mode for better concurrent read performance
db.exec("PRAGMA journal_mode=WAL");
db.exec("PRAGMA foreign_keys=ON");

// Create migrations table
db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Run pending migrations
function runMigrations() {
  const migrationsDir = join(import.meta.dirname, "migrations");
  let files: string[];

  try {
    files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .toSorted();
  } catch {
    console.warn("No migrations directory found, skipping migrations");
    return;
  }

  const applied = new Set(
    db
      .query("SELECT name FROM _migrations")
      .all()
      .map((row: any) => row.name)
  );

  for (const file of files) {
    if (applied.has(file)) {continue;}

    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`Running migration: ${file}`);

    db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
    })();
  }
}

runMigrations();

export { db };
