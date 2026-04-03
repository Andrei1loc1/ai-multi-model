import React from "react";

type ContextSource = {
    type: string;
    label: string;
    score: number;
};

type MemoryWrite = {
    kind: string;
    content: string;
};

export default function ContextPanel({
    modelProfile,
    modelId,
    modelWhy,
    contextSources,
    memoryWrites,
}: {
    modelProfile?: string;
    modelId?: string;
    modelWhy?: string;
    contextSources: ContextSource[];
    memoryWrites: MemoryWrite[];
}) {
    return (
        <div className="rounded-[28px] border border-white/8 bg-slate-950/72 p-4 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-2xl">
            <div className="mb-3">
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Context Engine</p>
                <h3 className="text-base font-semibold text-white">Why this answer</h3>
            </div>

            <div className="rounded-[22px] border border-cyan-300/12 bg-cyan-300/[0.08] p-3 mb-3">
                <div className="text-sm font-medium text-cyan-100">{modelId || "No model selected yet"}</div>
                <div className="mt-1 text-[11px] leading-5 text-cyan-50/75">
                    <span className="font-medium text-cyan-50/90">Profile:</span> {modelProfile || "-"}
                    {modelWhy ? ` • ${modelWhy}` : ""}
                </div>
            </div>

            <div className="mb-3">
                <div className="mb-2 text-[11px] uppercase tracking-[0.25em] text-slate-400">Used context</div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {contextSources.length ? contextSources.map((source, index) => (
                        <div key={`${source.label}-${index}`} className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[13px] text-white line-clamp-2 leading-5">{source.label}</span>
                                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                                    {source.type}
                                </span>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">score {source.score.toFixed(1)}</div>
                        </div>
                    )) : (
                        <div className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-xs leading-5 text-slate-400">
                            No memory or repo context has been injected yet.
                        </div>
                    )}
                </div>
            </div>

            <div>
                <div className="mb-2 text-[11px] uppercase tracking-[0.25em] text-slate-400">Memory writes</div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {memoryWrites.length ? memoryWrites.map((entry, index) => (
                        <div key={`${entry.kind}-${index}`} className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.08] px-3 py-2.5">
                            <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/75">{entry.kind}</div>
                            <div className="mt-1 text-[13px] leading-5 text-white">{entry.content}</div>
                        </div>
                    )) : (
                        <div className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-xs leading-5 text-slate-400">
                            Durable memory entries will show up here after the assistant identifies stable facts.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
