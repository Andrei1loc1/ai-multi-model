"use client";

import { AlertTriangle, CheckCircle2, Clock3, Play, Terminal } from "lucide-react";
import type { ReactNode } from "react";
import type { VirtualProject, VirtualProjectRunSummary } from "@/app/lib/workspaces/types";

export type VirtualProjectPreviewStatus = "idle" | "loading" | "ready" | "running" | "error";

function StatusChip({ status }: { status: VirtualProjectPreviewStatus }) {
    const styles: Record<VirtualProjectPreviewStatus, string> = {
        idle: "border-white/8 bg-white/[0.04] text-slate-300",
        loading: "border-cyan-300/15 bg-cyan-300/[0.10] text-cyan-100",
        ready: "border-emerald-300/15 bg-emerald-300/[0.10] text-emerald-100",
        running: "border-amber-300/15 bg-amber-300/[0.10] text-amber-100",
        error: "border-red-300/15 bg-red-300/[0.10] text-red-100",
    };

    const labels: Record<VirtualProjectPreviewStatus, string> = {
        idle: "idle",
        loading: "loading",
        ready: "ready",
        running: "running",
        error: "error",
    };

    const iconMap: Record<VirtualProjectPreviewStatus, ReactNode> = {
        idle: <Clock3 size={12} />,
        loading: <Play size={12} />,
        ready: <CheckCircle2 size={12} />,
        running: <Terminal size={12} />,
        error: <AlertTriangle size={12} />,
    };

    return (
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${styles[status]}`}>
            {iconMap[status]}
            {labels[status]}
        </div>
    );
}

function RunSummaryCard({ summary }: { summary: VirtualProjectRunSummary | null }) {
    if (!summary) {
        return (
            <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-slate-400">
                No run results yet. Use <span className="text-slate-200">Run</span> to evaluate the preview.
            </div>
        );
    }

    return (
        <div className="space-y-2 rounded-[20px] border border-white/6 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                <Terminal size={12} />
                Latest run
            </div>
            {summary.stdout && (
                <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.08] p-3 text-sm leading-6 text-white">
                    <div className="mb-1 text-[9px] uppercase tracking-[0.22em] text-emerald-100/80">stdout</div>
                    {summary.stdout}
                </div>
            )}
            {summary.stderr && (
                <div className="rounded-2xl border border-red-300/10 bg-red-300/[0.08] p-3 text-sm leading-6 text-white">
                    <div className="mb-1 text-[9px] uppercase tracking-[0.22em] text-red-100/80">stderr</div>
                    {summary.stderr}
                </div>
            )}
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {summary.durationMs ? `${summary.durationMs} ms` : "Duration unavailable"}
            </div>
        </div>
    );
}

export default function VirtualProjectPreview({
    project,
    status,
    logs,
    previewElement,
    emptyLabel = "Preview will appear here once the runtime is connected.",
}: {
    project: VirtualProject | null;
    status: VirtualProjectPreviewStatus;
    logs: string[];
    previewElement?: ReactNode;
    emptyLabel?: string;
}) {
    if (!project) {
        return (
            <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                No virtual project is loaded yet.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Preview</div>
                    <div className="mt-1 text-sm font-medium text-white">{project.title}</div>
                </div>
                <StatusChip status={status} />
            </div>

            <div className="rounded-[24px] border border-white/8 bg-slate-950/70 p-3 shadow-[0_18px_60px_rgba(2,6,23,0.38)]">
                {previewElement ? (
                    previewElement
                ) : (
                    <div className="flex min-h-[280px] items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.08),transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.82),rgba(2,6,23,0.7))] p-6 text-center">
                        <div className="max-w-sm">
                            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.12] text-cyan-100">
                                <Play size={18} />
                            </div>
                            <h4 className="text-lg font-semibold text-white">Runtime placeholder</h4>
                            <p className="mt-2 text-sm leading-6 text-slate-400">{emptyLabel}</p>
                        </div>
                    </div>
                )}
            </div>

            {logs.length > 0 ? (
                <div className="space-y-2 rounded-[20px] border border-white/6 bg-white/[0.03] p-4">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Recent logs</div>
                    <div className="space-y-1.5">
                        {logs.map((line, index) => (
                            <div
                                key={`${project.id}-log-${index}`}
                                className="rounded-2xl border border-white/6 bg-slate-950/55 px-3 py-2 text-sm leading-6 text-slate-200"
                            >
                                {line}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-slate-400">
                    No logs yet. Run the project to capture preview output and runtime notes.
                </div>
            )}

            <RunSummaryCard summary={project.lastRunSummary} />
        </div>
    );
}
