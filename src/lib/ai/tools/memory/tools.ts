import { tool, ToolSet } from "ai";
import { memoryRetrieveSchema, memorySemanticSearchSchema, memoryStoreMultipleSchema, memoryStoreSchema, memoryUpdateSchema, memorySearchByTagsSchema, memorySearchByKeySchema } from "./schemas";
import { memoryRetrieveFunction, memorySemanticSearchFunction, memoryStoreFunction, memoryStoreMultipleFunction, memoryUpdateFunction, memorySearchByTagsFunction, memorySearchByKeyFunction } from "./functions";

export const memoryTools: ToolSet = {
     memory_store: tool({
        description: 'Store information in a memory store, store everything relevant to the user',
        inputSchema: memoryStoreSchema,
        execute: async ({key, value, tags}) => memoryStoreFunction(key, value, tags),
    }),
    memory_store_multiple: tool({
        description: 'Store multiple distinct pieces of information in a memory store.',
        inputSchema: memoryStoreMultipleSchema,
        execute: async ({memoryList})=> memoryStoreMultipleFunction(memoryList)
    }),
    memory_retrieve: tool({
        description: 'Search for relevant memories using semantic similarity. Provide a natural language query describing what you want to find.',
        inputSchema: memoryRetrieveSchema,
        execute: async ({embeddingQuery}) => memoryRetrieveFunction(embeddingQuery),
    }),
    memory_search_semantic: tool({
        description: 'Perform semantic search across all memories to find the most relevant information based on context and meaning.',
        inputSchema: memorySemanticSearchSchema,
        execute: async ({embeddingQuery, limit = 5}) => memorySemanticSearchFunction(embeddingQuery, limit),
    }),
    memory_update: tool({
        description: 'Update information in a memory store',
        inputSchema: memoryUpdateSchema,
        execute: async ({key, value, tags}) => memoryUpdateFunction(key, value, tags),
    }),
    memory_search_by_tags: tool({
        description: 'Search for memories by specific tags. Returns memories that contain any of the specified tags (OR logic).',
        inputSchema: memorySearchByTagsSchema,
        execute: async ({tags, limit = 10}) => memorySearchByTagsFunction(tags, limit),
    }),
    memory_search_by_key: tool({
        description: 'Search for memories by key pattern. Supports both exact and partial key matching.',
        inputSchema: memorySearchByKeySchema,
        execute: async ({keyPattern, exactMatch = false, limit = 10}) => memorySearchByKeyFunction(keyPattern, exactMatch, limit),
    })
};