import { memoryStoreSchema, memoryStoreMultipleSchema, memoryRetrieveSchema, memoryUpdateSchema, memorySemanticSearchSchema, memorySearchByTagsSchema, memorySearchByKeySchema } from './schemas';
import { getDrizzleClient } from '@/lib/database/connection';
import { memory } from '@/lib/database/schema';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getUser } from '@/lib/auth/user';
import { sql } from 'drizzle-orm';
import logger from '@/lib/logger';

// Types for better type safety
type MemoryResult = {
    success: boolean;
    error?: string;
    message?: string;
    results?: any[];
    count?: number;
};

type MemoryRow = {
    id: string;
    key: string;
    value: string;
    tags: string;
    created_at: string;
    similarity_score?: number;
};

// Common utilities
const generateEmbedding = async (text: string): Promise<number[]> => {
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

const handleError = (error: unknown, operation: string): MemoryResult => {
    logger.error(
        error instanceof Error ? error : new Error(String(error)),
        `Memory operation failed: ${operation}`
    );
    
    logger.debug(
        {
            table: 'memory',
            error: error instanceof Error ? error.message : String(error),
        },
        `Database error during ${operation}`
    );
    
    return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
    };
};

const formatMemoryResults = (rows: any[]): any[] => {
    return rows.map((row: MemoryRow) => ({
        id: row.id,
        key: row.key,
        value: row.value,
        tags: JSON.parse(row.tags),
        created_at: row.created_at,
        ...(row.similarity_score !== undefined && { similarity_score: row.similarity_score })
    }));
};

const upsertMemory = async (db: any, memoryData: {
    key: string;
    value: string;
    tags: string;
    userId: string;
    embedding: number[];
}) => {
    return db.insert(memory)
        .values(memoryData)
        .onConflictDoUpdate({
            target: [memory.key, memory.userId],
            set: {
                value: sql`excluded.value`,
                tags: sql`excluded.tags`,
                embedding: sql`excluded.embedding`,
            },
        });
};

export const memoryStoreFunction = async (key: string, value: string, tags: string[]): Promise<MemoryResult> => {
    const startTime = Date.now();
    
    logger.debug(
        {
            operation: 'memory_store',
            key,
            tagsCount: tags.length,
            valueLength: value.length,
        },
        'Starting memory store operation'
    );
    
    const { success, error } = memoryStoreSchema.safeParse({ key, value, tags });
    if (!success) {
        logger.warn(
            {
                operation: 'memory_store',
                key,
                validationError: error.message,
            },
            'Memory store validation failed'
        );
        return { success: false, error: error.message };
    }

    try {
        const [user_id, embedding, db] = await Promise.all([
            getUser(),
            generateEmbedding(value),
            getDrizzleClient()
        ]);

        await upsertMemory(db, {
            key,
            value,
            tags: JSON.stringify(tags),
            userId: user_id,
            embedding,
        });

        const duration = Date.now() - startTime;
        
        logger.database(
            {
                operation: 'insert',
                table: 'memory',
                queryTime: duration,
                rowsAffected: 1,
            },
            `Memory stored successfully: ${key}`
        );

        return { success: true, message: 'Memory stored successfully' };
    } catch (error) {
        return handleError(error, 'storing memory');
    }
}

export const memoryStoreMultipleFunction = async (memoryList: { key: string, value: string, tags: string[] }[]): Promise<MemoryResult> => {
    const startTime = Date.now();
    
    logger.debug(
        {
            operation: 'memory_store_multiple',
            memoryCount: memoryList.length,
        },
        `Starting batch memory store for ${memoryList.length} items`
    );
    
    const { success, error } = memoryStoreMultipleSchema.safeParse({ memoryList });
    if (!success) {
        logger.warn(
            {
                operation: 'memory_store_multiple',
                validationError: error.message,
            },
            'Multiple memory store validation failed'
        );
        return { success: false, error: error.message };
    }

    try {
        const [user_id, db] = await Promise.all([getUser(), getDrizzleClient()]);

        // Process each memory entry and generate embeddings in parallel
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

        // Batch upsert all memories
        await Promise.all(memoryEntries.map(entry => upsertMemory(db, entry)));

        const duration = Date.now() - startTime;
        
        logger.database(
            {
                operation: 'insert',
                table: 'memory',
                queryTime: duration,
                rowsAffected: memoryEntries.length,
            },
            `Successfully stored ${memoryEntries.length} memories`
        );

        return { 
            success: true, 
            count: memoryEntries.length, 
            message: 'Memories stored successfully' 
        };
    } catch (error) {
        return handleError(error, 'storing multiple memories');
    }
}

