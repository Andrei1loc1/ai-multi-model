import React from "react";

type AgentPayload = {
    understanding: string;
    files_used: string[];
    proposed_changes: string[];
    patch_or_code: string;
    risks: string[];
    next_step: string;
} | null;

export default function AgentPanel({
    agent,
    tab,
    onTabChange,
}: {
    agent: AgentPayload;
    tab: "plan" | "files" | "patch" | "output";
    onTabChange: (tab: "plan" | "files" | "patch" | "output") => void;
}) {
    const tabs: Array<"plan" | "files" | "patch" | "output"> = ["plan", "files", "patch", "output"];

    return (
        <div className="rounded-[28px] border border-white/8 bg-slate-950/72 p-4 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-2xl">
            <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Agent mode</p>
                    <h3 className="text-base font-semibold text-white">Execution view</h3>
                </div>
                <div className="flex flex-wrap gap-1.5 rounded-full border border-white/6 bg-white/[0.03] p-1">
                    {tabs.map((item) => (
                        <button
                            key={item}
                            onClick={() => onTabChange(item)}
                            className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] transition ${
                                tab === item
                                    ? "bg-violet-300/20 text-violet-100"
                                    : "text-slate-400 hover:bg-white/6"
                            }`}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </div>

            {!agent && (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-slate-400">
                    Agent artifacts appear here when you run a request in Agent mode.
                </div>
            )}

            {agent && tab === "plan" && (
                <div className="space-y-3">
                    <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4 text-[13px] leading-6 text-white">
                        {agent.understanding}
                    </div>
                    <div className="space-y-1.5">
                        {agent.proposed_changes.map((item, index) => (
                            <div key={index} className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.08] px-4 py-3 text-[13px] leading-5 text-cyan-50">
                                {item}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {agent && tab === "files" && (
                <div className="space-y-1.5">
                    {agent.files_used.length ? agent.files_used.map((file) => (
                        <div key={file} className="rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3 text-[13px] text-white">
                            {file}
                        </div>
                    )) : (
                        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-slate-400">
                            No repo files were used for this response.
                        </div>
                    )}
                </div>
            )}

            {agent && tab === "patch" && (
                <pre className="rounded-2xl border border-white/6 bg-slate-950/90 p-4 text-[12px] leading-5 text-slate-200 overflow-x-auto whitespace-pre-wrap">
                    {agent.patch_or_code}
                </pre>
            )}

            {agent && tab === "output" && (
                <div className="space-y-3">
                    <div className="rounded-2xl border border-amber-300/10 bg-amber-300/[0.08] p-4">
                        <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-amber-100/80">Risks</div>
                        <ul className="list-disc list-inside space-y-1 text-[13px] leading-5 text-white">
                            {agent.risks.map((risk, index) => (
                                <li key={index}>{risk}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.08] p-4 text-[13px] leading-5 text-white">
                        {agent.next_step}
                    </div>
                </div>
            )}
        </div>
    );
}
