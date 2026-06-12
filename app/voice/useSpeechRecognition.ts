"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type UseSpeechRecognitionReturn = {
    startListening: () => void;
    stopListening: () => string;
    isListening: boolean;
    transcript: string;
    interimTranscript: string;
    error: string | null;
    supported: boolean;
    mediaStream: MediaStream | null;
};

type SpeechRecognitionInstance = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onstart: (() => void) | null;
    onresult: ((event: Event) => void) | null;
    onerror: ((event: Event) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
};

type SpeechRecognitionResult = {
    isFinal: boolean;
    length: number;
    [index: number]: { transcript: string };
};

type SpeechRecognitionEventLike = {
    results: SpeechRecognitionResult[];
    resultIndex: number;
};

type SpeechRecognitionErrorEventLike = {
    error: string;
};

function useSpeechRecognition(): UseSpeechRecognitionReturn {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [interimTranscript, setInterimTranscript] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const finalTranscriptRef = useRef("");
    const lastKnownTranscriptRef = useRef("");
    const shouldListenRef = useRef(false);

    const SpeechRecognitionAPI = typeof window !== "undefined"
        ? ((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as (new () => SpeechRecognitionInstance) | undefined
        : undefined;

    const supported = !!SpeechRecognitionAPI;

    const startListening = useCallback(() => {
        if (!SpeechRecognitionAPI) return;

        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch {}
            recognitionRef.current = null;
        }

        finalTranscriptRef.current = "";
        lastKnownTranscriptRef.current = "";
        setTranscript("");
        setInterimTranscript("");
        setError(null);
        shouldListenRef.current = true;

        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "ro-RO";
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event: Event) => {
            const e = event as unknown as SpeechRecognitionEventLike;
            let finalText = "";
            let interimText = "";
            for (let i = 0; i < e.results.length; i++) {
                const result = e.results[i];
                if (result.isFinal) {
                    finalText += result[0].transcript;
                } else {
                    interimText += result[0].transcript;
                }
            }
            if (finalText) {
                finalTranscriptRef.current = finalText;
                setTranscript(finalText);
            }
            const combined = finalText || interimText;
            if (combined) {
                lastKnownTranscriptRef.current = combined;
            }
            setInterimTranscript(interimText);
        };

        recognition.onerror = (event: Event) => {
            const e = event as unknown as SpeechRecognitionErrorEventLike;
            if (e.error === "aborted") return;
            if (e.error === "no-speech") return;
            if (e.error === "audio-capture") {
                setError("No microphone found.");
            } else if (e.error === "not-allowed") {
                setError("Microphone permission was denied.");
            } else {
                setError(`Speech recognition error: ${e.error}`);
            }
        };

        recognition.onend = () => {
            if (shouldListenRef.current && !finalTranscriptRef.current) {
                try {
                    recognition.start();
                } catch {
                    setIsListening(false);
                    shouldListenRef.current = false;
                }
            } else {
                setIsListening(false);
                shouldListenRef.current = false;
            }
        };

        recognitionRef.current = recognition;
        recognition.start();

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                streamRef.current = stream;
                setMediaStream(stream);
            })
            .catch(() => {});
    }, [SpeechRecognitionAPI]);

    const stopListening = useCallback((): string => {
        shouldListenRef.current = false;
        const currentTranscript = finalTranscriptRef.current || lastKnownTranscriptRef.current;

        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            setMediaStream(null);
        }
        setIsListening(false);

        return currentTranscript;
    }, []);

    useEffect(() => {
        return () => {
            shouldListenRef.current = false;
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch {}
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    return {
        startListening,
        stopListening,
        isListening,
        transcript,
        interimTranscript,
        error,
        supported,
        mediaStream,
    };
}

export { useSpeechRecognition };
export type { UseSpeechRecognitionReturn };