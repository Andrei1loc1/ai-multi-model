import { memo, useState } from "react";
import { Bot, ChevronDown, FolderGit2, MessageSquareText, PlusCircle, Trash2 } from "lucide-react";

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

function WorkspaceSidebar({
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
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);

    return (
        <aside className="mt-10 w-full min-w-0 shrink-0 rounded-[22px] border border-white/8 bg-slate-950/72 p-2.5 shadow-[0_18px_60px_rgba(2,6,23,0.42)] backdrop-blur-xl sm:rounded-[24px] sm:p-3 lg:mt-14 lg:w-[280px] lg:rounded-[28px]">
            <div className="mb-3 flex items-center justify-between gap-3 px-1 sm:mb-4">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-200/60">Workspace</p>
                    <h2 className="text-base font-semibold text-white sm:text-lg">AI Control</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsMobileExpanded((value) => !value)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-slate-300 transition hover:bg-white/[0.06] md:hidden"
                        aria-label={isMobileExpanded ? "Collapse AI control" : "Expand AI control"}
                    >
                        <ChevronDown size={16} className={`transition-transform ${isMobileExpanded ? "rotate-180" : ""}`} />
                    </button>
                    <button
                        type="button"
                        onClick={onCreateWorkspace}
                        className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-medium text-cyan-100 transition hover:bg-cyan-300/20 sm:text-xs"
                    >
                        <PlusCircle size={14} />
                        New
                    </button>
                </div>
            </div>

            <div className={`${isMobileExpanded ? "block" : "hidden"} md:block`}>
            <div className="mb-3 rounded-[20px] border border-white/6 bg-white/[0.03] p-2.5 sm:mb-4 sm:rounded-[24px] sm:p-3">
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    <FolderGit2 size={14} />
                    Workspaces
                </div>
                <div className="space-y-1.5">
                    {workspaces.map((workspace) => (
                        <div
                            key={workspace.id}
                            className={`w-full rounded-[18px] border px-3 py-2 text-left transition sm:rounded-2xl sm:py-2.5 ${
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
                                    <div className="line-clamp-1 text-sm font-medium">{workspace.name}</div>
                                    {workspace.description && (
                                        <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-400 sm:text-[11px]">{workspace.description}</div>
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

            <div className="rounded-[20px] border border-white/6 bg-white/[0.03] p-2.5 sm:rounded-[24px] sm:p-3">
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    <Bot size={14} />
                    Recent Conversations
                </div>
                <div className="max-h-[32vh] space-y-1.5 overflow-y-auto pr-1 sm:max-h-[42vh]">
                    {conversations.map((conversation) => (
                        <div
                            key={conversation.id}
                            className={`group w-full rounded-[18px] border px-3 py-2 text-left transition sm:rounded-2xl sm:py-2.5 ${
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
                                    <span className="line-clamp-2 text-sm font-medium leading-5">{conversation.title}</span>
                                </button>

                                <div className="ml-2 flex shrink-0 items-center gap-1.5">
                                    <span className="rounded-full bg-white/8 px-2 py-1 text-[8px] uppercase tracking-[0.24em] text-slate-300 sm:text-[9px]">
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
            </div>
        </aside>
    );
}

function areWorkspaceItemsEqual(
    prevItems: WorkspaceItem[],
    nextItems: WorkspaceItem[]
) {
    if (prevItems === nextItems) {
        return true;
    }

    if (prevItems.length !== nextItems.length) {
        return false;
    }

    for (let index = 0; index < prevItems.length; index += 1) {
        const previous = prevItems[index];
        const next = nextItems[index];

        if (
            previous === next ||
            (previous.id === next.id && previous.name === next.name && previous.description === next.description)
        ) {
            continue;
        }

        return false;
    }

    return true;
}

function areConversationItemsEqual(
    prevItems: ConversationItem[],
    nextItems: ConversationItem[]
) {
    if (prevItems === nextItems) {
        return true;
    }

    if (prevItems.length !== nextItems.length) {
        return false;
    }

    for (let index = 0; index < prevItems.length; index += 1) {
        const previous = prevItems[index];
        const next = nextItems[index];

        if (
            previous === next ||
            (previous.id === next.id && previous.title === next.title && previous.mode === next.mode)
        ) {
            continue;
        }

        return false;
    }

    return true;
}

function areEqual(prevProps: Props, nextProps: Props) {
    return (
        prevProps.selectedWorkspaceId === nextProps.selectedWorkspaceId &&
        prevProps.selectedConversationId === nextProps.selectedConversationId &&
        prevProps.onSelectWorkspace === nextProps.onSelectWorkspace &&
        prevProps.onSelectConversation === nextProps.onSelectConversation &&
        prevProps.onDeleteWorkspace === nextProps.onDeleteWorkspace &&
        prevProps.onDeleteConversation === nextProps.onDeleteConversation &&
        prevProps.onCreateWorkspace === nextProps.onCreateWorkspace &&
        areWorkspaceItemsEqual(prevProps.workspaces, nextProps.workspaces) &&
        areConversationItemsEqual(prevProps.conversations, nextProps.conversations)
    );
}

export default memo(WorkspaceSidebar, areEqual);
