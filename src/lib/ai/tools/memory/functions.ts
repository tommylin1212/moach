import { memoryStoreSchema, memoryStoreMultipleSchema, memoryRetrieveSchema, memoryUpdateSchema, memorySemanticSearchSchema } from './schemas';
import { z } from 'zod';
import { turso } from '@/lib/database/connection';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getUser } from '@/lib/auth/user';
const db = turso;
const generateEmbedding = async (text: string): Promise<number[]> => {
    console.log('Generating embedding for:', text);
    const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: text,
        providerOptions: {
            openai: {
                dimensions: 1536,
            },
        },
    });
    return embedding;
};

export const memoryStoreFunction = async (key: string, value: string, tags: string[]) => {
    console.log('Storing single memory',JSON.stringify({ key, value, tags },null,2));
    const { success, error } = memoryStoreSchema.safeParse({ key, value, tags });
    if (!success) {
        console.error('Error storing memory:', error);
        return { success: false, error: error.message };
    }
    try {
        console.log('Storing single memory');
        const user_id = await getUser();
        const embedding = await generateEmbedding(value);
        await db.execute(
            `INSERT INTO memory (key, value, tags, user_id, embedding) 
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(key, user_id) 
             DO UPDATE SET 
               value = excluded.value,
               tags = excluded.tags,
               embedding = excluded.embedding`,
            [key, value, JSON.stringify(tags), user_id, JSON.stringify(embedding)]
        );
    } catch (error: any) {
        console.error('Error storing memory:', error);
        return { success: false, error: error.message };
    }
    return { success: true, message: 'Memory stored successfully' };
}

export const memoryStoreMultipleFunction = async (memoryList: { memoryList: { key: string, value: string, tags: string[] }[] }) => {
    console.log('Storing multiple memories',JSON.stringify(memoryList,null,2));
    const { success, error } = memoryStoreMultipleSchema.safeParse({ memoryList });
    if (!success) {
        console.error('Error storing multiple memories:', error);
        return { success: false, error: error.message };
    }
    try {
        const user_id = await getUser();
        console.log('Storing multiple memories:', memoryList.memoryList.length, 'entries');

        // Process each memory entry and generate embeddings
        const memoryEntries = await Promise.all(
            memoryList.memoryList.map(async (memory) => {
                const embedding = await generateEmbedding(memory.value);
                return {
                    key: memory.key,
                    value: memory.value,
                    tags: JSON.stringify(memory.tags),
                    user_id: user_id,
                    embedding: JSON.stringify(embedding)
                };
            })
        );

        // Batch upsert all memories (insert or update if key+user_id combination exists)
        for (const entry of memoryEntries) {
            await db.execute(
                `INSERT INTO memory (key, value, tags, user_id, embedding) 
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(key, user_id) 
                 DO UPDATE SET 
                   value = excluded.value,
                   tags = excluded.tags,
                   embedding = excluded.embedding`,
                [entry.key, entry.value, entry.tags, entry.user_id, entry.embedding]
            );
        }

        console.log(`Successfully stored ${memoryEntries.length} memories`);
        return { success: true, count: memoryEntries.length, message: 'Memories stored successfully' };

    } catch (error) {
        console.error('Error storing multiple memories:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export const memoryRetrieveFunction = async (embeddingQuery: string) => {
    console.log('Retrieving memory for query:', embeddingQuery);
    const { success, error } = memoryRetrieveSchema.safeParse({ embeddingQuery });
    if (!success) {
        console.error('Error retrieving memory:', error);
        return { success: false, error: error.message };
    }
    try {
        console.log('Retrieving memory for query:', embeddingQuery);
        const user_id = await getUser();

        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(embeddingQuery);

        // Use vector similarity search to find the most relevant memories
        const result = await db.execute(`
            SELECT id, key, value, tags, created_at,
                   vector_distance_cos(embedding, ?) as similarity
            FROM memory 
            WHERE user_id = ?
            ORDER BY similarity ASC
            LIMIT 5
        `, [JSON.stringify(queryEmbedding), user_id]);

        return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
        console.error('Error retrieving memory:', error);
    }
    return { success: true, message: 'Memory retrieved successfully' };
}

export const memoryUpdateFunction = async (key: string, value: string, tags: string[]) => {
    console.log('Updating memory for key:', key);
    const { success, error } = memoryUpdateSchema.safeParse({ key, value, tags });
    if (!success) {
        return { success: false, error: error.message };
    }
    try {
        const user_id = await getUser();

        const embedding = await generateEmbedding(value);
        await db.execute(
            `INSERT INTO memory (key, value, tags, user_id, embedding) 
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(key, user_id) 
             DO UPDATE SET 
               value = excluded.value,
               tags = excluded.tags,
               embedding = excluded.embedding`,
            [key, value, JSON.stringify(tags), user_id, JSON.stringify(embedding)]
        );
    } catch (error) {
        console.error('Error updating memory:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
    return { success: true, message: 'Memory updated successfully' };
}

export const memorySemanticSearchFunction = async (embeddingQuery: string, limit: number = 5) => {
    console.log('Semantic search for:', embeddingQuery);
    const { success, error } = memorySemanticSearchSchema.safeParse({ embeddingQuery, limit });
    if (!success) {
        return { success: false, error: error.message };
    }
    try {
        console.log('Semantic search for:', embeddingQuery);
        const user_id = await getUser();
        const db = turso;

        // Generate embedding for the search query
        const queryEmbedding = await generateEmbedding(embeddingQuery);

        // Perform semantic search with configurable limit
        const result = await db.execute(`
            SELECT id, key, value, tags, created_at,
                   vector_distance_cos(embedding, ?) as similarity_score
            FROM memory 
            WHERE user_id = ?
            ORDER BY similarity_score ASC
            LIMIT ?
        `, [JSON.stringify(queryEmbedding), user_id, limit]);
        // Return formatted results with similarity scores
        const results = result.rows.map(row => ({
            id: row.id,
            key: row.key,
            value: row.value,
            tags: JSON.parse(row.tags as string),
            created_at: row.created_at,
            similarity_score: row.similarity_score
        }));
        return { success: true, results: results, message: 'Memory semantic search successfully' };
    } catch (error) {
        console.error('Error semantic searching memory:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
