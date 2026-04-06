"use client";

import React, { memo, useCallback, useEffect, useRef } from "react";
import { Bot, BookmarkPlus, User } from "lucide-react";
import ImageAttachmentStrip from "@/app/components/Chat/ImageAttachmentStrip";
import MarkdownContent from "@/app/components/Response/MarkdownContent";
import ResponseRenderer from "@/app/components/Response/ResponseRenderer";
import type {
    AgentArtifact,
    MessageAttachmentMetadata,
    VirtualProjectReference,
} from "@/app/lib/workspaces/types";

type ContextSource = {
    type: string;
    label: string;
    score: number;
};

export type ConversationMessageItem = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    created_at: string;
    pending?: boolean;
    attachments?: MessageAttachmentMetadata[];
    metadata?: {
        attachments?: MessageAttachmentMetadata[];
        contextSources?: ContextSource[];
        modelUsed?: {
            id: string;
            provider: string;
            profile: string;
            why: string;
        };
        taskType?: string;
        agent?: AgentArtifact | null;
        virtualProject?: VirtualProjectReference | null;
    } | null;
};

const AssistantArtifacts = memo(function AssistantArtifacts({
    agent,
    taskType,
}: {
    agent: AgentArtifact | null;
    taskType?: string;
}) {
    if (taskType !== "coding") {
        return null;
    }

    if (!agent) {
        return null;
    }

    return (
        <div className="mt-4 grid gap-3">
            <div className="rounded-[22px] border border-cyan-300/10 bg-cyan-300/[0.08] p-4">
                <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-cyan-100/80">Understanding</div>
                <div className="text-sm leading-6 text-white">{agent.understanding}</div>
            </div>

            {agent.files_used.length > 0 && (
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                    <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-slate-400">Files Used</div>
                    <div className="flex flex-wrap gap-2">
                        {agent.files_used.map((file) => (
                            <span
                                key={file}
                                className="rounded-full border border-white/8 bg-slate-950/55 px-3 py-1.5 text-xs text-slate-200"
                            >
                                {file}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {agent.proposed_changes.length > 0 && (
                <div className="rounded-[22px] border border-violet-300/10 bg-violet-300/[0.08] p-4">
                    <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-violet-100/80">Proposed Changes</div>
                    <div className="space-y-2">
                        {agent.proposed_changes.map((item, index) => (
                            <div key={`${item}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 text-sm leading-6 text-white">
                                {item}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {agent.patch_or_code && agent.patch_or_code !== "No patch generated." && (
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-1">
                    <MarkdownContent content={agent.patch_or_code} />
                </div>
            )}

            {(agent.risks.length > 0 || agent.next_step) && (
                <div className="grid gap-3 lg:grid-cols-2">
                    {agent.risks.length > 0 && (
                        <div className="rounded-[22px] border border-amber-300/10 bg-amber-300/[0.08] p-4">
                            <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-amber-100/80">Risks</div>
                            <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-white">
                                {agent.risks.map((risk, index) => (
                                    <li key={`${risk}-${index}`}>{risk}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {agent.next_step && (
                        <div className="rounded-[22px] border border-emerald-300/10 bg-emerald-300/[0.08] p-4">
                            <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-emerald-100/80">Next Step</div>
                            <div className="text-sm leading-6 text-white">{agent.next_step}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

const MessageBubble = memo(function MessageBubble({
    message,
    onSaveAssistantMessage,
    onOpenVirtualProject,
}: {
    message: ConversationMessageItem;
    onSaveAssistantMessage?: (content: string) => void;
    onOpenVirtualProject?: (projectId: string) => void;
}) {
    if (message.role === "user") {
        return (
            <div className="flex justify-end">
                <div className="max-w-[92%] rounded-[20px] border border-cyan-300/12 bg-cyan-300/[0.08] px-3.5 py-3 shadow-[0_18px_40px_rgba(2,6,23,0.18)] sm:max-w-[85%] sm:rounded-[24px] sm:px-4 md:max-w-[72%]">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-cyan-100/75">
                            <User size={12} />
                            You
                        </div>
                    </div>
                    {message.attachments && message.attachments.length > 0 && (
                        <div className="mb-3">
                            <ImageAttachmentStrip
                                attachments={message.attachments.map((attachment) => ({
                                    id: attachment.imageAssetId,
                                    name: attachment.name || "Image attachment",
                                    previewUrl: attachment.previewUrl || null,
                                    status: "ready",
                                }))}
                                compact
                            />
                        </div>
                    )}
                    <div className="whitespace-pre-wrap text-sm leading-6 text-white sm:leading-7">{message.content}</div>
                </div>
            </div>
        );
    }

    if (message.role === "assistant") {
        const virtualProjectId = message.metadata?.virtualProject?.id || null;

        return (
            <div className="flex justify-start">
                <div className="w-full max-w-full sm:max-w-[96%] md:max-w-[92%]">
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-[9px] uppercase tracking-[0.24em] text-slate-300 sm:px-3 sm:text-[10px] sm:tracking-[0.28em]">
                        <Bot size={12} />
                        Assistant
                        {message.metadata?.modelUsed?.id ? ` • ${message.metadata.modelUsed.id}` : ""}
                    </div>

                    {message.pending ? (
                        <div className="rounded-[26px] border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300">
                            Thinking...
                        </div>
                    ) : (
                        <>
                            <ResponseRenderer
                                content={message.content}
                                headerActions={
                                    <>
                                        {onSaveAssistantMessage ? (
                                            <button
                                                type="button"
                                                onClick={() => onSaveAssistantMessage(message.content)}
                                                className="response-surface-action"
                                            >
                                                <BookmarkPlus size={12} />
                                                Save note
                                            </button>
                                        ) : null}
                                        {virtualProjectId && onOpenVirtualProject ? (
                                            <button
                                                type="button"
                                                onClick={() => onOpenVirtualProject(virtualProjectId)}
                                                className="response-surface-action"
                                            >
                                                Open project
                                            </button>
                                        ) : null}
                                    </>
                                }
                            />
                            <AssistantArtifacts
                                agent={message.metadata?.agent || null}
                                taskType={message.metadata?.taskType}
                            />
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-center">
            <div className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-xs text-slate-400">
                {message.content}
            </div>
        </div>
    );
});

export default function ConversationThread({
    messages,
    loading,
    onSaveAssistantMessage,
    onOpenVirtualProject,
}: {
    messages: ConversationMessageItem[];
    loading: boolean;
    onSaveAssistantMessage?: (content: string) => void;
    onOpenVirtualProject?: (projectId: string) => void;
}) {
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const shouldAutoScrollRef = useRef(true);
    const previousMessageCountRef = useRef(0);

    const updateAutoScrollPreference = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) {
            return;
        }

        const distanceFromBottom =
            container.scrollHeight - container.scrollTop - container.clientHeight;
        shouldAutoScrollRef.current = distanceFromBottom < 120;
    }, []);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) {
            return;
        }

        const messageCountChanged = messages.length !== previousMessageCountRef.current;
        const shouldScroll = shouldAutoScrollRef.current || messages[messages.length - 1]?.pending;

        if (shouldScroll && messageCountChanged) {
            const behavior = previousMessageCountRef.current === 0 ? "auto" : "smooth";
            container.scrollTo({
                top: container.scrollHeight,
                behavior,
            });
        }

        previousMessageCountRef.current = messages.length;
    }, [messages, loading]);

    if (!messages.length && !loading) {
        return (
            <div className="flex min-h-[340px] items-center justify-center rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] p-6 text-center sm:min-h-[440px] sm:rounded-[28px] sm:p-8">
                <div className="max-w-xl">
                    <div className="text-[10px] uppercase tracking-[0.34em] text-slate-500">Conversation</div>
                    <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                        Start a real thread
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-400 sm:leading-7">
                        Every message you send will stay in this conversation, and the assistant will continue in the same thread like a modern chatbot workspace.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={scrollContainerRef}
            onScroll={updateAutoScrollPreference}
            className="message-card max-h-[calc(100vh-305px)] min-h-[360px] overflow-y-auto overflow-x-hidden rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.08),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.84),rgba(2,6,23,0.72))] p-2.5 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:max-h-[calc(100vh-320px)] sm:min-h-[440px] sm:rounded-[30px] sm:p-3 md:p-4"
        >
            <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:gap-5">
                {messages.map((message) => (
                    <MessageBubble
                        key={message.id}
                        message={message}
                        onSaveAssistantMessage={message.role === "assistant" && !message.pending ? onSaveAssistantMessage : undefined}
                        onOpenVirtualProject={message.role === "assistant" && !message.pending ? onOpenVirtualProject : undefined}
                    />
                ))}

                {loading && !messages.some((message) => message.pending) && (
                    <MessageBubble
                        message={{
                            id: "loading-assistant",
                            role: "assistant",
                            content: "Thinking...",
                            created_at: new Date().toISOString(),
                            pending: true,
                        }}
                    />
                )}

                <div ref={bottomRef} />
            </div>
        </div>
    );
}
