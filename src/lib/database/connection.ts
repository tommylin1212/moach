import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// Create LibSQL client
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Create Drizzle database instance with schema
export const db = drizzle(client, { schema });

// Export client for raw SQL operations when needed
export const turso = client;