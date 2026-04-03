import { NextResponse } from "next/server";
import { reindexWorkspaceRepo } from "@/app/lib/workspaces/service";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import { getErrorMessage } from "@/app/lib/utils/errors";

export const runtime = "nodejs";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    try {
        const { id } = await params;
        const result = await reindexWorkspaceRepo(id);
        return NextResponse.json(result);
    } catch (error: unknown) {
        return NextResponse.json({ error: getErrorMessage(error, "Failed to reindex repo.") }, { status: 500 });
    }
}
