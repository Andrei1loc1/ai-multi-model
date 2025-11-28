import ChatUI from "./ChatUI";

export default function ChatPage() {
    return (
        <div className="h-screen overflow-y-hidden p-4 flex items-center justify-center bg-gray-900 bg-[linear-gradient(135deg,#0f0f23_0%,#1e293b_20%,#312e81_40%,#1e1b4b_60%,#0f172a_80%,#1e293b_100%)]">
            <ChatUI />
        </div>
    );
}