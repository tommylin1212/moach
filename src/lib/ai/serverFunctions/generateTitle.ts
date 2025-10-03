import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const systemPrompt = `
You are a helpful assistant that generates titles for conversations.
Give a title for the conversation based on the first user message.
The title should be a single sentence that captures the essence of the conversation.
The title should be no more than 50 characters.
The title should be in the same language as the first user message.
`;

export async function generateTitle(message: string) {
    const result = await generateText({
        model: openai("gpt-4o"),
        system: systemPrompt,
        prompt: message,
    });
    return result.text;
}