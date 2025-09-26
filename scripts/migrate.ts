#!/usr/bin/env tsx

/**
 * Migration script to run Drizzle migrations
 * Usage: npx tsx scripts/migrate.ts
 */

import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function runMigration() {
  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error("TURSO_DATABASE_URL is required");
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const db = drizzle(client);

  console.log("Running migrations...");
  
  try {
    await migrate(db, {
      migrationsFolder: "./drizzle",
    });
    console.log("✅ Migrations completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

runMigration().catch(console.error);
