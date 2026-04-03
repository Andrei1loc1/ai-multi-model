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
        const query = req.nextUrl.searchParams.get("query") || "";
        const intent = req.nextUrl.searchParams.get("intent") || "chat";
        if (!query.trim()) {
            return NextResponse.json({ context: [], intent });
        }

        const context = await searchWorkspaceContext(id, query, intent === "coding" ? 10 : 6);
        return NextResponse.json({ context, intent });
    } catch (error: unknown) {
        return NextResponse.json({ error: getErrorMessage(error, "Failed to get workspace context.") }, { status: 500 });
    }
}
