import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import { uploadDocumentAssetFromDataUrl } from "@/app/lib/documents/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json(
            { error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY." },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        if (!body?.fileName?.trim() || !body?.dataUrl) {
            return NextResponse.json({ error: "fileName and dataUrl are required." }, { status: 400 });
        }

        const asset = await uploadDocumentAssetFromDataUrl({
            fileName: body.fileName,
            dataUrl: body.dataUrl,
            workspaceId: body.workspaceId || null,
            conversationId: body.conversationId || null,
        });

        return NextResponse.json({ asset });
    } catch (error) {
        console.error("Document upload error:", error);
        const message = error instanceof Error ? error.message : "Failed to upload document.";
        const status = message.includes("exceeds") || message.includes("Unsupported") ? 400 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}