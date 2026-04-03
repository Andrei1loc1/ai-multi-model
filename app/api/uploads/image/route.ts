import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import { uploadImageAssetFromDataUrl } from "@/app/lib/images/service";
import { getErrorMessage } from "@/app/lib/utils/errors";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    try {
        const body = await req.json();
        if (!body?.fileName?.trim() || !body?.dataUrl?.trim()) {
            return NextResponse.json({ error: "fileName and dataUrl are required." }, { status: 400 });
        }

        const asset = await uploadImageAssetFromDataUrl({
            fileName: body.fileName,
            dataUrl: body.dataUrl,
            workspaceId: body.workspaceId || null,
            conversationId: body.conversationId || null,
        });

        return NextResponse.json({ asset });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: getErrorMessage(error, "Failed to upload image.") },
            { status: 500 }
        );
    }
}
