import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import { getErrorMessage } from "@/app/lib/utils/errors";
import { deleteWorkspace } from "@/app/lib/workspaces/service";

export const runtime = "nodejs";

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    try {
        const { id } = await context.params;
        await deleteWorkspace(id);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: getErrorMessage(error, "Failed to delete workspace.") },
            { status: 500 }
        );
    }
}
