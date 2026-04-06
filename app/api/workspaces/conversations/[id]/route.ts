import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/app/lib/database/supabase";
import { getErrorMessage } from "@/app/lib/utils/errors";
import { deleteConversation, getConversationById, getConversationMessages } from "@/app/lib/workspaces/service";
import type { VirtualProjectSummary } from "@/app/lib/workspaces/types";

export const runtime = "nodejs";

async function getLatestProjectSummary(conversationId: string): Promise<VirtualProjectSummary | null> {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from("virtual_projects")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const { count, error: countError } = await supabase
        .from("virtual_project_files")
        .select("id", { count: "exact", head: true })
        .eq("project_id", data.id);
    if (countError) throw new Error(countError.message);

    return {
        id: data.id,
        workspaceId: data.workspace_id,
        conversationId: data.conversation_id,
        sourceMessageId: data.source_message_id,
        kind: data.kind,
        title: data.title,
        prompt: data.prompt,
        status: data.status,
        entryFile: data.entry_file,
        previewMode: data.preview_mode,
        fileCount: count || 0,
        manifest: data.manifest_json || {},
        lastRunSummary: data.last_run_summary || null,
        lastError: data.last_error,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
}

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    try {
        const { id } = await context.params;
        const conversation = await getConversationById(id);

        if (!conversation) {
            return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
        }

        const messages = await getConversationMessages(id, 50);
        const latestProject = await getLatestProjectSummary(id);
        return NextResponse.json({ conversation, messages, latestProject });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: getErrorMessage(error, "Failed to load conversation.") },
            { status: 500 }
        );
    }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    try {
        const { id } = await context.params;
        const conversation = await getConversationById(id);

        if (!conversation) {
            return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
        }

        await deleteConversation(id);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: getErrorMessage(error, "Failed to delete conversation.") },
            { status: 500 }
        );
    }
}
