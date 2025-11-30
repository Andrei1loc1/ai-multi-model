import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export async function comprimContext(prompt : string, bruteContext: string){
    if (!bruteContext || bruteContext.trim() === "") {
        return "";
    }
    const { text } = await generateText({
        model: groq('llama-3.1-8b-instant'),
        prompt: `
        You are a context filter. Extract only relevant facts for the question. Output as bullet points or empty if none.

        Question: ${prompt}

        Context: ${bruteContext}

        Output:
        `,
    });
    return text;
}