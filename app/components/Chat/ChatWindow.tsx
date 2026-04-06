import ConversationThread, { ConversationMessageItem } from "@/app/components/Chat/ConversationThread";

const ChatWindow = ({
    messages,
    loading,
    onSaveAssistantMessage,
    onOpenVirtualProject,
}: {
    messages: ConversationMessageItem[];
    loading: boolean;
    onSaveAssistantMessage?: (content: string) => void;
    onOpenVirtualProject?: (projectId: string) => void;
}) => {
    return (
        <ConversationThread
            messages={messages}
            loading={loading}
            onSaveAssistantMessage={onSaveAssistantMessage}
            onOpenVirtualProject={onOpenVirtualProject}
        />
    );
};

export default ChatWindow;
