import React from "react";
import { Bot, FolderGit2, MessageSquareText, PlusCircle, Trash2 } from "lucide-react";

type WorkspaceItem = {
    id: string;
    name: string;
    description?: string | null;
};

type ConversationItem = {
    id: string;
    title: string;
    mode: "chat" | "agent";
};

type Props = {
    workspaces: WorkspaceItem[];
    conversations: ConversationItem[];
    selectedWorkspaceId: string | null;
    selectedConversationId: string | null;
    onSelectWorkspace: (id: string) => void;
    onSelectConversation: (id: string) => void;
    onDeleteWorkspace: (id: string) => void;
    onDeleteConversation: (id: string) => void;
    onCreateWorkspace: () => void;
};

export default function WorkspaceSidebar({
    workspaces,
    conversations,
    selectedWorkspaceId,
    selectedConversationId,
    onSelectWorkspace,
    onSelectConversation,
    onDeleteWorkspace,
    onDeleteConversation,
    onCreateWorkspace,
}: Props) {
    return (
        <aside className="mt-12 w-full shrink-0 rounded-[28px] border border-white/8 bg-slate-950/72 p-3 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-2xl lg:mt-14 lg:w-[280px]">
            <div className="flex items-center justify-between gap-3 mb-4 px-1">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-200/60">Workspace</p>
                    <h2 className="text-lg font-semibold text-white">AI Control</h2>
                </div>
                <button
                    onClick={onCreateWorkspace}
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-300/20 transition"
                >
                    <PlusCircle size={14} />
                    New
                </button>
            </div>

            <div className="mb-4 rounded-[24px] border border-white/6 bg-white/[0.03] p-3">
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    <FolderGit2 size={14} />
                    Workspaces
                </div>
                <div className="space-y-1.5">
                    {workspaces.map((workspace) => (
                        <div
                            key={workspace.id}
                            className={`w-full rounded-2xl border px-3 py-2.5 text-left transition ${
                                selectedWorkspaceId === workspace.id
                                    ? "border-cyan-300/30 bg-cyan-300/12 text-white shadow-[0_12px_24px_rgba(34,211,238,0.08)]"
                                    : "border-white/6 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <button
                                    onClick={() => onSelectWorkspace(workspace.id)}
                                    className="min-w-0 flex-1 text-left"
                                >
                                    <div className="text-sm font-medium line-clamp-1">{workspace.name}</div>
                                    {workspace.description && (
                                        <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-400">{workspace.description}</div>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    aria-label={`Delete ${workspace.name}`}
                                    onClick={() => onDeleteWorkspace(workspace.id)}
                                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-slate-400 transition hover:border-red-300/20 hover:bg-red-400/[0.10] hover:text-red-200"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {!workspaces.length && (
                        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-xs leading-5 text-slate-400">
                            Create your first workspace to attach repos and keep project memory online.
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-[24px] border border-white/6 bg-white/[0.03] p-3">
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    <Bot size={14} />
                    Recent Conversations
                </div>
                <div className="space-y-1.5 max-h-[42vh] overflow-y-auto pr-1">
                    {conversations.map((conversation) => (
                        <div
                            key={conversation.id}
                            className={`group w-full rounded-2xl border px-3 py-2.5 text-left transition ${
                                selectedConversationId === conversation.id
                                    ? "border-violet-300/30 bg-violet-300/12 text-white shadow-[0_12px_24px_rgba(167,139,250,0.08)]"
                                    : "border-white/6 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <button
                                    onClick={() => onSelectConversation(conversation.id)}
                                    className="min-w-0 flex-1 text-left"
                                >
                                    <span className="text-sm font-medium line-clamp-2 leading-5">{conversation.title}</span>
                                </button>

                                <div className="ml-2 flex shrink-0 items-center gap-1.5">
                                    <span className="rounded-full bg-white/8 px-2 py-1 text-[9px] uppercase tracking-[0.24em] text-slate-300">
                                        {conversation.mode}
                                    </span>
                                    <button
                                        type="button"
                                        aria-label={`Delete ${conversation.title}`}
                                        onClick={() => onDeleteConversation(conversation.id)}
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-slate-400 transition hover:border-red-300/20 hover:bg-red-400/[0.10] hover:text-red-200"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {!conversations.length && (
                        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-xs leading-5 text-slate-400 flex items-center gap-2">
                            <MessageSquareText size={16} />
                            Conversations will appear here after your first prompt.
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
