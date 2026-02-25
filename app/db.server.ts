import { mkdir, readdir } from "node:fs/promises";

import { createClient } from "@libsql/client";
import type { Client } from "@libsql/client";

const isRemote = !!(
  process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
);
const inMemory =
  process.env.PLAYWRIGHT_TEST === "1" || process.env.NODE_ENV === "test";

/**
 * Factory function to create a database client.
 * Supports three modes:
 * 1. Playwright tests → in-memory DB
 * 2. Production/Preview (Vercel) → Turso (when env vars present)
 * 3. Local dev → persistent file
 */
export function createDb(): Client {
  // Playwright tests → fresh in-memory DB every time
  if (inMemory) {
    return createClient({ url: ":memory:" });
  }

  // Production / Preview (Vercel) → Turso
  if (isRemote) {
    return createClient({
      authToken: process.env.TURSO_AUTH_TOKEN!,
      url: process.env.TURSO_DATABASE_URL!,
    });
  }

  // Local dev → persistent file
  const dataDir = `${import.meta.dirname}/../data`;
  const DB_PATH = process.env.DATABASE_PATH ?? `${dataDir}/splitsend.db`;

  return createClient({ url: `file:${DB_PATH}` });
}

// Create singleton instance for normal use
const db = createDb();

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
 */
export async function ensureDbReady(): Promise<void> {
  await _initPromise;
}

/**
 * Run pending migrations from the migrations directory.
 * Safe to call multiple times — only applies new migrations.
 */
export async function runMigrations(dbInstance: Client = db): Promise<void> {
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

    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    await dbInstance.batch(
      [
        ...statements.map((s) => ({ args: [] as any[], sql: s })),
        {
          args: [file],
          sql: "INSERT INTO _migrations (name) VALUES (?)",
        },
      ],
      "write"
    );
  }
}

export { db };
