"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type UseTextToSpeechReturn = {
    speak: (text: string) => void;
    stop: () => void;
    isSpeaking: boolean;
    supported: boolean;
    usingPiper: boolean;
};

const MAX_UTTERANCE_LENGTH = 200;

function splitIntoSentences(text: string): string[] {
    const raw = text.split(/(?<=[.!?])|\n/);
    const result: string[] = [];
    for (const segment of raw) {
        const trimmed = segment.trim();
        if (!trimmed) continue;
        if (trimmed.length <= MAX_UTTERANCE_LENGTH) {
            result.push(trimmed);
        } else {
            for (let i = 0; i < trimmed.length; i += MAX_UTTERANCE_LENGTH) {
                const chunk = trimmed.slice(i, i + MAX_UTTERANCE_LENGTH).trim();
                if (chunk) result.push(chunk);
            }
        }
    }
    return result;
}

function selectVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    const romanian = voices.filter((v) => v.lang.startsWith("ro"));
    const english = voices.filter((v) => v.lang.startsWith("en"));
    const pool = romanian.length > 0 ? romanian : english.length > 0 ? english : voices;
    if (pool.length === 0) return null;
    const preferred = pool.find(
        (v) =>
            v.name.includes("Google") || v.name.includes("Microsoft")
    );
    return preferred ?? pool[0];
}

export function useTextToSpeech(): UseTextToSpeechReturn {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [usingPiper, setUsingPiper] = useState(false);
    const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
    const cancelledRef = useRef(false);
    const piperAvailableRef = useRef<boolean | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const supported =
        typeof window !== "undefined" && (typeof window.speechSynthesis !== "undefined" || true);

    useEffect(() => {
        if (typeof window === "undefined") return;

        if (typeof window.speechSynthesis !== "undefined") {
            const loadVoices = () => {
                voicesRef.current = window.speechSynthesis.getVoices();
            };
            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        fetch("/api/tts", { signal: AbortSignal.timeout(5000) }).then((r) => {
            if (r.ok) {
                piperAvailableRef.current = true;
                setUsingPiper(true);
            } else {
                piperAvailableRef.current = false;
                setUsingPiper(false);
            }
        }).catch(() => {
            piperAvailableRef.current = false;
            setUsingPiper(false);
        });

        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null;
                window.speechSynthesis.cancel();
            }
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const speakWithBrowser = useCallback((text: string) => {
        if (typeof window === "undefined" || !window.speechSynthesis) return;

        window.speechSynthesis.cancel();
        cancelledRef.current = false;

        const sentences = splitIntoSentences(text);
        if (sentences.length === 0) return;

        const voice = selectVoice(voicesRef.current);

        if (sentences.length === 1) {
            const utterance = new SpeechSynthesisUtterance(sentences[0]);
            if (voice) utterance.voice = voice;
            utterance.rate = 1.4;
            utterance.pitch = 1.0;
            utterance.onstart = () => {
                if (!cancelledRef.current) setIsSpeaking(true);
            };
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
            return;
        }

        let index = 0;
        setIsSpeaking(true);

        const speakNext = () => {
            if (cancelledRef.current || index >= sentences.length) {
                setIsSpeaking(false);
                return;
            }
            const utterance = new SpeechSynthesisUtterance(sentences[index]);
            if (voice) utterance.voice = voice;
            utterance.rate = 1.4;
            utterance.pitch = 1.0;
            utterance.onend = () => {
                index++;
                speakNext();
            };
            utterance.onerror = () => {
                setIsSpeaking(false);
            };
            window.speechSynthesis.speak(utterance);
        };

        speakNext();
    }, []);

    const speakWithPiper = useCallback(async (text: string) => {
        cancelledRef.current = false;
        setIsSpeaking(true);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn("Piper TTS failed, falling back to browser speech");
                setIsSpeaking(false);
                speakWithBrowser(text);
                return;
            }

            const audioBlob = await response.blob();

            if (cancelledRef.current) {
                setIsSpeaking(false);
                return;
            }

            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                audioRef.current = null;
                if (!cancelledRef.current) {
                    setIsSpeaking(false);
                }
            };

            audio.onerror = () => {
                URL.revokeObjectURL(audioUrl);
                audioRef.current = null;
                if (!cancelledRef.current) {
                    setIsSpeaking(false);
                }
            };

            await audio.play();
        } catch {
            if (!cancelledRef.current) {
                console.warn("Piper TTS error, falling back to browser speech");
                setIsSpeaking(false);
                speakWithBrowser(text);
            }
        }
    }, [speakWithBrowser]);

    const speak = useCallback((text: string) => {
        if (piperAvailableRef.current) {
            speakWithPiper(text);
        } else {
            speakWithBrowser(text);
        }
    }, [speakWithPiper, speakWithBrowser]);

    const stop = useCallback(() => {
        cancelledRef.current = true;
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
    }, []);

    return { speak, stop, isSpeaking, supported, usingPiper };
}