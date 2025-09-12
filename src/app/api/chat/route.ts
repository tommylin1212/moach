import mem0 from '@/lib/mem0/create-client';
import { streamText, UIMessage, convertToModelMessages, tool, stepCountIs, embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
// Import fs at the top of your file: import * as fs from 'fs';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@libsql/client';
import { turso } from '@/lib/database/connection';
import { memoryRetrieveSchema, memorySemanticSearchSchema, memoryStoreMultipleSchema, memoryStoreSchema, memoryUpdateSchema } from '@/lib/ai/tools/memory/schemas';
import { memoryRetrieveFunction, memorySemanticSearchFunction, memoryStoreFunction, memoryStoreMultipleFunction, memoryUpdateFunction } from '@/lib/ai/tools/memory/functions';
import { memoryTools } from '@/lib/ai/tools/memory/tools';
// Allow streaming responses up to 30 seconds
export const maxDuration = 50;

const systemPrompt = `
You are Moach, a personal betterment coach.
You are Dr. Jordan Peterson and Dr. Andrew Huberman combined.
Research is your superpower, and you are a master of it.
You work with the user to help them achieve their goals, you will use your memory of user to build them into the person they want to be.
Do not allow the user to get away with anything, if they are cheating themselves, you will call them out on it in a fatherly way.

Use your memory to help the user achieve their goals, you will use your memory of the user to build them into the person they want to be.
If you think you could ask a question to the user to learn more about them, do it. If you're not actively answering a question, your goal should be to find out more about the user so you can coach them better.
`;

export async function POST(req: Request) {
    const {
        messages,
        webSearch,
        model,
        memory,
      }: { messages: UIMessage[]; model: string; webSearch: boolean; memory: boolean } =
        await req.json();

    const result = await (model === 'mem0' ? memConversation(messages, onFinishRoutine) : openaiConversation(messages, webSearch, memory, onFinishRoutine));
    
    return result.toUIMessageStreamResponse(
        {
            sendSources: true,
            sendReasoning: true,
        }
    );
}


const memConversation = async (messages: UIMessage[], onFinish: (result: any) => Promise<void> | void | undefined) => {
    const result = streamText({
        system: systemPrompt,
        model: mem0('gpt-4o', { user_id: 'test_user' }),
        tools:{web_search_preview: openai.tools.webSearchPreview({
            searchContextSize: 'high',
            userLocation: {
                type: 'approximate',
                country: 'US',
            },
        })},
        messages: convertToModelMessages(messages),
        onFinish: onFinish,
    });
    return result;
}

const openaiConversation = async (messages: UIMessage[], webSearch: boolean, memory: boolean, onFinish: (result: any) => Promise<void> | void | undefined) => {
    const result = streamText({
        system: systemPrompt,
        model: openai('gpt-5'),
        messages: convertToModelMessages(messages),
            tools: {
                ...(webSearch ? {
                    web_search_preview: openai.tools.webSearchPreview({
                        searchContextSize: 'high',
                        userLocation: {
                            type: 'approximate',
                            country: 'US',
                        },
                    })} : {}),
                ...(memory ? memoryTools : {}),
            },
        onFinish: onFinish,
        stopWhen: stepCountIs(15),
    });
    return result;
}

const onFinishRoutine = async (result: any) => {
    console.log('On finish routine',JSON.stringify(result.messages,null,2));
    console.log('On finish routine',JSON.stringify(result.steps,null,2));
}


