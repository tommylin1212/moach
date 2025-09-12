import { createClient } from "@libsql/client";

export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,

});

const scripts = {
  createMemoryTable: `
    CREATE TABLE memory IF NOT EXISTS (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  tags TEXT NOT NULL,
  user_id TEXT NOT NULL,
  embedding F32_BLOB (1536) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(key, user_id)
);
  `,
  createMemoryIndex : `
    CREATE INDEX IF NOT EXISTS memory_embedding_idx 
        ON memory (libsql_vector_idx(embedding));
  `,

  createMessagesTable : `
    CREATE TABLE messages IF NOT EXISTS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      user_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
}