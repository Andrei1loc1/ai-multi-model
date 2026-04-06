import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import { getErrorMessage } from "@/app/lib/utils/errors";
import {
    getVirtualProjectWithFiles,
    replaceVirtualProjectFiles,
    updateVirtualProject,
} from "@/app/lib/workspaces/service";
import { validateVirtualProjectPayload } from "@/app/lib/virtualProjects/validate";
import type { VirtualProjectPayload, VirtualProjectRunSummary } from "@/app/lib/workspaces/types";

export const runtime = "nodejs";

function toProjectPayload(
    body: Record<string, unknown>,
    fallback: {
        kind: "react-app" | "python-script";
        title: string;
        summary: string;
        entryFile: string;
        previewMode: "react" | "pyodide";
    }
): VirtualProjectPayload {
    return {
        kind: body.kind === "python-script" ? "python-script" : fallback.kind,
        title: typeof body.title === "string" ? body.title : fallback.title,
        summary: typeof body.summary === "string" ? body.summary : fallback.summary,
        entryFile: typeof body.entryFile === "string" ? body.entryFile : fallback.entryFile,
        previewMode: body.previewMode === "pyodide" ? "pyodide" : fallback.previewMode,
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

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    try {
        const { id } = await context.params;
        const project = await getVirtualProjectWithFiles(id);

        if (!project) {
            return NextResponse.json({ error: "Virtual project not found." }, { status: 404 });
        }

        return NextResponse.json({ project });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: getErrorMessage(error, "Failed to load virtual project.") },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    try {
        const { id } = await context.params;
        const existingProject = await getVirtualProjectWithFiles(id);

        if (!existingProject) {
            return NextResponse.json({ error: "Virtual project not found." }, { status: 404 });
        }

        const body = (await req.json()) as Record<string, unknown>;
        const requestedFiles = Array.isArray(body.files) ? body.files : null;
        const requestedEntryFile =
            typeof body.entryFile === "string" && body.entryFile.trim()
                ? body.entryFile
                : existingProject.entryFile;

        if (requestedFiles) {
            const payload = validateVirtualProjectPayload(
                toProjectPayload(body, {
                    kind: existingProject.kind,
                    title: existingProject.title,
                    summary: existingProject.prompt,
                    entryFile: requestedEntryFile,
                    previewMode: existingProject.previewMode,
                })
            );

            await replaceVirtualProjectFiles(
                id,
                payload.project.files.map((file) => ({
                    ...file,
                    isEntry: file.path === payload.project.entryFile,
                }))
            );
        }

        const project = await updateVirtualProject(id, {
            sourceMessageId:
                typeof body.sourceMessageId === "string" ? body.sourceMessageId : undefined,
            title: typeof body.title === "string" ? body.title : undefined,
            prompt: typeof body.prompt === "string" ? body.prompt : undefined,
            status:
                body.status === "ready" || body.status === "running" || body.status === "error"
                    ? body.status
                    : undefined,
            entryFile: typeof body.entryFile === "string" ? body.entryFile : undefined,
            previewMode:
                body.previewMode === "react" || body.previewMode === "pyodide"
                    ? body.previewMode
                    : undefined,
            manifest:
                typeof body.manifest === "object" && body.manifest
                    ? (body.manifest as Record<string, unknown>)
                    : undefined,
            lastRunSummary:
                typeof body.lastRunSummary === "object" && body.lastRunSummary
                    ? (body.lastRunSummary as VirtualProjectRunSummary)
                    : undefined,
            lastError: typeof body.lastError === "string" ? body.lastError : undefined,
        });

        if (!project) {
            return NextResponse.json({ error: "Virtual project not found." }, { status: 404 });
        }

        return NextResponse.json({ project });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: getErrorMessage(error, "Failed to update virtual project.") },
            { status: 500 }
        );
    }
}
