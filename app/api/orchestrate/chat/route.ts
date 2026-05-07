import { NextRequest, NextResponse } from "next/server";
import * as orchestratorService from "@/app/lib/orchestrator/service";
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
            selectedModel: body.selectedModel,
            selectedProvider: body.selectedProvider,
            workspaceId: body.workspaceId || null,
            conversationId: body.conversationId || null,
            attachments: Array.isArray(body.attachments) ? body.attachments : [],
            capabilities: body.capabilities || {},
            stream: body.stream === true,
        } as Parameters<typeof orchestratorService.orchestrateChat>[0];

        const startOrchestrateChat = (
            orchestratorService as typeof orchestratorService & {
                startOrchestrateChat?: typeof orchestratorService.orchestrateChat;
            }
        ).startOrchestrateChat;

        const useAgentMode = input.mode === "agent" && typeof startOrchestrateChat === "function";

        if (input.stream) {
            const orchestratorFn = useAgentMode ? startOrchestrateChat : orchestratorService.orchestrateChat;
            
            const result = await orchestratorFn(input) as {
                stream?: ReadableStream<Uint8Array>;
                answer?: string;
                runStarted?: boolean;
                conversationId?: string;
                modelUsed?: { id: string; provider: string; profile: string; why: string };
                taskType?: string;
                contextSources?: Array<{ type: string; label: string; score: number }>;
                memoryWrites?: Array<{ kind: string; content: string }>;
                suggestedActions?: string[];
                agent?: unknown;
                virtualProject?: unknown;
                agentRun?: unknown;
            };

            if (result.stream) {
                const encoder = new TextEncoder();
                const decoder = new TextDecoder();

                const streamResponse = new ReadableStream({
                    async start(controller) {
                        let buffer = "";
                        let streamedAnswer = "";
                        // Providers may emit reasoning in <think>...</think>. Strip it incrementally and safely
                        // even when tags are split across SSE chunks.
                        let inThink = false;
                        let thinkCarry = "";
                        const stripThinkIncremental = (chunk: string) => {
                            const inputText = thinkCarry + chunk;
                            thinkCarry = "";
                            let out = "";
                            let i = 0;
                            const lower = inputText.toLowerCase();

                            while (i < inputText.length) {
                                if (inThink) {
                                    const end = lower.indexOf("</think>", i);
                                    if (end === -1) {
                                        // Keep a short tail for the next chunk in case </think> is split.
                                        const keepFrom = Math.max(inputText.length - 16, i);
                                        thinkCarry = inputText.slice(keepFrom);
                                        return out;
                                    }
                                    inThink = false;
                                    i = end + "</think>".length;
                                    continue;
                                }

                                const start = lower.indexOf("<think>", i);
                                if (start === -1) {
                                    out += inputText.slice(i);
                                    return out;
                                }

                                out += inputText.slice(i, start);
                                inThink = true;
                                i = start + "<think>".length;
                            }

                            return out;
                        };
                        const reader = result.stream!.getReader();

                        try {
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;

                                buffer += decoder.decode(value, { stream: true });
                                const lines = buffer.split("\n");
                                buffer = lines.pop() || "";

                                for (const line of lines) {
                                    if (line.startsWith("data: ")) {
                                        const data = line.slice(6);
                                        if (data === "[DONE]") continue;
                                        try {
                                            const parsed = JSON.parse(data);
                                            const content = parsed.choices?.[0]?.delta?.content;
                                            if (content) {
                                                const clean = stripThinkIncremental(content);
                                                if (!clean) continue;
                                                streamedAnswer += clean;
                                                controller.enqueue(
                                                    encoder.encode(`data: ${JSON.stringify({ content: clean })}\n\n`)
                                                );
                                            }
                                        } catch {}
                                    }
                                }
                            }

                            // Persist the streamed turn (user+assistant) once we have the full answer.
                            // In streaming mode, orchestrateChat returns early and doesn't write messages.
                            await persistConversationTurn({
                                conversationId: result.conversationId || input.conversationId!,
                                workspaceId: input.workspaceId,
                                repoConnectionId: null,
                                userMessage: input.message,
                                userMetadata: input.attachments?.length ? { attachments: input.attachments } : null,
                                assistantAnswer: streamedAnswer,
                                assistantMetadata: {
                                    contextSources: result.contextSources || [],
                                    modelUsed: result.modelUsed || null,
                                    taskType: result.taskType || null,
                                    attachments: input.attachments || [],
                                    suggestedActions: result.suggestedActions || [],
                                    agent: result.agent || null,
                                    virtualProject: result.virtualProject || null,
                                    agentRun: result.agentRun || null,
                                    stream: true,
                                },
                            }).catch((err) => {
                                console.error("[STREAM_PERSIST_ERROR]", err);
                            });

                            const finalData = {
                                answer: streamedAnswer || result.answer || "",
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
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalData)}\n\n`));
                            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                            controller.close();
                        } catch (err) {
                            controller.error(err);
                        }
                    },
                });

                return new Response(streamResponse, {
                    headers: {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                    },
                });
            }

            return NextResponse.json(result);
        }

        const result =
            useAgentMode
                ? await startOrchestrateChat(input)
                : await orchestratorService.orchestrateChat(input);

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error("[ORCHESTRATE_CHAT_ERROR]", error);
        return NextResponse.json(
            { error: getErrorMessage(error, "Failed to orchestrate chat.") },
            { status: 500 }
        );
    }
}