export const memoryRetrieveFunction = async (embeddingQuery: string) => {
    const startTime = Date.now();
    
    logger.debug(
        {
            operation: 'memory_retrieve',
            queryLength: embeddingQuery.length,
        },
        'Starting memory retrieval with semantic search'
    );
    
    const { success, error } = memoryRetrieveSchema.safeParse({ embeddingQuery });
    if (!success) {
        logger.warn(
            {
                operation: 'memory_retrieve',
                validationError: error.message,
            },
            'Memory retrieve validation failed'
        );
        return { success: false, error: error.message };
    }

    try {
        const [user_id, queryEmbedding, db] = await Promise.all([
            getUser(),
            generateEmbedding(embeddingQuery),
            getDrizzleClient()
        ]);

        const result = await db.all(sql`
            SELECT id, key, value, tags, created_at,
                   vector_distance_cos(embedding, ${JSON.stringify(queryEmbedding)}) as similarity_score
            FROM memory 
            WHERE user_id = ${user_id}
            ORDER BY similarity_score ASC
            LIMIT 5
        `);

        const duration = Date.now() - startTime;
        
        logger.database(
            {
                operation: 'select',
                table: 'memory',
                queryTime: duration,
                rowsAffected: result.length,
            },
            `Memory retrieval completed: found ${result.length} results`
        );

        return result.length > 0 ? formatMemoryResults(result) : null;
    } catch (error) {
        return handleError(error, 'retrieving memory');
    }
}

export const memoryUpdateFunction = async (key: string, value: string, tags: string[]): Promise<MemoryResult> => {
    const startTime = Date.now();
    
    logger.debug(
        {
            operation: 'memory_update',
            key,
            tagsCount: tags.length,
            valueLength: value.length,
        },
        `Starting memory update for key: ${key}`
    );
    
    const { success, error } = memoryUpdateSchema.safeParse({ key, value, tags });
    if (!success) {
        logger.warn(
            {
                operation: 'memory_update',
                key,
                validationError: error.message,
            },
            'Memory update validation failed'
        );
        return { success: false, error: error.message };
    }

    try {
        const [user_id, embedding, db] = await Promise.all([
            getUser(),
            generateEmbedding(value),
            getDrizzleClient()
        ]);

        await upsertMemory(db, {
            key,
            value,
            tags: JSON.stringify(tags),
            userId: user_id,
            embedding,
        });

        const duration = Date.now() - startTime;
        
        logger.database(
            {
                operation: 'update',
                table: 'memory',
                queryTime: duration,
                rowsAffected: 1,
            },
            `Memory updated successfully: ${key}`
        );

        return { success: true, message: 'Memory updated successfully' };
    } catch (error) {
        return handleError(error, 'updating memory');
    }
}

export const memorySemanticSearchFunction = async (embeddingQuery: string, limit: number = 5): Promise<MemoryResult> => {
    const startTime = Date.now();
    
    logger.debug(
        {
            operation: 'memory_semantic_search',
            queryLength: embeddingQuery.length,
            limit,
        },
        'Starting semantic search of memory'
    );
    
    const { success, error } = memorySemanticSearchSchema.safeParse({ embeddingQuery, limit });
    if (!success) {
        logger.warn(
            {
                operation: 'memory_semantic_search',
                validationError: error.message,
            },
            'Memory semantic search validation failed'
        );
        return { success: false, error: error.message };
    }

    try {
        const [user_id, queryEmbedding, db] = await Promise.all([
            getUser(),
            generateEmbedding(embeddingQuery),
            getDrizzleClient()
        ]);

        const result = await db.all(sql`
            SELECT id, key, value, tags, created_at,
                   vector_distance_cos(embedding, ${JSON.stringify(queryEmbedding)}) as similarity_score
            FROM memory 
            WHERE user_id = ${user_id}
            ORDER BY similarity_score ASC
            LIMIT ${limit}
        `);
        
        const duration = Date.now() - startTime;
        const results = formatMemoryResults(result);
        
        logger.database(
            {
                operation: 'select',
                table: 'memory',
                queryTime: duration,
                rowsAffected: results.length,
            },
            `Semantic search completed: found ${results.length} results`
        );
        
        return { 
            success: true, 
            results, 
            count: results.length,
            message: 'Memory semantic search completed successfully' 
        };
    } catch (error) {
        return handleError(error, 'performing semantic search');
    }
}

