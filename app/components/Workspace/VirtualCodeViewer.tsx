"use client";

import { Check, Copy, FileCode2 } from "lucide-react";
import { useMemo, useState } from "react";

export default function VirtualCodeViewer({
    path,
    language,
    content,
    emptyLabel = "Select a file to inspect its source.",
}: {
    path: string | null;
    language: string | null;
    content: string | null;
    emptyLabel?: string;
}) {
    const [copied, setCopied] = useState(false);

    const lines = useMemo(() => (content ? content.split(/\r?\n/) : []), [content]);

    const handleCopy = async () => {
        if (!content) {
            return;
        }

        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
        }
    };

    if (!path || !content) {
        return (
            <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                {emptyLabel}
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-[22px] border border-white/8 bg-[#09111f] shadow-[0_18px_60px_rgba(2,6,23,0.42)]">
            <div className="flex items-center justify-between gap-3 border-b border-white/8 bg-white/[0.03] px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <FileCode2 size={15} className="shrink-0 text-cyan-200/90" />
                    <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{path}</div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-slate-400">
                            {language || "text"}
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300 transition hover:bg-white/[0.08]"
                >
                    {copied ? <Check size={13} className="text-cyan-200" /> : <Copy size={13} />}
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>

            <div className="max-h-[420px] overflow-auto px-4 py-4">
                <div className="flex min-w-max flex-col gap-0.5 font-mono text-[12px] leading-6 text-slate-100">
                    {lines.map((line, index) => (
                        <div key={`${path}-${index}`} className="grid grid-cols-[2.6rem_minmax(0,1fr)] gap-3">
                            <span className="select-none text-right text-slate-500">{index + 1}</span>
                            <code className="whitespace-pre-wrap break-words">{line || " "}</code>
                        </div>
                    ))}
                    {!lines.length && <code className="text-slate-500">{" "}</code>}
                </div>
            </div>
        </div>
    );
}
