import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import { getErrorMessage } from "@/app/lib/utils/errors";
import { deleteConversation, getConversationById, getConversationMessages } from "@/app/lib/workspaces/service";

export const runtime = "nodejs";

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
        return NextResponse.json({ conversation, messages });
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
