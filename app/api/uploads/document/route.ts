import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import { uploadDocumentAssetFromStoragePath } from "@/app/lib/documents/service";

export const runtime = "nodejs";
export const maxDuration = 60;

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "50mb",
        },
    },
};

export async function POST(req: NextRequest) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json(
            { error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY." },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        if (!body?.fileName?.trim() || !body?.storagePath) {
            return NextResponse.json({ error: "fileName and storagePath are required." }, { status: 400 });
        }

        const asset = await uploadDocumentAssetFromStoragePath({
            fileName: body.fileName,
            storagePath: body.storagePath,
            mimeType: body.mimeType || "application/pdf",
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