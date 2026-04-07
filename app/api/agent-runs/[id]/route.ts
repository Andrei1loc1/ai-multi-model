import { NextRequest, NextResponse } from "next/server";
import { getAgentRunSnapshot } from "@/app/lib/agents/events";

export const runtime = "nodejs";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const run = getAgentRunSnapshot(id);

    if (!run) {
        return NextResponse.json({ error: "Agent run not found." }, { status: 404 });
    }

    return NextResponse.json({ run });
}
