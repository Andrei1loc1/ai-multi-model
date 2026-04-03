import { NextRequest, NextResponse } from "next/server";
import { orchestrateChat } from "@/app/lib/orchestrator/service";
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

        const result = await orchestrateChat({
            message: body.message,
            mode: body.mode === "agent" ? "agent" : "chat",
            selectedModel: body.selectedModel,
            selectedProvider: body.selectedProvider,
            workspaceId: body.workspaceId || null,
            conversationId: body.conversationId || null,
            attachments: Array.isArray(body.attachments) ? body.attachments : [],
            capabilities: body.capabilities || {},
        });

        return NextResponse.json(result);
    } catch (error: unknown) {
        return NextResponse.json(
            { error: getErrorMessage(error, "Failed to orchestrate chat.") },
            { status: 500 }
        );
    }
}
