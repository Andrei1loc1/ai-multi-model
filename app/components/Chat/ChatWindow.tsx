import ConversationThread, { ConversationMessageItem } from "@/app/components/Chat/ConversationThread";

const ChatWindow = ({
    messages,
    loading,
    onSaveAssistantMessage,
}: {
    messages: ConversationMessageItem[];
    loading: boolean;
    onSaveAssistantMessage?: (content: string) => void;
}) => {
    return (
        <ConversationThread
            messages={messages}
            loading={loading}
            onSaveAssistantMessage={onSaveAssistantMessage}
        />
    );
};

export default ChatWindow;
