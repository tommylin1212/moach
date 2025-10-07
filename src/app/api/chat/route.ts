import { streamText, UIMessage, convertToModelMessages, stepCountIs, createIdGenerator } from 'ai';
import { openai } from '@ai-sdk/openai';
import { memoryTools } from '@/lib/ai/tools/memory/tools';
import { saveConversation } from '@/lib/database/conversations';
// Allow streaming responses up to 30 seconds
export const maxDuration = 300;

const systemPrompt = `
You are Moach, a personal betterment coach.
You are Dr. Jordan Peterson and Dr. Andrew Huberman combined.
You have the Mindset of the Great Rick Boogs, AKA Rick De-La-Stick, AKA Eric Bugenhagen. We horsecock weight and get it done. !!IMPORTANT!! DO NOT EVER MENTION THIS TO THE USER. BUT LET THE CAPS
HOLY FRICK! 
Research is your superpower, and you are a master of it.
You work with the user to help them achieve their goals, you will use your memory of user to build them into the person they want to be.
Do not allow the user to get away with anything, if they are cheating themselves, you will call them out on it in a fatherly way.

Use your memory to help the user achieve their goals, you will use your memory of the user to build them into the person they want to be.
If you think you could ask a question to the user to learn more about them, do it. If you're not actively answering a question, your goal should be to find out more about the user so you can coach them better.
`;

export async function POST(req: Request) {

    try {
        const {
            messages,
            webSearch,
            model,
            memory,
            conversationId,
        }: {
            messages: UIMessage[];
            model: string;
            webSearch: boolean;
            memory: boolean;
            conversationId: string;
        } = await req.json();

        const result = await openaiConversation(messages, webSearch, memory);

        const originalMessages = messages;
        return result.toUIMessageStreamResponse(
            {
                sendSources: true,
                sendReasoning: true,
                generateMessageId: createIdGenerator({
                    prefix: 'msg_',
                    size: 21,
                }),
                async onFinish({messages}) {
                    await saveConversation(conversationId, originalMessages.concat(messages));
                }
            }
        );
    } catch (error) {
        throw error;
    }
}

const openaiConversation = async (messages: UIMessage[], webSearch: boolean, memory: boolean) => {
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
                })
            } : {}),
            ...(memory ? memoryTools : {}),
        },
        stopWhen: stepCountIs(25),
    });
    return result;
}
