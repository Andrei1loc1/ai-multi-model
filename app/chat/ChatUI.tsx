"use client";

import { useState } from "react";
import ChatWindow from "@/app/components/Chat/ChatWindow";
import { sendMessage} from "@/app/components/Chat/functions/sendMessage";
import ChatInput from "@/app/components/Chat/ChatInput";
import { Braces } from 'lucide-react';


export default function ChatUI() {
    const [input, setInput] = useState("");
    const [response, setResponse] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState("auto");

    const sendMessageF = async () => sendMessage({input, setInput, setLoading, setResponse, model: selectedModel});

    return (
        <div className="w-full max-w-4xl bg-white/3 p-6 rounded-lg shadow-2xl items-center justify-center">
            <div className="flex flex-row items-center mb-6">
                <h1 className="text-2xl font-extrabold bg-gradient-to-r from-purple-200 via-blue-200 to-blue-200 bg-clip-text text-transparent drop-shadow-lg">
                    Multi-AI <span className="font-mono">model</span>
                </h1>
                <Braces className="text-2xl text-cyan-200/80 ml-3" />
            </div>
            <ChatWindow response={response} loading={loading} />
            <ChatInput input={input} loading={loading} setInput={setInput} sendMessageF={sendMessageF} selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
        </div>
    );
}
