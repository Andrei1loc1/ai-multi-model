import { subscribeToAgentRun, getAgentRunSnapshot } from "@/app/lib/agents/events";

export const runtime = "nodejs";

function encodeSseMessage(data: unknown, event?: string) {
    const lines = [];
    if (event) {
        lines.push(`event: ${event}`);
    }
    lines.push(`data: ${JSON.stringify(data)}`);
    lines.push("");
    return `${lines.join("\n")}\n`;
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const snapshot = getAgentRunSnapshot(id);

    if (!snapshot) {
        return new Response("Agent run not found.", { status: 404 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(
                encoder.encode(
                    encodeSseMessage(
                        {
                            type: "snapshot",
                            snapshot,
                            run: snapshot,
                        },
                        "snapshot"
                    )
                )
            );

            const unsubscribe = subscribeToAgentRun(id, (event) => {
                const latest = getAgentRunSnapshot(id);
                controller.enqueue(
                    encoder.encode(
                        encodeSseMessage(
                            {
                                type: "event",
                                event,
                                run: latest,
                            },
                            "event"
                        )
                    )
                );
                if (!latest || latest.status !== "running") {
                    controller.enqueue(
                        encoder.encode(
                            encodeSseMessage(
                                {
                                    type: "done",
                                    done: true,
                                    status: latest?.status || "failed",
                                    run: latest,
                                },
                                "done"
                            )
                        )
                    );
                    unsubscribe?.();
                    controller.close();
                }
            });

            if (!unsubscribe) {
                controller.close();
            }
        },
        cancel() {
            return;
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
