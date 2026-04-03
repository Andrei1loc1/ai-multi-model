import { NextRequest, NextResponse } from "next/server";
import { createNote, listNotes } from "@/app/lib/workspaces/service";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import { getErrorMessage } from "@/app/lib/utils/errors";

export const runtime = "nodejs";

export async function GET() {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ notes: [] });
    }

    try {
        const notes = await listNotes();
        return NextResponse.json({ notes });
    } catch (error: unknown) {
        return NextResponse.json({ error: getErrorMessage(error, "Failed to load notes.") }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    try {
        const body = await req.json();
        if (!body?.title?.trim() || !body?.response?.trim()) {
            return NextResponse.json({ error: "Title and response are required." }, { status: 400 });
        }

        const note = await createNote(body.title.trim(), body.response.trim());
        return NextResponse.json({ note }, { status: 201 });
    } catch (error: unknown) {
        return NextResponse.json({ error: getErrorMessage(error, "Failed to create note.") }, { status: 500 });
    }
}
