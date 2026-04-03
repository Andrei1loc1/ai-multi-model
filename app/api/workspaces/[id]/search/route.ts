import { NextRequest, NextResponse } from "next/server";
import { searchWorkspaceContext } from "@/app/lib/workspaces/service";
import { getErrorMessage } from "@/app/lib/utils/errors";

export const runtime = "nodejs";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const query = req.nextUrl.searchParams.get("q") || "";
        if (!query.trim()) {
            return NextResponse.json({ results: [] });
        }

        const results = await searchWorkspaceContext(id, query, 12);
        return NextResponse.json({ results });
    } catch (error: unknown) {
        return NextResponse.json({ error: getErrorMessage(error, "Failed to search workspace.") }, { status: 500 });
    }
}
