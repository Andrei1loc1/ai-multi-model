import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import {
    analyzeImageAttachment,
    getImageAttachmentByContentHash,
    getImageAnalysisCache,
    fetchImageAttachment,
} from "@/app/lib/images/service";
import { getErrorMessage, getErrorStatus } from "@/app/lib/utils/errors";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    try {
        const body = await req.json();
        const attachmentId = typeof body?.attachmentId === "string" ? body.attachmentId.trim() : "";
        const contentHash = typeof body?.contentHash === "string" ? body.contentHash.trim() : "";

        if (attachmentId) {
            const result = await analyzeImageAttachment(attachmentId);
            return NextResponse.json(result, { status: 200 });
        }

        if (contentHash) {
            const attachment = await getImageAttachmentByContentHash(contentHash);
            const cache = await getImageAnalysisCache(contentHash);
            if (attachment) {
                const result = cache ? await fetchImageAttachment(attachment.id) : await analyzeImageAttachment(attachment.id);
                return NextResponse.json(result, { status: 200 });
            }

            if (cache) {
                return NextResponse.json({ attachment: null, cache, cached: true, signedUrl: null }, { status: 200 });
            }

            return NextResponse.json(
                { error: "No attachment was found for that hash and no cached analysis exists yet." },
                { status: 404 }
            );
        }

        return NextResponse.json({ error: "attachmentId or contentHash is required." }, { status: 400 });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: getErrorMessage(error, "Failed to analyze image.") },
            { status: getErrorStatus(error) }
        );
    }
}
