import { NextRequest, NextResponse } from "next/server";
import * as orchestratorService from "@/app/lib/orchestrator/service";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import { getErrorMessage } from "@/app/lib/utils/errors";

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
        } as Parameters<typeof orchestratorService.orchestrateChat>[0];

        const startOrchestrateChat = (
            orchestratorService as typeof orchestratorService & {
                startOrchestrateChat?: typeof orchestratorService.orchestrateChat;
            }
        ).startOrchestrateChat;

        const result =
            input.mode === "agent" && typeof startOrchestrateChat === "function"
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
