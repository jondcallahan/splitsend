#!/usr/bin/env bun
/**
 * Standalone migration script for production builds.
 * Run this after `react-router build` to apply migrations before deployment.
 *
 * Usage:
 *   bun run migrate          # Apply migrations to current database
 *   bun scripts/migrate.ts   # Direct execution
 */

import { createDb, runMigrations } from "../app/db.server";

console.log("Running database migrations...");

const db = createDb();

try {
  runMigrations(db);
  console.log("Migrations completed successfully");
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
} finally {
  db.close();
}
