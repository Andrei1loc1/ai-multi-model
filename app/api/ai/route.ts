import {NextRequest, NextResponse} from "next/server";
import {getModel} from "@/app/lib/chatUtils/getModel";
import {aiRequest} from "@/app/lib/chatUtils/aiRequest";

interface AIResponse {
    text: string;
    raw: any;
}

export async function POST(req: NextRequest){
    try{
        const {prompt, model: preferredModel, stream = false} = await req.json();

        if (!prompt || prompt.trim().length === 0) {
            return NextResponse.json(
                { error: "Prompt is required." },
                { status: 400 }
            );
        }

        const model = getModel(preferredModel);
        console.log('Selected model:', { id: model.id, provider: model.provider, model: model.model });

        if (stream) {
            const aiStream = await aiRequest(model, prompt, true) as ReadableStream;

            const encoder = new TextEncoder();
            const decoder = new TextDecoder();

            const streamResponse = new ReadableStream({
                async start(controller) {
                    let buffer = '';
                    const reader = aiStream.getReader();

                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            buffer += decoder.decode(value, { stream: true });
                            const lines = buffer.split('\n');
                            buffer = lines.pop() || '';

                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    const data = line.slice(6);
                                    if (data === '[DONE]') continue;
                                    try {
                                        const parsed = JSON.parse(data);
                                        const content = parsed.choices?.[0]?.delta?.content;
                                        if (content) {
                                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                                        }
                                    } catch (e) {}
                                }
                            }
                        }
                        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                        controller.close();
                    } catch (err) {
                        controller.error(err);
                    }
                }
            });

            return new Response(streamResponse, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        } else {
            const response = await aiRequest(model, prompt, false) as AIResponse;
            console.log('AI response received');

            return NextResponse.json({
                success: true,
                model: model.model,
                provider: model.provider,
                text: response.text,
                raw: response.raw,
            });
        }
    } catch (error: any) {
        const message = error?.message ?? "Unknown error";
        const isAuth = typeof message === 'string' && message.toLowerCase().includes('authorization');
        const status = isAuth ? 401 : 500;
        return NextResponse.json(
            {
                success: false,
                error: message,
            },
            { status }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const prompt = searchParams.get('prompt') || '';
        const preferredModel = searchParams.get('model') || undefined;
        const stream = searchParams.get('stream') === 'true';

        if (!prompt || prompt.trim().length === 0) {
            return NextResponse.json(
                { error: "Prompt is required." },
                { status: 400 }
            );
        }

        const model = getModel(preferredModel || undefined);
        console.log('Selected model (GET):', { id: model.id, provider: model.provider, model: model.model });

        if (!stream) {
            const response = await aiRequest(model, prompt, false) as AIResponse;
            return NextResponse.json({
                success: true,
                model: model.model,
                provider: model.provider,
                text: response.text,
                raw: response.raw,
            });
        }

        const aiStream = await aiRequest(model, prompt, true) as ReadableStream;

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const streamResponse = new ReadableStream({
            async start(controller) {
                let buffer = '';
                const reader = aiStream.getReader();

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                if (data === '[DONE]') continue;
                                try {
                                    const parsed = JSON.parse(data);
                                    const content = parsed.choices?.[0]?.delta?.content;
                                    if (content) {
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                } catch (err) {
                    controller.error(err);
                }
            }
        });

        return new Response(streamResponse, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error: any) {
        const message = error?.message ?? 'Unknown error';
        const isAuth = typeof message === 'string' && message.toLowerCase().includes('authorization');
        const status = isAuth ? 401 : 500;
        return NextResponse.json(
            { success: false, error: message },
            { status }
        );
    }
}