'use server'
import { eq, desc, and, asc} from "drizzle-orm";
import { getDrizzleClient, getTursoClient } from "./connection";
import { conversations, messages, type Conversation, type Message } from "./schema";
import { getUser } from "../auth/user";
import type { UIDataTypes, UIMessage, UIMessagePart, UITools } from "ai";
import { saveMessages } from "./messages";
import { generateTitle } from "../ai/serverFunctions/generateTitle";


// Generate a simple conversation title from the first user message
async function generateConversationTitle(firstUserMessage: string): Promise<string> {
  const title = await generateTitle(firstUserMessage);
  return title || 'New Conversation';
}

async function generateTitleIfNotProvided(uiMessages: UIMessage[]): Promise<string> {
  const firstUserMessage = uiMessages.find(m => m.role === 'user');
  let finalTitle = 'New Conversation';
      if (firstUserMessage?.parts) {
        const textPart = firstUserMessage.parts.find(p => p.type === 'text');
        if (textPart && 'text' in textPart) {
          finalTitle = await generateConversationTitle(textPart.text);
        }
      }
      finalTitle = finalTitle;
      return finalTitle;
}


export async function doesConversationExist(conversationId: string): Promise<{ exists: boolean; error?: string }> {
  const db = await getDrizzleClient();
  const conversation = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  return { exists: conversation.length > 0 };
}


export async function createNewConversation(firstMessage: UIMessage, conversationId: string): Promise<{ conversationId: string; success: boolean; error?: string }> {
  const startTime = Date.now();
  try {
    const db = await getDrizzleClient();
    const userId = await getUser();
    // Generate title from first user message if not provided
    const finalTitle = await generateTitleIfNotProvided([firstMessage]);
    const now = new Date().toISOString();
    
    // Create the conversation
    await db.insert(conversations).values({
      id: conversationId,
      userId,
      title: finalTitle,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return { conversationId, success: true };
  } catch (error) {
    return {
      conversationId: '',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
  
}

export async function saveConversation(conversationId: string, messages: UIMessage[]): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now();
  try {
    if(!(await doesConversationExist(conversationId)).exists){
      await createNewConversation(messages[0], conversationId);
    }

    await saveMessages(messages, conversationId);

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Load a conversation by ID
export async function loadConversation(conversationId: string): Promise<{
  conversation?: Conversation;
  messages: UIMessage[];
  success: boolean;
  error?: string;
}> {
  try {
    const userId = await getUser();
    const db = await getDrizzleClient();

    // Get conversation metadata
    const conversationResult = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
    /* `SELECT * FROM conversations WHERE id = ? AND user_id = ?`,
    [conversationId, userId]
  ); */

    if (conversationResult.length === 0) {
      return { messages: [], success: false, error: 'Conversation not found' };
    }

    const conversation = conversationResult[0]

    // Get messages ordered by messageIndex
    const messagesResult = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(asc(messages.messageIndex));

    const uiMessages: UIMessage[] = messagesResult.map((row: Message) => ({
      id: row.id,
      role: row.role,
      parts: JSON.parse(row.parts as unknown as string) as UIMessagePart<UIDataTypes, UITools>[],
      metadata: row.metadata ? JSON.parse(row.metadata as unknown as string) : undefined,
    }));

    return {
      conversation,
      messages: uiMessages,
      success: true
    };
  } catch (error) {
    console.error('Error loading conversation:', error);
    return {
      messages: [],
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Get all conversations for a user
export async function getUserConversations(): Promise<{
  conversations: Conversation[];
  success: boolean;
  error?: string;
}> {
  try {
    const userId = await getUser();
    const db = await getDrizzleClient();
    const result = await db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.lastMessageAt));


    return { conversations: result, success: true };
  } catch (error) {
    console.error('Error getting user conversations:', error);
    return {
      conversations: [],
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Delete a conversation
export async function deleteConversation(conversationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const userId = await getUser();
    const turso = await getTursoClient();
    // Verify ownership
    const result = await turso.execute(
      `SELECT id FROM conversations WHERE id = ? AND user_id = ?`,
      [conversationId, userId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Conversation not found' };
    }

    // Delete conversation (cascade will delete messages)
    await turso.execute(
      `DELETE FROM conversations WHERE id = ? AND user_id = ?`,
      [conversationId, userId]
    );

    return { success: true };
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Update conversation title
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getUser();
    const turso = await getTursoClient();
    const result = await turso.execute(`
      UPDATE conversations 
      SET title = ?, updated_at = ? 
      WHERE id = ? AND user_id = ?
    `, [title, new Date().toISOString(), conversationId, userId]);

    if (result.rowsAffected === 0) {
      return { success: false, error: 'Conversation not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating conversation title:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
