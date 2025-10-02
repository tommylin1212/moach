import { UIDataTypes, UIMessage, UIMessagePart, UITools } from "ai";
import { getDrizzleClient } from "./connection";
import { Message, messages } from "./schema";
import { eq, desc, and, asc, sql } from "drizzle-orm";
import { getUser } from "../auth/user";

export async function saveMessage(message: UIMessage,conversationId: string, messageIndex: number) {
    const userId = await getUser();
    const db = await getDrizzleClient();
    const now = new Date().toISOString();
    await db.insert(messages).values({
        id: message.id,
        conversationId: conversationId,
        userId,
        role: message.role,
        parts: JSON.stringify(message.parts),
        metadata: message.metadata ? JSON.stringify(message.metadata) : null,
        messageIndex: messageIndex,
        createdAt: now,
      }).onConflictDoUpdate({
        target: [messages.id],
        set: {
          parts: sql`excluded.parts`,
          metadata: sql`excluded.metadata`,
        }
      });
}
export async function saveMessages(messagesToSave: UIMessage[], conversationId: string) {
    const userId = await getUser();
    const db = await getDrizzleClient();
    const now = new Date().toISOString();
    await db.insert(messages).values(messagesToSave.map((message, index) => ({
        id: message.id,
        conversationId: conversationId,
        userId,
        role: message.role,
        parts: JSON.stringify(message.parts),
        metadata: message.metadata ? JSON.stringify(message.metadata) : null,
        messageIndex: index,
        createdAt: now,
      }))).onConflictDoUpdate({
        target: [messages.id],
        set: {
          parts: sql`excluded.parts`,
          metadata: sql`excluded.metadata`,
        }
      });
}

export async function getMessages(conversationId: string) {
    const db = await getDrizzleClient();
    return await db.select().from(messages).where(eq(messages.conversationId, conversationId));
}

export async function deleteMessages(conversationId: string) {
    const db = await getDrizzleClient();
    await db.delete(messages).where(eq(messages.conversationId, conversationId));
}

export async function updateMessage(message: Message) {
    const db = await getDrizzleClient();
    await db.update(messages).set(message).where(eq(messages.id, message.id));
}

export async function retrieveMessagesForConversation(conversationId: string): Promise<UIMessage[]> {
    const db = await getDrizzleClient();
    const messagesResult = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(asc(messages.messageIndex));
    return messagesResult.map((row: Message) => ({
        id: row.id,
        role: row.role,
        parts: JSON.parse(row.parts as unknown as string) as UIMessagePart<UIDataTypes, UITools>[],
        metadata: row.metadata ? JSON.parse(row.metadata as unknown as string) : undefined
    }));
}