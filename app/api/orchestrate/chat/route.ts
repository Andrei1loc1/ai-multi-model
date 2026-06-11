import { NextRequest, NextResponse } from "next/server";
import * as orchestratorService from "@/app/lib/orchestrator/service";
import type { OrchestrateChatOutput } from "@/app/lib/workspaces/types";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import { getErrorMessage } from "@/app/lib/utils/errors";
import { persistConversationTurn } from "@/app/lib/memory/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json(
            { error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY." },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        if (!body?.message?.trim()) {
            return NextResponse.json({ error: "Message is required." }, { status: 400 });
        }

        const input = {
            message: body.message,
            mode: body.mode === "agent" ? "agent" : "chat",
            soul: body.soul || "default",
            selectedModel: body.selectedModel,
            selectedProvider: body.selectedProvider,
            workspaceId: body.workspaceId || null,
            conversationId: body.conversationId || null,
            attachments: Array.isArray(body.attachments) ? body.attachments : [],
            capabilities: body.capabilities || {},
            stream: body.stream === true,
        } as Parameters<typeof orchestratorService.orchestrateChat>[0];

        const result = await orchestratorService.orchestrateChat(input);

        const isStreamResult = typeof result !== "string" && "stream" in result && result.stream instanceof ReadableStream;

        if (input.stream && isStreamResult) {
            const streamResult = result as OrchestrateChatOutput & { stream: ReadableStream<Uint8Array> };
            const upstreamReader = streamResult.stream.getReader();
            const decoder = new TextDecoder();
            const encoder = new TextEncoder();
            let streamedContent = "";

            const metadata = {
                conversationId: result.conversationId,
                modelUsed: result.modelUsed,
                taskType: result.taskType,
                contextSources: result.contextSources,
                memoryWrites: result.memoryWrites,
                suggestedActions: result.suggestedActions,
                agent: result.agent,
                virtualProject: result.virtualProject,
                agentRun: result.agentRun,
                runStarted: result.runStarted,
            };

            const streamResponse = new ReadableStream({
                async start(controller) {
                    try {
                        while (true) {
                            const { done, value } = await upstreamReader.read();
                            if (done) break;

                            const chunk = decoder.decode(value, { stream: true });
                            const lines = chunk.split("\n");
                            for (const line of lines) {
                                if (!line.startsWith("data: ")) continue;
                                const dataStr = line.slice(6);
                                if (dataStr === "[DONE]") continue;

                                try {
                                    const parsed = JSON.parse(dataStr);
                                    const delta = parsed.choices?.[0]?.delta?.content || parsed.content || "";
                                    if (delta) {
                                        streamedContent += delta;
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta, ...metadata })}\n\n`));
                                    }
                                } catch {
                                    if (dataStr.trim()) {
                                        streamedContent += dataStr;
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: dataStr, ...metadata })}\n\n`));
                                    }
                                }
                            }
                        }

                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "", answer: streamedContent, done: true, ...metadata })}\n\n`));
                        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                        controller.close();

                        try {
                            await persistConversationTurn({
                                conversationId: result.conversationId,
                                workspaceId: input.workspaceId,
                                userMessage: input.message,
                                assistantAnswer: streamedContent,
                                assistantMetadata: {
                                    modelUsed: result.modelUsed,
                                    taskType: result.taskType,
                                    contextSources: result.contextSources,
                                },
                            });
                        } catch (persistError) {
                            console.error("Failed to persist streaming conversation turn:", persistError);
                        }
                    } catch (streamError) {
                        controller.error(streamError);
                    } finally {
                        upstreamReader.releaseLock();
                    }
                },
            });

            return new Response(streamResponse, {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            });
        }

        if (input.stream) {
            const encoder = new TextEncoder();
            const { stream: _, ...serializableResult } = result as OrchestrateChatOutput & { stream?: unknown };

            const streamResponse = new ReadableStream({
                async start(controller) {
                    const payload = JSON.stringify({
                        content: (serializableResult as OrchestrateChatOutput).answer,
                        ...(serializableResult as OrchestrateChatOutput),
                        done: true,
                    });
                    controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                },
            });

            return new Response(streamResponse, {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Orchestrate chat error:", error);
        return NextResponse.json(
            { error: getErrorMessage(error, "Something went wrong while orchestrating the chat response.") },
            { status: 500 }
        );
    }
}
