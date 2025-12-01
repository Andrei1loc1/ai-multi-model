import { NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt, bruteContext } = await req.json();

    if (!bruteContext || (typeof bruteContext === 'string' && bruteContext.trim() === '')) {
      return NextResponse.json({ text: '' });
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

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Compress API error:', error);
    return NextResponse.json({ error: 'Failed to compress context' }, { status: 500 });
  }
}
