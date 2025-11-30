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
        console.log('Selected model:', model);

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
                                    } catch (e) {
                                        // ignore parse errors
                                    }
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
            console.log('AI response:', response);

            return NextResponse.json({
                success: true,
                model: model.model,
                provider: model.provider,
                text: response.text,
                raw: response.raw,
            });
        }
    } catch (error: any) {
        return NextResponse.json(
            {
                success: false,
                error: error.message ?? "Unknown error",
            },
            { status: 500 }
        );
    }
}