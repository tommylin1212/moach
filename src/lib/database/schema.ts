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

// Conversations table for storing conversation metadata
export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  lastMessageAt: text("last_message_at").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("conversations_user_id_idx").on(table.userId),
  index("conversations_last_message_idx").on(table.lastMessageAt),
]);

// Messages table for storing individual messages in conversations
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(), // Use UIMessage.id directly
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  parts: text("parts", { mode: "json" }).notNull(), // Full UIMessage.parts array as JSON
  metadata: text("metadata", { mode: "json" }), // UIMessage.metadata if present
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  messageIndex: integer("message_index").notNull(), // Order within conversation
}, (table) => [
  index("messages_conversation_idx").on(table.conversationId),
  index("messages_user_idx").on(table.userId),
  index("messages_order_idx").on(table.conversationId, table.messageIndex),
]);

// Type exports for use in functions
export type Memory = typeof memory.$inferSelect;
export type NewMemory = typeof memory.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