export const memorySearchByTagsFunction = async (tags: string[], limit: number = 10): Promise<MemoryResult> => {
    const startTime = Date.now();
    
    logger.debug(
        {
            operation: 'memory_search_by_tags',
            tags,
            tagsCount: tags.length,
            limit,
        },
        `Starting memory search by tags: ${tags.join(', ')}`
    );
    
    const { success, error } = memorySearchByTagsSchema.safeParse({ tags, limit });
    if (!success) {
        logger.warn(
            {
                operation: 'memory_search_by_tags',
                validationError: error.message,
            },
            'Memory search by tags validation failed'
        );
        return { success: false, error: error.message };
    }

    try {
        const [user_id, db] = await Promise.all([getUser(), getDrizzleClient()]);

        // Create tag conditions using SQL template literals
        const tagValues = tags.map(tag => `%"${tag}"%`);
        const tagConditions = tags.map((_, index) => sql`tags LIKE ${tagValues[index]}`);

        const result = await db.all(sql`
            SELECT id, key, value, tags, created_at
            FROM memory 
            WHERE user_id = ${user_id} AND (${sql.join(tagConditions, sql` OR `)})
            ORDER BY created_at DESC
            LIMIT ${limit}
        `);

        const duration = Date.now() - startTime;
        const results = formatMemoryResults(result);
        
        logger.database(
            {
                operation: 'select',
                table: 'memory',
                queryTime: duration,
                rowsAffected: results.length,
            },
            `Tag search completed: found ${results.length} memories with tags: ${tags.join(', ')}`
        );
        
        return { 
            success: true, 
            results, 
            count: results.length,
            message: `Found ${results.length} memories with tags: ${tags.join(', ')}` 
        };
    } catch (error) {
        return handleError(error, 'searching memories by tags');
    }
}

export const memorySearchByKeyFunction = async (keyPattern: string, exactMatch: boolean = false, limit: number = 10): Promise<MemoryResult> => {
    const startTime = Date.now();
    const matchType = exactMatch ? 'exact' : 'partial';
    
    logger.debug(
        {
            operation: 'memory_search_by_key',
            keyPattern,
            exactMatch,
            matchType,
            limit,
        },
        `Starting memory search by key: ${keyPattern} (${matchType} match)`
    );
    
    const { success, error } = memorySearchByKeySchema.safeParse({ keyPattern, exactMatch, limit });
    if (!success) {
        logger.warn(
            {
                operation: 'memory_search_by_key',
                validationError: error.message,
            },
            'Memory search by key validation failed'
        );
        return { success: false, error: error.message };
    }

    try {
        const [user_id, db] = await Promise.all([getUser(), getDrizzleClient()]);
        
        const result = exactMatch 
            ? await db.all(sql`
                SELECT id, key, value, tags, created_at
                FROM memory 
                WHERE user_id = ${user_id} AND key = ${keyPattern}
                ORDER BY created_at DESC
                LIMIT ${limit}
            `)
            : await db.all(sql`
                SELECT id, key, value, tags, created_at
                FROM memory 
                WHERE user_id = ${user_id} AND key LIKE ${`%${keyPattern}%`}
                ORDER BY created_at DESC
                LIMIT ${limit}
            `);

        const duration = Date.now() - startTime;
        const results = formatMemoryResults(result);
        
        logger.database(
            {
                operation: 'select',
                table: 'memory',
                queryTime: duration,
                rowsAffected: results.length,
            },
            `Key search completed: found ${results.length} memories with ${matchType} match for "${keyPattern}"`
        );
        
        return { 
            success: true, 
            results, 
            count: results.length,
            message: `Found ${results.length} memories with ${matchType} key match: "${keyPattern}"` 
        };
    } catch (error) {
        return handleError(error, 'searching memories by key');
    }
}
