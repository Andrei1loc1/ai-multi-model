import { NextRequest } from "next/server";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import { getErrorMessage } from "@/app/lib/utils/errors";
import { getVirtualProjectWithFiles } from "@/app/lib/workspaces/service";
import {
    buildVirtualProjectArchive,
    buildVirtualProjectArchiveFilename,
} from "@/app/lib/virtualProjects/archive";

export const runtime = "nodejs";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    if (!hasSupabaseConfig()) {
        return new Response("Supabase is not configured.", { status: 500 });
    }

    try {
        const { id } = await context.params;
        const project = await getVirtualProjectWithFiles(id);

        if (!project) {
            return new Response("Virtual project not found.", { status: 404 });
        }

        const archive = buildVirtualProjectArchive(project);
        const filename = buildVirtualProjectArchiveFilename(project);

        return new Response(archive, {
            status: 200,
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": String(archive.byteLength),
            },
        });
    } catch (error: unknown) {
        return new Response(getErrorMessage(error, "Failed to download virtual project."), {
            status: 500,
        });
    }
}
