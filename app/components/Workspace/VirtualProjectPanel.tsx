"use client";

import { Download, Play, Sparkles } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import VirtualCodeViewer from "@/app/components/Workspace/VirtualCodeViewer";
import VirtualFileTree from "@/app/components/Workspace/VirtualFileTree";
import VirtualProjectPreview, {
    type VirtualProjectPreviewStatus,
} from "@/app/components/Workspace/VirtualProjectPreview";
import type { VirtualProject } from "@/app/lib/workspaces/types";

export type VirtualProjectTab = "overview" | "files" | "preview" | "logs";

function formatKind(kind: string) {
    return kind === "react-app" ? "React app" : "Python script";
}

function formatPreviewMode(mode: string) {
    return mode === "pyodide" ? "Pyodide" : "Browser React";
}

function formatStatus(status: string) {
    if (status === "ready") return "Ready";
    if (status === "running") return "Running";
    if (status === "error") return "Error";
    return "Draft";
}

function TabButton({
    active,
    children,
    onClick,
}: {
    active: boolean;
    children: ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] transition ${
                active
                    ? "bg-cyan-300/18 text-white"
                    : "text-slate-400 hover:bg-white/6 hover:text-slate-200"
            }`}
        >
            {children}
        </button>
    );
}

export default function VirtualProjectPanel({
    project,
    activeTab,
    onTabChange,
    selectedFilePath,
    onSelectedFilePathChange,
    previewStatus,
    previewLogs,
    previewElement,
    onRun,
    onDownload,
}: {
    project: VirtualProject | null;
    activeTab: VirtualProjectTab;
    onTabChange: (tab: VirtualProjectTab) => void;
    selectedFilePath: string | null;
    onSelectedFilePathChange: (path: string | null) => void;
    previewStatus: VirtualProjectPreviewStatus;
    previewLogs: string[];
    previewElement?: ReactNode;
    onRun: () => void;
    onDownload: () => void;
}) {
    const selectedFile = useMemo(
        () => project?.files.find((file) => file.path === selectedFilePath) || null,
        [project, selectedFilePath]
    );

    return (
        <div className="rounded-[28px] border border-white/8 bg-slate-950/72 p-4 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-2xl">
            <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-200/60">Virtual project</p>
                    <div className="mt-1 flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-white">
                            {project?.title || "No project loaded"}
                        </h3>
                        {project && (
                            <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                                {formatStatus(project.status)}
                            </span>
                        )}
                    </div>
                    {project && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            <span>{formatKind(project.kind)}</span>
                            <span>|</span>
                            <span>{formatPreviewMode(project.previewMode)}</span>
                            <span>|</span>
                            <span>{project.files.length} files</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={onRun}
                        disabled={!project}
                        className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-medium text-cyan-100 transition hover:bg-cyan-300/18 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Play size={14} />
                        Run
                    </button>
                    <button
                        type="button"
                        onClick={onDownload}
                        disabled={!project}
                        className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Download size={14} />
                        Download ZIP
                    </button>
                </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-1.5 rounded-full border border-white/6 bg-white/[0.03] p-1">
                <TabButton active={activeTab === "overview"} onClick={() => onTabChange("overview")}>
                    Overview
                </TabButton>
                <TabButton active={activeTab === "files"} onClick={() => onTabChange("files")}>
                    Files
                </TabButton>
                <TabButton active={activeTab === "preview"} onClick={() => onTabChange("preview")}>
                    Preview
                </TabButton>
                <TabButton active={activeTab === "logs"} onClick={() => onTabChange("logs")}>
                    Logs
                </TabButton>
            </div>

            {!project ? (
                <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-8 text-sm text-slate-400">
                    Virtual project artifacts appear here after Agent mode generates a runnable project.
                </div>
            ) : (
                <div className="space-y-4">
                    {activeTab === "overview" && (
                        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                            <div className="space-y-3 rounded-[22px] border border-white/6 bg-white/[0.03] p-4">
                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                                    <Sparkles size={12} />
                                    Summary
                                </div>
                                <div className="text-sm leading-6 text-white">{project.prompt}</div>
                                <div className="rounded-[20px] border border-cyan-300/10 bg-cyan-300/[0.08] p-4 text-sm leading-6 text-white">
                                    {project.kind === "react-app"
                                        ? "This project is set up as a browser-safe React mini app."
                                        : "This project is set up as a browser-safe Python script."}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="rounded-[22px] border border-white/6 bg-white/[0.03] p-4">
                                    <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                                        Details
                                    </div>
                                    <div className="space-y-2 text-sm text-slate-200">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-slate-400">Entry file</span>
                                            <span className="truncate text-right font-medium text-white">
                                                {project.entryFile}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-slate-400">Workspace</span>
                                            <span className="truncate text-right font-medium text-white">
                                                {project.workspaceId || "Standalone"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-slate-400">Conversation</span>
                                            <span className="truncate text-right font-medium text-white">
                                                {project.conversationId}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[22px] border border-white/6 bg-white/[0.03] p-4">
                                    <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                                        Latest run
                                    </div>
                                    {project.lastRunSummary ? (
                                        <div className="space-y-2 text-sm text-slate-200">
                                            {project.lastRunSummary.stdout && (
                                                <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.08] px-3 py-2 leading-6 text-white">
                                                    {project.lastRunSummary.stdout}
                                                </div>
                                            )}
                                            {project.lastRunSummary.stderr && (
                                                <div className="rounded-2xl border border-red-300/10 bg-red-300/[0.08] px-3 py-2 leading-6 text-white">
                                                    {project.lastRunSummary.stderr}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-sm leading-6 text-slate-400">
                                            Run the project to capture execution details.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "files" && (
                        <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
                            <VirtualFileTree
                                files={project.files}
                                selectedPath={selectedFilePath}
                                onSelectPath={onSelectedFilePathChange}
                            />
                            <VirtualCodeViewer
                                path={selectedFile?.path || null}
                                language={selectedFile?.language || null}
                                content={selectedFile?.content || null}
                                emptyLabel="Pick a file from the tree to inspect the generated source."
                            />
                        </div>
                    )}

                    {activeTab === "preview" && (
                        <VirtualProjectPreview
                            project={project}
                            status={previewStatus}
                            logs={previewLogs}
                            previewElement={previewElement}
                        />
                    )}

                    {activeTab === "logs" && (
                        <div className="space-y-3">
                            <div className="rounded-[22px] border border-white/6 bg-white/[0.03] p-4">
                                <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                                    Runtime status
                                </div>
                                <div className="text-sm leading-6 text-slate-200">
                                    {previewStatus === "error"
                                        ? "The latest preview run failed."
                                        : previewStatus === "running"
                                        ? "The project is currently running."
                                        : previewStatus === "loading"
                                        ? "The runtime is loading."
                                        : "The project is ready for preview."}
                                </div>
                            </div>

                            <VirtualProjectPreview
                                project={project}
                                status={previewStatus}
                                logs={previewLogs}
                                previewElement={previewElement}
                                emptyLabel="Logs are displayed here alongside the latest runtime summary."
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
