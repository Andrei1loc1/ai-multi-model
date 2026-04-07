import { memo } from "react";
import ConversationThread, { ConversationMessageItem } from "@/app/components/Chat/ConversationThread";

type ChatWindowProps = {
    messages: ConversationMessageItem[];
    loading: boolean;
    onSaveAssistantMessage?: (content: string) => void;
    onOpenVirtualProject?: (projectId: string) => void;
};

function ChatWindow({
    messages,
    loading,
    onSaveAssistantMessage,
    onOpenVirtualProject,
}: ChatWindowProps) {
    return (
        <ConversationThread
            messages={messages}
            loading={loading}
            onSaveAssistantMessage={onSaveAssistantMessage}
            onOpenVirtualProject={onOpenVirtualProject}
        />
    );
}

function areMessagesEqual(prevMessages: ConversationMessageItem[], nextMessages: ConversationMessageItem[]) {
    if (prevMessages === nextMessages) {
        return true;
    }

    if (prevMessages.length !== nextMessages.length) {
        return false;
    }

    for (let index = 0; index < prevMessages.length; index += 1) {
        const previous = prevMessages[index];
        const next = nextMessages[index];

        if (
            previous === next ||
            (previous.id === next.id &&
                previous.role === next.role &&
                previous.content === next.content &&
                previous.created_at === next.created_at &&
                previous.pending === next.pending &&
                previous.attachments === next.attachments &&
                previous.metadata === next.metadata)
        ) {
            continue;
        }

        return false;
    }

    return true;
}

function areEqual(prevProps: ChatWindowProps, nextProps: ChatWindowProps) {
    return (
        prevProps.loading === nextProps.loading &&
        prevProps.onSaveAssistantMessage === nextProps.onSaveAssistantMessage &&
        prevProps.onOpenVirtualProject === nextProps.onOpenVirtualProject &&
        areMessagesEqual(prevProps.messages, nextProps.messages)
    );
}

export default memo(ChatWindow, areEqual);
