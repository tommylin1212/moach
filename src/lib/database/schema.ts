import { integer, text, sqliteTable, index, unique } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/sqlite-core";

// Custom type for F32_BLOB vector embeddings
const float32Array = customType<{
  data: number[];
  config: { dimensions: number };
  configRequired: true;
  driverData: string;
}>({
  dataType(config) {
    return `F32_BLOB(${config.dimensions})`;
  },
  fromDriver(value: string) {
    // LibSQL stores vectors as JSON strings
    return JSON.parse(value);
  },
  toDriver(value: number[]) {
    // LibSQL expects JSON string for F32_BLOB
    return JSON.stringify(value);
  },
});

// Memory table for storing user memories with vector embeddings
export const memory = sqliteTable("memory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull(),
  value: text("value").notNull(),
  tags: text("tags").notNull(), // JSON string of tags array
  userId: text("user_id").notNull(),
  embedding: float32Array("embedding", { dimensions: 1536 }).notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  // Unique constraint on key + user_id combination
  unique("unique_key_user").on(table.key, table.userId),
  // Vector index for similarity search
  index("memory_embedding_idx").on(sql`libsql_vector_idx(${table.embedding})`),
]);

// Messages table for storing conversation history
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  message: text("message").notNull(),
  userId: text("user_id").notNull(),
  conversationId: text("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content", { mode: "json" }).notNull(), // JSON mode for automatic parsing
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Type exports for use in functions
export type Memory = typeof memory.$inferSelect;
export type NewMemory = typeof memory.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
