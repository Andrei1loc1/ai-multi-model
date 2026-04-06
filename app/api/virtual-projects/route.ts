import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/app/lib/database/supabase";
import { getErrorMessage } from "@/app/lib/utils/errors";
import {
    createVirtualProject,
} from "@/app/lib/workspaces/service";
import {
    validateVirtualProjectPayload,
} from "@/app/lib/virtualProjects/validate";
import type { VirtualProjectPayload, VirtualProjectRunSummary, VirtualProjectSummary } from "@/app/lib/workspaces/types";

export const runtime = "nodejs";

function toProjectPayload(body: Record<string, unknown>): VirtualProjectPayload {
    return {
        kind: body.kind === "python-script" ? "python-script" : "react-app",
        title: typeof body.title === "string" ? body.title : "Virtual project",
        summary: typeof body.summary === "string" ? body.summary : "",
        entryFile: typeof body.entryFile === "string" ? body.entryFile : "src/App.tsx",
        previewMode: body.previewMode === "pyodide" ? "pyodide" : "react",
        files: Array.isArray(body.files)
            ? body.files
                  .map((file) => {
                      const entry = file as Record<string, unknown>;
                      return {
                          path: typeof entry.path === "string" ? entry.path : "",
                          language: typeof entry.language === "string" ? entry.language : "text",
                          content: typeof entry.content === "string" ? entry.content : "",
                      };
                  })
                  .filter((file) => file.path.length > 0)
            : [],
    };
}

async function getLatestProjectSummary(params: { conversationId?: string | null; workspaceId?: string | null }) {
    const supabase = getSupabaseServerClient();
    let query = supabase.from("virtual_projects").select("*").order("updated_at", { ascending: false }).limit(1);

    if (params.conversationId) {
        query = query.eq("conversation_id", params.conversationId);
    } else if (params.workspaceId) {
        query = query.eq("workspace_id", params.workspaceId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    const { count, error: countError } = await supabase
        .from("virtual_project_files")
        .select("id", { count: "exact", head: true })
        .eq("project_id", data.id);
    if (countError) throw new Error(countError.message);

    return {
        id: data.id,
        workspaceId: data.workspace_id,
        conversationId: data.conversation_id,
        sourceMessageId: data.source_message_id,
        kind: data.kind,
        title: data.title,
        prompt: data.prompt,
        status: data.status,
        entryFile: data.entry_file,
        previewMode: data.preview_mode,
        fileCount: count || 0,
        manifest: data.manifest_json || {},
        lastRunSummary: data.last_run_summary || null,
        lastError: data.last_error,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    } satisfies VirtualProjectSummary;
}

export async function GET(req: NextRequest) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const conversationId = searchParams.get("conversationId");
        const workspaceId = searchParams.get("workspaceId");

        if (!conversationId && !workspaceId) {
            return NextResponse.json(
                { error: "conversationId or workspaceId is required." },
                { status: 400 }
            );
        }

        const project = await getLatestProjectSummary({ conversationId, workspaceId });
        return NextResponse.json({ project });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: getErrorMessage(error, "Failed to load virtual project.") },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    try {
        const body = (await req.json()) as Record<string, unknown>;
        if (typeof body.conversationId !== "string" || !body.conversationId.trim()) {
            return NextResponse.json({ error: "conversationId is required." }, { status: 400 });
        }

        const payload = validateVirtualProjectPayload(toProjectPayload(body));
        const project = await createVirtualProject({
            workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : null,
            conversationId: body.conversationId,
            sourceMessageId: typeof body.sourceMessageId === "string" ? body.sourceMessageId : null,
            kind: payload.project.kind,
            title: payload.project.title,
            prompt: typeof body.prompt === "string" && body.prompt.trim() ? body.prompt : payload.project.summary,
            status: typeof body.status === "string" ? (body.status as "ready" | "running" | "error") : "ready",
            entryFile: payload.project.entryFile,
            previewMode: payload.project.previewMode,
            manifest: (typeof body.manifest === "object" && body.manifest) ? (body.manifest as Record<string, unknown>) : {},
            lastRunSummary:
                typeof body.lastRunSummary === "object" && body.lastRunSummary
                    ? (body.lastRunSummary as VirtualProjectRunSummary)
                    : null,
            lastError: typeof body.lastError === "string" ? body.lastError : null,
            files: payload.project.files.map((file) => ({
                ...file,
                isEntry: file.path === payload.project.entryFile,
            })),
        });

        return NextResponse.json({ project }, { status: 201 });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: getErrorMessage(error, "Failed to create virtual project.") },
            { status: 500 }
        );
    }
}
