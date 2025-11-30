import React from 'react'
import ModelSelector from './ModelSelector';
import PromptSelector from './PromptSelector';

interface ChatInputProps {
    input: string;
    loading: boolean;
    setInput: (value: string) => void;
    sendMessageF: () => Promise<void>;
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    selectedPrompt: string;
    setSelectedPrompt: (prompt: string) => void;
}

const ChatInput = ({input, loading, setInput, sendMessageF, selectedModel, setSelectedModel, selectedPrompt, setSelectedPrompt}: ChatInputProps) => {
    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!loading) {
                await sendMessageF();
            }
        }
    };

    return (
        <div className="flex flex-col sm:flex-row gap-2">
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Scrie un mesaj..."
                onKeyDown={handleKeyDown}
                className="flex-1 px-4 py-2 text-white rounded-xl shadow-2xl bg-white/5 outline-none focus:bg-white/10 placeholder-gray-200"
            />

            <div className="flex flex-col sm:flex-row gap-2">
                <ModelSelector selectedModel={selectedModel} setSelectedModel={setSelectedModel} />

                <PromptSelector selectedPrompt={selectedPrompt} setSelectedPrompt={setSelectedPrompt} />

                <button
                    onClick={sendMessageF}
                    disabled={loading}
                    className="px-6 sm:px-8 py-2 rounded-xl text-white bg-[linear-gradient(135deg,theme(colors.purple.500/0.2),theme(colors.indigo.500/0.15),theme(colors.purple.400/0.2))] shover:from-purple-500/30 hover:via-indigo-500/25 hover:to-purple-400/30 transition hover:scale-102 transition-all duration-30"
                >
                    Send
                </button>
            </div>
        </div>
    )
}
export default ChatInput
