'use server';
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// Create LibSQL client
const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!databaseUrl) {
  throw new Error('TURSO_DATABASE_URL environment variable is required');
}

const client = createClient({
  url: databaseUrl,
  authToken: authToken,
});

// Create Drizzle database instance with schema
const db = drizzle(client, { schema });

export async function getTursoClient() {
  return client;
}

export async function getDrizzleClient() {
  return db;
}