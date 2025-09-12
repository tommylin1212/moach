import { z } from 'zod';

export const memoryStoreSchema = z.object({
    key: z.string().describe('The key to store the memory under, this is the main identifier of the memory'),
    value: z.string().describe('The value to store in the memory store, this is the main content of the memory, this should be concise but detailed'),
    tags: z.array(z.string()).describe('The tags to store in the memory store, this is a list of tags that can be used to search the memory store'),
});

export const memoryStoreMultipleSchema = z.object({
    memoryList: z.array(memoryStoreSchema).describe('The list of memories to store in the memory store, needs to be an array of objects.'),
});

export const memoryRetrieveSchema = z.object({
    embeddingQuery: z.string().describe('The query to search the memory store embeddings with, the value column gets turned into an embedding and stored in the embedding column')
});

export const memoryUpdateSchema = z.object({
    key: z.string().describe('The key to update the memory under, this is the main identifier of the memory'),
    value: z.string().describe('The value to update in the memory store, this is the main content of the memory, this should be concise but detailed'),
    tags: z.array(z.string()).describe('The tags to update in the memory store, this is a list of tags that can be used to search the memory store'),
});

export const memorySemanticSearchSchema = z.object({
    embeddingQuery: z.string().describe('The query to search the memory store with, this is the query to search the memory store with'),
    limit: z.number().optional().describe('The limit to search the memory store with, this is the limit of the number of results to return'),
});
