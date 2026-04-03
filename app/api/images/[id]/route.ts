import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import { fetchImageAttachment } from "@/app/lib/images/service";
import { getErrorMessage, getErrorStatus } from "@/app/lib/utils/errors";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    try {
        const { id } = await context.params;
        const result = await fetchImageAttachment(id);
        return NextResponse.json(result);
    } catch (error: unknown) {
        return NextResponse.json(
            { error: getErrorMessage(error, "Failed to load image attachment.") },
            { status: getErrorStatus(error) }
        );
    }
}
