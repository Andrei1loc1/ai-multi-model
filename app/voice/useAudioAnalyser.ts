import { useState, useRef, useCallback, useEffect } from "react";

type UseAudioAnalyserReturn = {
    frequencyData: Uint8Array | null;
    avgLevel: number;
    peakLevel: number;
    isAnalyzing: boolean;
    startAnalyzing: (stream: MediaStream) => void;
    stopAnalyzing: () => void;
};

function useAudioAnalyser(): UseAudioAnalyserReturn {
    const [avgLevel, setAvgLevel] = useState(0);
    const [peakLevel, setPeakLevel] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [frequencyDataVersion, setFrequencyDataVersion] = useState(0);

    const frequencyDataRef = useRef<Uint8Array | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const frameRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const versionRef = useRef(0);

    const stopAnalyzing = useCallback(() => {
        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }

        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }

        if (analyserRef.current) {
            analyserRef.current.disconnect();
            analyserRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        frequencyDataRef.current = null;
        setIsAnalyzing(false);
        setAvgLevel(0);
        setPeakLevel(0);
    }, []);

    const startAnalyzing = useCallback(
        (stream: MediaStream) => {
            if (typeof AudioContext === "undefined") {
                return;
            }

            if (isAnalyzing) {
                stopAnalyzing();
            }

            if (!stream || !stream.active) {
                return;
            }

            streamRef.current = stream;

            if (!audioContextRef.current || audioContextRef.current.state === "closed") {
                audioContextRef.current = new AudioContext();
            }

            const ctx = audioContextRef.current;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;

            source.connect(analyser);

            sourceRef.current = source;
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            frequencyDataRef.current = dataArray;

            const tick = () => {
                analyser.getByteFrequencyData(dataArray);

                let sum = 0;
                let max = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                    if (dataArray[i] > max) {
                        max = dataArray[i];
                    }
                }

                const avg = dataArray.length > 0 ? sum / dataArray.length / 255 : 0;
                const peak = max / 255;

                setAvgLevel(avg);
                setPeakLevel(peak);

                versionRef.current += 1;
                if (versionRef.current % 3 === 0) {
                    setFrequencyDataVersion(versionRef.current);
                }

                frameRef.current = requestAnimationFrame(tick);
            };

            setIsAnalyzing(true);
            tick();
        },
        [isAnalyzing, stopAnalyzing]
    );

    useEffect(() => {
        return () => {
            stopAnalyzing();
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
        };
    }, [stopAnalyzing]);

    const currentFrequencyData = frequencyDataRef.current;

    return {
        frequencyData: currentFrequencyData,
        avgLevel,
        peakLevel,
        isAnalyzing,
        startAnalyzing,
        stopAnalyzing,
    };
}

export { useAudioAnalyser };
export type { UseAudioAnalyserReturn };