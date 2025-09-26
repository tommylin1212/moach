import { memoryStoreSchema, memoryStoreMultipleSchema, memoryRetrieveSchema, memoryUpdateSchema, memorySemanticSearchSchema, memorySearchByTagsSchema, memorySearchByKeySchema } from './schemas';
import { z } from 'zod';
import { db, turso } from '@/lib/database/connection';
import { memory } from '@/lib/database/schema';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getUser } from '@/lib/auth/user';
import { eq, and, sql } from 'drizzle-orm';
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
        const user_id = await getUser();
        const embedding = await generateEmbedding(value);
        
        await db.insert(memory)
            .values({
                key,
                value,
                tags: JSON.stringify(tags),
                userId: user_id,
                embedding,
            })
            .onConflictDoUpdate({
                target: [memory.key, memory.userId],
                set: {
                    value: sql`excluded.value`,
                    tags: sql`excluded.tags`,
                    embedding: sql`excluded.embedding`,
                },
            });
    } catch (error: any) {
        console.error('Error storing memory:', error);
        return { success: false, error: error.message };
    }
    return { success: true, message: 'Memory stored successfully' };
}

export const memoryStoreMultipleFunction = async (memoryList: { key: string, value: string, tags: string[] }[]) => {
    console.log('Storing multiple memories',JSON.stringify(memoryList,null,2));
    const { success, error } = memoryStoreMultipleSchema.safeParse({ memoryList });
    if (!success) {
        console.error('Error storing multiple memories:', error);
        return { success: false, error: error.message };
    }
    try {
        const user_id = await getUser();

        // Process each memory entry and generate embeddings
        const memoryEntries = await Promise.all(
            memoryList.map(async (memoryItem) => {
                const embedding = await generateEmbedding(memoryItem.value);
                return {
                    key: memoryItem.key,
                    value: memoryItem.value,
                    tags: JSON.stringify(memoryItem.tags),
                    userId: user_id,
                    embedding
                };
            })
        );

        // Batch upsert all memories using Drizzle
        for (const entry of memoryEntries) {
            await db.insert(memory)
                .values(entry)
                .onConflictDoUpdate({
                    target: [memory.key, memory.userId],
                    set: {
                        value: sql`excluded.value`,
                        tags: sql`excluded.tags`,
                        embedding: sql`excluded.embedding`,
                    },
                });
        }
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
        const user_id = await getUser();

        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(embeddingQuery);

        // Use vector similarity search - need raw SQL for vector operations
        const result = await turso.execute(`
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
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
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
        
        await db.insert(memory)
            .values({
                key,
                value,
                tags: JSON.stringify(tags),
                userId: user_id,
                embedding,
            })
            .onConflictDoUpdate({
                target: [memory.key, memory.userId],
                set: {
                    value: sql`excluded.value`,
                    tags: sql`excluded.tags`,
                    embedding: sql`excluded.embedding`,
                },
            });
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
        const user_id = await getUser();

        // Generate embedding for the search query
        const queryEmbedding = await generateEmbedding(embeddingQuery);

        // Perform semantic search with configurable limit - need raw SQL for vector operations
        const result = await turso.execute(`
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

export const memorySearchByTagsFunction = async (tags: string[], limit: number = 10) => {
    console.log('Searching memories by tags:', tags);
    const { success, error } = memorySearchByTagsSchema.safeParse({ tags, limit });
    if (!success) {
        return { success: false, error: error.message };
    }
    try {
        const user_id = await getUser();

        // Create placeholders for tags - we'll use JSON_EXTRACT or LIKE for tag matching
        const tagConditions = tags.map(() => 'tags LIKE ?').join(' OR ');
        const tagValues = tags.map(tag => `%"${tag}"%`);

        const result = await turso.execute(`
            SELECT id, key, value, tags, created_at
            FROM memory 
            WHERE user_id = ? AND (${tagConditions})
            ORDER BY created_at DESC
            LIMIT ?
        `, [user_id, ...tagValues, limit]);

        // Format results
        const results = result.rows.map(row => ({
            id: row.id,
            key: row.key,
            value: row.value,
            tags: JSON.parse(row.tags as string),
            created_at: row.created_at
        }));

        return { 
            success: true, 
            results: results, 
            count: results.length,
            message: `Found ${results.length} memories with tags: ${tags.join(', ')}` 
        };
    } catch (error) {
        console.error('Error searching memories by tags:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export const memorySearchByKeyFunction = async (keyPattern: string, exactMatch: boolean = false, limit: number = 10) => {
    console.log('Searching memories by key pattern:', keyPattern, 'exactMatch:', exactMatch);
    const { success, error } = memorySearchByKeySchema.safeParse({ keyPattern, exactMatch, limit });
    if (!success) {
        return { success: false, error: error.message };
    }
    try {
        const user_id = await getUser();

        let query: string;
        let queryValues: any[];

        if (exactMatch) {
            // Exact key match
            query = `
                SELECT id, key, value, tags, created_at
                FROM memory 
                WHERE user_id = ? AND key = ?
                ORDER BY created_at DESC
                LIMIT ?
            `;
            queryValues = [user_id, keyPattern, limit];
        } else {
            // Partial key match using LIKE
            query = `
                SELECT id, key, value, tags, created_at
                FROM memory 
                WHERE user_id = ? AND key LIKE ?
                ORDER BY created_at DESC
                LIMIT ?
            `;
            queryValues = [user_id, `%${keyPattern}%`, limit];
        }

        const result = await turso.execute(query, queryValues);

        // Format results
        const results = result.rows.map(row => ({
            id: row.id,
            key: row.key,
            value: row.value,
            tags: JSON.parse(row.tags as string),
            created_at: row.created_at
        }));

        const matchType = exactMatch ? 'exact' : 'partial';
        return { 
            success: true, 
            results: results, 
            count: results.length,
            message: `Found ${results.length} memories with ${matchType} key match: "${keyPattern}"` 
        };
    } catch (error) {
        console.error('Error searching memories by key:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
