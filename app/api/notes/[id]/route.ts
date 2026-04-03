import { NextRequest, NextResponse } from "next/server";
import { deleteNote, updateNote } from "@/app/lib/workspaces/service";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import { getErrorMessage } from "@/app/lib/utils/errors";

export const runtime = "nodejs";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    try {
        const { id } = await params;
        const body = await req.json();
        const note = await updateNote(id, body.title || "Untitled", body.response || "");
        return NextResponse.json({ note });
    } catch (error: unknown) {
        return NextResponse.json({ error: getErrorMessage(error, "Failed to update note.") }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    try {
        const { id } = await params;
        await deleteNote(id);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json({ error: getErrorMessage(error, "Failed to delete note.") }, { status: 500 });
    }
}
