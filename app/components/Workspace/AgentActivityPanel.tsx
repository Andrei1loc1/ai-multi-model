"use client";

import { AlertTriangle, CheckCircle2, Clock3, RefreshCcw, Sparkles, Wrench } from "lucide-react";
import { memo, useMemo } from "react";
import type { AgentRunEvent, AgentRunReference, AgentRunSnapshot } from "@/app/lib/workspaces/types";

function formatPhase(phase: string) {
    return phase.replace(/-/g, " ");
}

function StatusChip({ status }: { status: string }) {
    const classes =
        status === "completed"
            ? "border-emerald-300/15 bg-emerald-300/[0.10] text-emerald-100"
            : status === "failed"
            ? "border-red-300/15 bg-red-300/[0.10] text-red-100"
            : "border-cyan-300/15 bg-cyan-300/[0.10] text-cyan-100";

    return (
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${classes}`}>
            {status === "completed" ? <CheckCircle2 size={12} /> : status === "failed" ? <AlertTriangle size={12} /> : <Clock3 size={12} />}
            {status}
        </div>
    );
}

function AgentActivityPanel({
    run,
    events,
    title = "Agent activity",
    compact = false,
}: {
    run: AgentRunReference | AgentRunSnapshot | null;
    events: AgentRunEvent[];
    title?: string;
    compact?: boolean;
}) {
    const fileEvents = useMemo(
        () =>
            [...events]
                .reverse()
                .filter((event) => event.type === "file_touched" && event.filePath)
                .filter((event, index, current) => current.findIndex((candidate) => candidate.filePath === event.filePath) === index)
                .slice(0, compact ? 4 : 6),
        [compact, events]
    );

    const validatorEvents = useMemo(
        () =>
            [...events]
                .reverse()
                .filter((event) => event.type === "validator_result" && event.validator)
                .slice(0, compact ? 4 : 5),
        [compact, events]
    );

    const recentEvents = useMemo(() => [...events].slice(-(compact ? 4 : 6)).reverse(), [compact, events]);

    return (
        <div
            className={`border border-white/8 bg-slate-950/72 ${
                compact
                    ? "rounded-[24px] p-3 shadow-[0_18px_50px_rgba(2,6,23,0.34)]"
                    : "rounded-[28px] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl"
            }`}
        >
            <div className={`flex flex-wrap items-center justify-between gap-3 ${compact ? "mb-3" : "mb-4"}`}>
                <div>
                    <div className="text-[10px] uppercase tracking-[0.35em] text-cyan-200/60">{title}</div>
                    <div className={`mt-1 font-semibold text-white ${compact ? "text-[15px]" : "text-base"}`}>
                        {run ? formatPhase(run.currentPhase) : "No active run"}
                    </div>
                </div>
                {run ? <StatusChip status={run.status} /> : null}
            </div>

            {!run ? (
                <div className={`rounded-[22px] border border-dashed border-white/10 text-slate-400 ${compact ? "px-4 py-6 text-[13px]" : "px-4 py-8 text-sm"}`}>
                    Agent runs will appear here once the event-driven pipeline starts.
                </div>
            ) : (
                <div className={`grid gap-3 ${compact ? "xl:grid-cols-1" : "xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"}`}>
                    <div className="space-y-3">
                        <div className={`rounded-[22px] border border-white/6 bg-white/[0.03] ${compact ? "p-3.5" : "p-4"}`}>
                            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                                <Sparkles size={12} />
                                Current run
                            </div>
                            <div className="space-y-2 text-sm text-slate-200">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-slate-400">Phase</span>
                                    <span className="font-medium text-white">{formatPhase(run.currentPhase)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-slate-400">Retry count</span>
                                    <span className="font-medium text-white">{run.retryCount}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-slate-400">Run id</span>
                                    <span className="truncate font-medium text-white">{run.id}</span>
                                </div>
                            </div>
                        </div>

                        <div className={`rounded-[22px] border border-white/6 bg-white/[0.03] ${compact ? "p-3.5" : "p-4"}`}>
                            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                                <Wrench size={12} />
                                Touched files
                            </div>
                            {fileEvents.length ? (
                                <div className="space-y-2">
                                    {fileEvents.map((event) => (
                                        <div
                                            key={event.id}
                                            className="rounded-2xl border border-white/8 bg-slate-950/55 px-3 py-2 text-sm text-slate-200"
                                        >
                                            {event.filePath}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm leading-6 text-slate-400">No file updates yet.</div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className={`rounded-[22px] border border-white/6 bg-white/[0.03] ${compact ? "p-3.5" : "p-4"}`}>
                            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                                <CheckCircle2 size={12} />
                                Validator results
                            </div>
                            {validatorEvents.length ? (
                                <div className="space-y-2">
                                    {validatorEvents.map((event) => (
                                        <div
                                            key={event.id}
                                            className={`rounded-2xl border px-3 py-2 text-sm ${
                                                event.validator?.status === "failed"
                                                    ? "border-red-300/10 bg-red-300/[0.08] text-white"
                                                    : event.validator?.status === "passed"
                                                    ? "border-emerald-300/10 bg-emerald-300/[0.08] text-white"
                                                    : "border-white/8 bg-white/[0.04] text-slate-200"
                                            }`}
                                        >
                                            {event.validator?.message}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm leading-6 text-slate-400">No validator output yet.</div>
                            )}
                        </div>

                        <div className={`rounded-[22px] border border-white/6 bg-white/[0.03] ${compact ? "p-3.5" : "p-4"}`}>
                            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                                <RefreshCcw size={12} />
                                Recent events
                            </div>
                            {recentEvents.length ? (
                                <div className="space-y-2">
                                    {recentEvents.map((event) => (
                                        <div
                                            key={event.id}
                                            className="rounded-2xl border border-white/8 bg-slate-950/55 px-3 py-2 text-sm text-slate-200"
                                        >
                                            {event.summary || formatPhase(event.type)}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm leading-6 text-slate-400">The live timeline is still empty.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function areValidatorEqual(previous: AgentRunEvent["validator"], next: AgentRunEvent["validator"]) {
    return (
        previous === next ||
        (!!previous &&
            !!next &&
            previous.status === next.status &&
            previous.message === next.message)
    );
}

function areEventsEqual(previousEvents: AgentRunEvent[], nextEvents: AgentRunEvent[]) {
    if (previousEvents === nextEvents) {
        return true;
    }

    if (previousEvents.length !== nextEvents.length) {
        return false;
    }

    for (let index = 0; index < previousEvents.length; index += 1) {
        const previous = previousEvents[index];
        const next = nextEvents[index];

        if (
            previous === next ||
            (previous.id === next.id &&
                previous.type === next.type &&
                previous.summary === next.summary &&
                previous.filePath === next.filePath &&
                areValidatorEqual(previous.validator, next.validator))
        ) {
            continue;
        }

        return false;
    }

    return true;
}

function areRunEqual(previousRun: AgentRunReference | AgentRunSnapshot | null, nextRun: AgentRunReference | AgentRunSnapshot | null) {
    if (previousRun === nextRun) {
        return true;
    }

    if (!previousRun || !nextRun) {
        return previousRun === nextRun;
    }

    return (
        previousRun.id === nextRun.id &&
        previousRun.status === nextRun.status &&
        previousRun.currentPhase === nextRun.currentPhase &&
        previousRun.retryCount === nextRun.retryCount
    );
}

function areEqual(
    prevProps: {
        run: AgentRunReference | AgentRunSnapshot | null;
        events: AgentRunEvent[];
        title?: string;
        compact?: boolean;
    },
    nextProps: {
        run: AgentRunReference | AgentRunSnapshot | null;
        events: AgentRunEvent[];
        title?: string;
        compact?: boolean;
    }
) {
    return (
        prevProps.title === nextProps.title &&
        prevProps.compact === nextProps.compact &&
        areRunEqual(prevProps.run, nextProps.run) &&
        areEventsEqual(prevProps.events, nextProps.events)
    );
}

export default memo(AgentActivityPanel, areEqual);
