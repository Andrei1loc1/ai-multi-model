"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2, RotateCcw } from "lucide-react";
import Navbar from "@/app/components/Navigation/Navbar";
import VoiceOrb from "@/app/voice/VoiceOrb";
import { useSpeechRecognition } from "@/app/voice/useSpeechRecognition";
import { useAudioAnalyser } from "@/app/voice/useAudioAnalyser";
import { useTextToSpeech } from "@/app/voice/useTextToSpeech";

type AppState = "idle" | "listening" | "responding" | "speaking" | "error";

type ConversationEntry = {
    role: "user" | "assistant";
    text: string;
};

export default function VoiceUI() {
    const [appState, setAppState] = useState<AppState>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [conversation, setConversation] = useState<ConversationEntry[]>([]);
    const [streamingText, setStreamingText] = useState("");
    const [conversationId, setConversationId] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const liveTranscriptRef = useRef("");

    const speechRecognition = useSpeechRecognition();
    const analyser = useAudioAnalyser();
    const tts = useTextToSpeech();

    const resetState = useCallback(() => {
        setConversation([]);
        setConversationId(null);
        setStreamingText("");
        setAppState("idle");
        setErrorMessage(null);
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        speechRecognition.stopListening();
        tts.stop();
    }, [tts, speechRecognition]);

    const orbState = (() => {
        if (appState === "idle" || appState === "error") return "idle" as const;
        if (appState === "listening") return "listening" as const;
        if (appState === "responding") return "thinking" as const;
        if (appState === "speaking") return "speaking" as const;
        return "idle" as const;
    })();

    const scrollToBottom = useCallback(() => {
        requestAnimationFrame(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [conversation, streamingText, liveTranscriptRef.current, scrollToBottom]);

    useEffect(() => {
        if (appState === "speaking" && !tts.isSpeaking) {
            setAppState("idle");
        }
    }, [tts.isSpeaking, appState]);

    useEffect(() => {
        if (speechRecognition.error) {
            setErrorMessage(speechRecognition.error);
            setAppState("error");
        }
    }, [speechRecognition.error]);

    useEffect(() => {
        liveTranscriptRef.current = speechRecognition.transcript || speechRecognition.interimTranscript;
    }, [speechRecognition.transcript, speechRecognition.interimTranscript]);

    useEffect(() => {
        if (speechRecognition.mediaStream && speechRecognition.isListening) {
            analyser.startAnalyzing(speechRecognition.mediaStream);
        }
        if (!speechRecognition.isListening && analyser.isAnalyzing) {
            analyser.stopAnalyzing();
        }
    }, [speechRecognition.mediaStream, speechRecognition.isListening]);

    const handleError = useCallback((message: string) => {
        setErrorMessage(message);
        setAppState("error");
    }, []);

    const sendToOrchestrator = useCallback(async (text: string) => {
        setConversation((prev) => [...prev, { role: "user", text }]);
        setAppState("responding");
        setStreamingText("");

        try {
            const abortController = new AbortController();
            abortRef.current = abortController;

            const chatRes = await fetch("/api/orchestrate/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    mode: "chat",
                    soul: "voice",
                    selectedModel: "ollama-deepseek-v4-flash",
                    stream: true,
                    conversationId,
                }),
                signal: abortController.signal,
            });

            if (!chatRes.ok) {
                const errData = await chatRes.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to get response.");
            }

            const reader = chatRes.body?.getReader();
            if (!reader) {
                throw new Error("Response body is not readable.");
            }

            const decoder = new TextDecoder();
            let fullText = "";
            let lineBuffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                lineBuffer += decoder.decode(value, { stream: true });
                const lines = lineBuffer.split("\n");
                lineBuffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const dataStr = line.slice(6);

                    if (dataStr === "[DONE]") continue;

                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.content) {
                            fullText += parsed.content;
                            setStreamingText(fullText);
                        }
                        if (parsed.answer) {
                            fullText = parsed.answer;
                            setStreamingText(fullText);
                        }
                        if (parsed.conversationId) {
                            setConversationId(parsed.conversationId);
                        }
                    } catch {
                        if (dataStr.trim()) {
                            fullText += dataStr;
                            setStreamingText(fullText);
                        }
                    }
                }
            }

            if (lineBuffer.trim()) {
                const remaining = lineBuffer.trim();
                if (remaining.startsWith("data: ")) {
                    const dataStr = remaining.slice(6);
                    if (dataStr !== "[DONE]") {
                        try {
                            const parsed = JSON.parse(dataStr);
                            if (parsed.content) fullText += parsed.content;
                            if (parsed.answer) fullText = parsed.answer;
                            if (parsed.conversationId) setConversationId(parsed.conversationId);
                        } catch {
                            if (dataStr.trim()) fullText += dataStr;
                        }
                        setStreamingText(fullText);
                    }
                }
            }

            setConversation((prev) => [...prev, { role: "assistant", text: fullText }]);
            setStreamingText("");

            if (tts.supported && fullText.trim()) {
                tts.speak(fullText);
                setAppState("speaking");
            } else {
                setAppState("idle");
            }
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") return;
            handleError("Failed to get response. Please try again.");
        }
    }, [conversationId, tts, handleError]);

    const handleTap = useCallback(() => {
        if (appState === "idle" || appState === "error") {
            if (!speechRecognition.supported) {
                handleError("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
                return;
            }
            setErrorMessage(null);
            speechRecognition.startListening();
            setAppState("listening");
        } else if (appState === "listening") {
            const text = speechRecognition.stopListening();
            if (text.trim()) {
                sendToOrchestrator(text.trim());
            } else {
                handleError("No speech detected. Please try again.");
            }
        } else if (appState === "speaking") {
            tts.stop();
            setAppState("idle");
        }
    }, [appState, speechRecognition, tts, sendToOrchestrator, handleError]);

    const displayTranscript = speechRecognition.isListening
        ? (speechRecognition.transcript || speechRecognition.interimTranscript || "Listening...")
        : null;

    const buttonConfig = (() => {
        switch (appState) {
            case "idle":
                return { text: "Tap to Speak", icon: Mic, className: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20", disabled: false };
            case "listening":
                return { text: "Tap to Stop", icon: MicOff, className: "border-red-400 bg-red-500/20 text-red-100 hover:bg-red-500/30", disabled: false };
            case "responding":
                return { text: "Responding...", icon: Loader2, className: "border-violet-400/30 bg-violet-500/20 text-violet-100", disabled: true };
            case "speaking":
                return { text: "Speaking...", icon: Mic, className: "border-emerald-400/30 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30", disabled: false };
            case "error":
                return { text: "Try Again", icon: Mic, className: "border-red-400 bg-red-500/20 text-red-100 hover:bg-red-500/30", disabled: false };
        }
    })();

    return (
        <div className="flex min-h-screen flex-col items-center px-4 pt-6 pb-8">
            <Navbar />

            <div className="flex flex-1 flex-col items-center justify-center gap-6 pt-8 w-full max-w-lg">
                <VoiceOrb
                    state={orbState}
                    frequencyData={analyser.frequencyData}
                    avgLevel={analyser.avgLevel}
                    className="min-h-[240px] min-w-[240px]"
                />

                <div
                    ref={scrollRef}
                    className="voice-scroll w-full max-w-md max-h-60 overflow-y-auto rounded-xl border border-white/8 bg-slate-950/60 px-4 py-3 backdrop-blur-xl"
                >
                    {conversation.length === 0 && !streamingText && !displayTranscript && appState !== "error" ? (
                        <p className="text-center text-sm text-slate-400">
                            Tap the button below to start speaking...
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {conversation.map((entry, i) => (
                                <div key={i} style={{ animation: "voiceWaveIn 0.3s ease-out" }}>
                                    <span className={`text-xs font-semibold uppercase tracking-wider ${entry.role === "user" ? "text-cyan-300/70" : "text-violet-300/70"}`}>
                                        {entry.role === "user" ? "You:" : "AI:"}
                                    </span>
                                    <p className={`mt-0.5 text-slate-200 ${entry.role === "assistant" ? "text-sm leading-relaxed" : "text-xs leading-relaxed opacity-80"}`}>
                                        {entry.text}
                                    </p>
                                </div>
                            ))}
                            {displayTranscript && (
                                <div style={{ animation: "voiceWaveIn 0.3s ease-out" }}>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300/70">You:</span>
                                    <p className="mt-0.5 text-xs leading-relaxed opacity-80 text-slate-200">{displayTranscript}</p>
                                </div>
                            )}
                            {streamingText && (
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-violet-300/70">AI:</span>
                                    <p className="mt-0.5 text-sm leading-relaxed text-slate-200">{streamingText}</p>
                                </div>
                            )}
                            {appState === "error" && errorMessage && (
                                <p className="text-center text-sm text-red-300">{errorMessage}</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleTap}
                        disabled={buttonConfig.disabled}
                        className={`inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-medium uppercase tracking-[0.15em] transition ${buttonConfig.className} ${buttonConfig.disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                    >
                        <buttonConfig.icon
                            size={16}
                            className={buttonConfig.disabled && appState === "responding" ? "animate-spin" : ""}
                        />
                        {buttonConfig.text}
                    </button>
                    {conversation.length > 0 && (
                        <button
                            onClick={() => { tts.stop(); resetState(); }}
                            title="New conversation"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-medium text-slate-400 hover:bg-white/10 hover:text-slate-200 transition cursor-pointer"
                        >
                            <RotateCcw size={14} />
                        </button>
                    )}
                </div>

                {!speechRecognition.supported && (
                    <p className="text-xs text-red-300/80 text-center max-w-sm">
                        Speech recognition is not supported in this browser. Please use Chrome or Edge.
                    </p>
                )}
            </div>
        </div>
    );
}