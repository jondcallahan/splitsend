import { createClient, type Client } from "@libsql/client";
import { mkdir, readdir } from "node:fs/promises";

/**
 * Factory function to create a database client.
 * Supports three modes:
 * 1. Playwright tests → in-memory DB
 * 2. Production/Preview (Vercel) → Turso (when env vars present)
 * 3. Local dev → persistent file
 */
export function createDb(): Client {
  // Playwright tests → fresh in-memory DB every time
  if (process.env.PLAYWRIGHT_TEST === "1" || process.env.NODE_ENV === "test") {
    return createClient({ url: ":memory:" });
  }

  // Production / Preview (Vercel) → Turso
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    return createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  // Local dev → persistent file
  const dataDir = `${import.meta.dirname}/../data`;
  const DB_PATH = process.env.DATABASE_PATH ?? `${dataDir}/splitsend.db`;

  return createClient({ url: `file:${DB_PATH}` });
}

// Create singleton instance for normal use
const db = createDb();

// Detect connection type
const isRemote = !!(
  process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
);
const inMemory =
  process.env.PLAYWRIGHT_TEST === "1" || process.env.NODE_ENV === "test";

// Initialize database (WAL mode + foreign keys + migrations table)
const _initPromise = (async () => {
  // Ensure data directory exists for local dev
  if (!isRemote && !inMemory) {
    await mkdir(`${import.meta.dirname}/../data`, { recursive: true });
    await db.execute("PRAGMA journal_mode=WAL");
  }

  // Foreign keys work on both local and remote
  await db.execute("PRAGMA foreign_keys=ON");

  // Create migrations table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Auto-run migrations for in-memory test databases
  if (inMemory) {
    await runMigrations(db);
  }
})();

/**
 * Ensure the database is initialized before use.
 * Call this at the top of loaders/actions if needed.
 */
export async function ensureDbReady(): Promise<void> {
  await _initPromise;
}

/**
 * Run pending migrations from the migrations directory.
 * Safe to call multiple times — only applies new migrations.
 */
export async function runMigrations(
  dbInstance: Client = db
): Promise<void> {
  // Ensure migrations table exists
  await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const migrationsDir = `${import.meta.dirname}/migrations`;
  let files: string[];

  try {
    files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .toSorted();
  } catch {
    console.warn("No migrations directory found, skipping migrations");
    return;
  }

  const result = await dbInstance.execute("SELECT name FROM _migrations");
  const applied = new Set(result.rows.map((row) => row.name as string));

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = await Bun.file(`${migrationsDir}/${file}`).text();
    console.log(`Running migration: ${file}`);

    // Split migration file into individual statements and run as a batch
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    await dbInstance.batch(
      [
        ...statements.map((s) => ({ sql: s, args: [] as any[] })),
        {
          sql: "INSERT INTO _migrations (name) VALUES (?)",
          args: [file],
        },
      ],
      "write"
    );
  }
}

// Note: Migrations are NOT run automatically on app launch.
// For local dev, run `bun run migrate` when schema changes.
// For production (Vercel), add `bun run migrate` to your build command.

export { db };
