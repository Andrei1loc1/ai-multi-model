import { NextRequest, NextResponse } from "next/server";
import { createWorkspace, listConversations, listWorkspaces } from "@/app/lib/workspaces/service";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import { getErrorMessage } from "@/app/lib/utils/errors";

export const runtime = "nodejs";

export async function GET() {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ workspaces: [], conversations: [] });
    }

    try {
        const [workspaces, conversations] = await Promise.all([listWorkspaces(), listConversations()]);
        return NextResponse.json({ workspaces, conversations });
    } catch (error: unknown) {
        return NextResponse.json({ error: getErrorMessage(error, "Failed to load workspaces.") }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    try {
        const body = await req.json();
        if (!body?.name?.trim()) {
            return NextResponse.json({ error: "Workspace name is required." }, { status: 400 });
        }

        const workspace = await createWorkspace(body.name, body.description || null);
        return NextResponse.json({ workspace }, { status: 201 });
    } catch (error: unknown) {
        return NextResponse.json({ error: getErrorMessage(error, "Failed to create workspace.") }, { status: 500 });
    }
}
