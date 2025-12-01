"use client";

import { useState } from "react";
import ChatWindow from "@/app/components/Chat/ChatWindow";
import { sendMessage} from "@/app/lib/chatUtils/sendMessage";
import ChatInput from "@/app/components/Chat/ChatInput";
import { Braces, Save} from 'lucide-react';
import SaveResponseModal from "@/app/components/modals/SaveResponseModal";
import {instantPrompt} from "@/app/lib/prompts/instantPrompt";
import {detailedPrompt} from "@/app/lib/prompts/detailedPrompt";
import {humanPrompt} from "@/app/lib/prompts/humanPrompt";
import {mathPrompt} from "@/app/lib/prompts/mathPrompt";
import {teoreticPrompt} from "@/app/lib/prompts/teoreticPrompt";

const promptFunctions = {
    instant: instantPrompt,
    detailed: detailedPrompt,
    human: humanPrompt,
    math: mathPrompt,
    teoretic: teoreticPrompt,
};

export default function ChatUI() {
    const [input, setInput] = useState("");
    const [response, setResponse] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState("auto");
    const [selectedPrompt, setSelectedPrompt] = useState("instant");
    const [messageHistory, setMessageHistory] = useState<Array<{userPrompt: string, response: string}>>([]);
    const [useContext, setUseContext] = useState(true);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

    const sendMessageF = async () => {
        let compressedContext = "";
        if (useContext) {
            const recentHistory = messageHistory.slice(-10);
            try {
                const res = await fetch('/api/compress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: input, bruteContext: JSON.stringify(recentHistory) })
                });
                if (res.ok) {
                    const data = await res.json();
                    compressedContext = data.text || "";
                } else {
                    compressedContext = "";
                }
            } catch (e) {
                console.error('Failed to fetch compressed context', e);
                compressedContext = "";
            }
        }

        const selectedPromptFn = promptFunctions[selectedPrompt as keyof typeof promptFunctions];
        const finalPrompt = selectedPromptFn({compressedContext, input});

        const responseText = await sendMessage({input: finalPrompt, setInput, setLoading, setResponse, model: selectedModel, stream: false});

        setMessageHistory(prev => [...prev, {userPrompt: input, response: responseText || ''}]);
    }

    const handleSave = () => {
        setIsSaveModalOpen(true);
    };

    return (
        <div className="w-full max-w-4xl bg-white/3 p-6 rounded-lg shadow-2xl items-center justify-center">
            <div className="flex flex-row items-center justify-between mb-6">
                <div className="flex flex-row items-center">
                    <h1 className="text-2xl font-extrabold bg-gradient-to-r from-purple-200 via-blue-200 to-blue-200 bg-clip-text text-transparent drop-shadow-xl">
                        Multi-AI <span className="font-mono">model</span>
                    </h1>
                    <Braces className="text-2xl text-cyan-200/80 ml-3" />
                    <button
                        onClick={() => setUseContext(!useContext)}
                        className={`ml-4 px-3 py-1 rounded-full text-sm font-medium transition-colors ${useContext ? 'bg-green-500/20 text-green-200' : 'bg-gray-500/20 text-gray-200'}`}
                        title={useContext ? "Disable context" : "Enable context"}
                    >
                        Context {useContext ? "ON" : "OFF"}
                    </button>
                </div>
                {response && (
                    <button
                        onClick={handleSave}
                        className="p-2 px-4 rounded-full text-white flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors duration-200"
                        title="Save Response"
                    >Save
                        <Save size={18} className="text-white ml-2" />
                    </button>
                )}
            </div>
            <ChatWindow response={response} loading={loading} />
             <ChatInput input={input} loading={loading} setInput={setInput} sendMessageF={sendMessageF} selectedModel={selectedModel} setSelectedModel={setSelectedModel} selectedPrompt={selectedPrompt} setSelectedPrompt={setSelectedPrompt} />

            {isSaveModalOpen && (
                <SaveResponseModal response={response} setIsSaveModalOpen={setIsSaveModalOpen} />
            )}
        </div>
    );
}
