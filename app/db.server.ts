import Database from "libsql";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Factory function to create a database connection.
 * Supports three modes:
 * 1. Playwright tests → in-memory DB
 * 2. Production/Preview (Vercel) → Turso (when env vars present)
 * 3. Local dev → persistent file
 */
export function createDb(): Database.Database {
  // Playwright tests → fresh in-memory DB every time
  if (process.env.PLAYWRIGHT_TEST === "1" || process.env.NODE_ENV === "test") {
    return new Database(":memory:");
  }

  // Production / Preview (Vercel) → Turso
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    return new Database(process.env.TURSO_DATABASE_URL, {
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  // Local dev → persistent file
  const DB_PATH =
    process.env.DATABASE_PATH ??
    join(import.meta.dirname, "..", "data", "splitsend.db");

  // Ensure data directory exists
  mkdirSync(join(import.meta.dirname, "..", "data"), { recursive: true });

  return new Database(DB_PATH);
}

// Create singleton instance for normal use
const db = createDb();

// WAL mode and foreign keys
const inMemory =
  process.env.PLAYWRIGHT_TEST === "1" || process.env.NODE_ENV === "test";

if (!inMemory) {
  db.exec("PRAGMA journal_mode=WAL");
}
db.exec("PRAGMA foreign_keys=ON");

// Create migrations table
db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

/**
 * Run pending migrations from the migrations directory.
 * Safe to call multiple times - only applies new migrations.
 */
export function runMigrations(dbInstance: Database.Database = db): void {
  // Ensure migrations table exists
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

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
    dbInstance
      .prepare("SELECT name FROM _migrations")
      .all()
      .map((row: any) => row.name)
  );

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`Running migration: ${file}`);

    dbInstance.transaction(() => {
      dbInstance.exec(sql);
      dbInstance
        .prepare("INSERT INTO _migrations (name) VALUES (?)")
        .run(file);
    })();
  }
}

// Run migrations on the default db instance
runMigrations();

export { db };
