import { NextRequest, NextResponse } from "next/server";
import { connectGitHubRepo } from "@/app/lib/workspaces/service";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import { getErrorMessage } from "@/app/lib/utils/errors";

export const runtime = "nodejs";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    try {
        const { id } = await params;
        const body = await req.json();
        if (!body?.repoUrl?.trim()) {
            return NextResponse.json({ error: "repoUrl is required." }, { status: 400 });
        }

        const repoConnection = await connectGitHubRepo(id, body.repoUrl);
        return NextResponse.json({ repoConnection });
    } catch (error: unknown) {
        return NextResponse.json({ error: getErrorMessage(error, "Failed to connect repo.") }, { status: 500 });
    }
}
