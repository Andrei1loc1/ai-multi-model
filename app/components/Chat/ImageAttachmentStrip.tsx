"use client";

import { LoaderCircle, TriangleAlert, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

export type ChatImageAttachmentState = "queued" | "uploading" | "ready" | "error";

export type ChatImageAttachmentPreview = {
    id: string;
    name?: string | null;
    previewUrl?: string | null;
    status?: ChatImageAttachmentState;
    errorMessage?: string | null;
};

export default function ImageAttachmentStrip({
    attachments,
    onRemove,
    compact = false,
}: {
    attachments: ChatImageAttachmentPreview[];
    onRemove?: (id: string) => void;
    compact?: boolean;
}) {
    if (!attachments.length) {
        return null;
    }

    return (
        <div
            className={`grid gap-2 ${compact ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`.trim()}
        >
            {attachments.map((attachment) => {
                const isError = attachment.status === "error";
                const isUploading = attachment.status === "uploading" || attachment.status === "queued";

                return (
                    <div
                        key={attachment.id}
                        className="group relative overflow-hidden rounded-[18px] border border-white/8 bg-slate-950/65 shadow-[0_16px_32px_rgba(2,6,23,0.18)]"
                    >
                        <div className={`${compact ? "aspect-[4/3]" : "aspect-square"} relative overflow-hidden bg-slate-900/60`}>
                            {attachment.previewUrl ? (
                                <Image
                                    src={attachment.previewUrl}
                                    alt={attachment.name || "Attached image"}
                                    fill
                                    unoptimized
                                    sizes={compact ? "(max-width: 640px) 50vw, 220px" : "(max-width: 640px) 100vw, 280px"}
                                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-slate-400">
                                    <ImageIcon size={18} />
                                </div>
                            )}
                        </div>

                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-[linear-gradient(180deg,transparent,rgba(2,6,23,0.92))] p-2.5">
                            <div className="min-w-0">
                                <div className="truncate text-[11px] font-medium text-white">
                                    {attachment.name || "Image attachment"}
                                </div>
                                <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-slate-300">
                                    {isUploading && <LoaderCircle size={11} className="animate-spin" />}
                                    {isError && <TriangleAlert size={11} className="text-rose-200" />}
                                    <span>
                                        {attachment.status === "ready" ? "Ready" : isError ? "Upload failed" : "Uploading"}
                                    </span>
                                </div>
                            </div>

                            {onRemove && (
                                <button
                                    type="button"
                                    onClick={() => onRemove(attachment.id)}
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/8 bg-slate-950/70 text-slate-300 transition hover:border-rose-300/20 hover:bg-rose-400/12 hover:text-rose-100"
                                    aria-label={`Remove ${attachment.name || "image attachment"}`}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {isError && attachment.errorMessage && (
                            <div className="absolute left-2 right-2 top-2 rounded-xl border border-rose-300/15 bg-rose-400/12 px-2.5 py-1.5 text-[11px] leading-4 text-rose-100">
                                {attachment.errorMessage}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
