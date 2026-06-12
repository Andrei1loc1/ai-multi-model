"use client";

import { useRef, useEffect, useCallback } from "react";

type VoiceOrbProps = {
    state: "idle" | "listening" | "thinking" | "speaking";
    frequencyData?: Uint8Array | null;
    avgLevel?: number;
    className?: string;
};

function drawIdleOrb(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, time: number) {
    const breathe = 1 + 0.05 * Math.sin(time * 0.001);
    const br = r * breathe;

    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, br * 1.4);
    glow.addColorStop(0, "rgba(103,232,249,0.06)");
    glow.addColorStop(1, "rgba(103,232,249,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, br * 1.4, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(cx - br * 0.25, cy - br * 0.25, br * 0.05, cx, cy, br);
    grad.addColorStop(0, "#67e8f9");
    grad.addColorStop(0.45, "#22d3ee");
    grad.addColorStop(0.75, "#312e81");
    grad.addColorStop(1, "#1e1b4b");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, br, 0, Math.PI * 2);
    ctx.fill();

    const innerGlow = ctx.createRadialGradient(cx - br * 0.2, cy - br * 0.2, 0, cx, cy, br * 0.7);
    innerGlow.addColorStop(0, "rgba(165,243,252,0.3)");
    innerGlow.addColorStop(0.5, "rgba(103,232,249,0.08)");
    innerGlow.addColorStop(1, "rgba(103,232,249,0)");
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, br, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.15 + 0.1 * Math.sin(time * 0.0008);
    ctx.strokeStyle = "#67e8f9";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, br * 1.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawListeningOrb(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    time: number,
    frequencyData: Uint8Array | null | undefined,
    avgLevel: number
) {
    const pulse = 1 + 0.03 * Math.sin(time * 0.003) + avgLevel * 0.06;
    const br = r * pulse;

    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, br * 1.6);
    glow.addColorStop(0, `rgba(34,211,238,${0.1 + avgLevel * 0.15})`);
    glow.addColorStop(1, "rgba(34,211,238,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, br * 1.6, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(cx - br * 0.25, cy - br * 0.25, br * 0.05, cx, cy, br);
    grad.addColorStop(0, "#22d3ee");
    grad.addColorStop(0.4, "#06b6d4");
    grad.addColorStop(0.75, "#0e7490");
    grad.addColorStop(1, "#1e1b4b");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, br, 0, Math.PI * 2);
    ctx.fill();

    const innerGlow = ctx.createRadialGradient(cx - br * 0.2, cy - br * 0.2, 0, cx, cy, br * 0.6);
    innerGlow.addColorStop(0, "rgba(165,243,252,0.45)");
    innerGlow.addColorStop(0.5, "rgba(34,211,238,0.12)");
    innerGlow.addColorStop(1, "rgba(34,211,238,0)");
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, br, 0, Math.PI * 2);
    ctx.fill();

    const ringCount = 5;
    for (let i = 0; i < ringCount; i++) {
        const baseRadius = br * 1.15 + i * br * 0.12;
        const expandPhase = ((time * 0.0015 + i * 0.7) % 3) / 3;
        const ringRadius = baseRadius + expandPhase * br * 0.3;
        const ringAlpha = Math.max(0, (1 - expandPhase) * (0.12 + avgLevel * 0.25));
        const ringWidth = 1.5 + avgLevel * 2;

        if (frequencyData && frequencyData.length > 0) {
            const bandSize = Math.floor(frequencyData.length / 64);
            const bandIndex = Math.min(i * 4, frequencyData.length - 1);
            const freqVal = frequencyData[bandIndex] / 255;
            const extraWidth = freqVal * 2.5;
            ctx.lineWidth = ringWidth + extraWidth;
        } else {
            ctx.lineWidth = ringWidth;
        }

        ctx.save();
        ctx.globalAlpha = ringAlpha;
        ctx.strokeStyle = i % 2 === 0 ? "#22d3ee" : "#a5f3fc";
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

function drawThinkingOrb(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, time: number) {
    const breathe = 1 + 0.03 * Math.sin(time * 0.0012);
    const br = r * breathe;

    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, br * 1.5);
    glow.addColorStop(0, "rgba(167,139,250,0.1)");
    glow.addColorStop(1, "rgba(167,139,250,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, br * 1.5, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(cx - br * 0.2, cy - br * 0.2, br * 0.05, cx, cy, br);
    grad.addColorStop(0, "#a78bfa");
    grad.addColorStop(0.4, "#8b5cf6");
    grad.addColorStop(0.75, "#6d28d9");
    grad.addColorStop(1, "#4c1d95");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, br, 0, Math.PI * 2);
    ctx.fill();

    const innerGlow = ctx.createRadialGradient(cx - br * 0.15, cy - br * 0.15, 0, cx, cy, br * 0.6);
    innerGlow.addColorStop(0, "rgba(196,181,253,0.35)");
    innerGlow.addColorStop(0.5, "rgba(167,139,250,0.1)");
    innerGlow.addColorStop(1, "rgba(167,139,250,0)");
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, br, 0, Math.PI * 2);
    ctx.fill();

    const particleCount = 12;
    const orbitRadius = br * 1.25;
    const rotationSpeed = time * 0.001;

    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + rotationSpeed;
        const wobble = 0.08 * Math.sin(time * 0.002 + i * 0.8);
        const px = cx + (orbitRadius + wobble * br) * Math.cos(angle);
        const py = cy + (orbitRadius + wobble * br) * Math.sin(angle);
        const particleSize = 2.5 + Math.sin(time * 0.003 + i) * 1;
        const particleAlpha = 0.5 + 0.3 * Math.sin(time * 0.002 + i * 0.5);

        ctx.save();
        ctx.globalAlpha = particleAlpha;
        const pGrad = ctx.createRadialGradient(px, py, 0, px, py, particleSize * 2.5);
        pGrad.addColorStop(0, "#c4b5fd");
        pGrad.addColorStop(0.5, "#a78bfa");
        pGrad.addColorStop(1, "rgba(167,139,250,0)");
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(px, py, particleSize * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = particleAlpha * 0.9;
        ctx.fillStyle = "#e9d5ff";
        ctx.beginPath();
        ctx.arc(px, py, particleSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#a78bfa";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, orbitRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawSpeakingOrb(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    time: number,
    avgLevel: number
) {
    const pulse = 1 + 0.02 * Math.sin(time * 0.004) + avgLevel * 0.04;
    const br = r * pulse;

    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, br * 1.7);
    glow.addColorStop(0, `rgba(110,231,183,${0.08 + avgLevel * 0.12})`);
    glow.addColorStop(1, "rgba(110,231,183,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, br * 1.7, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(cx - br * 0.2, cy - br * 0.2, br * 0.05, cx, cy, br);
    grad.addColorStop(0, "#6ee7b7");
    grad.addColorStop(0.35, "#34d399");
    grad.addColorStop(0.7, "#2dd4bf");
    grad.addColorStop(1, "#1e1b4b");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, br, 0, Math.PI * 2);
    ctx.fill();

    const innerGlow = ctx.createRadialGradient(cx - br * 0.2, cy - br * 0.2, 0, cx, cy, br * 0.55);
    innerGlow.addColorStop(0, "rgba(167,243,208,0.4)");
    innerGlow.addColorStop(0.5, "rgba(110,231,183,0.1)");
    innerGlow.addColorStop(1, "rgba(110,231,183,0)");
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, br, 0, Math.PI * 2);
    ctx.fill();

    const waveCount = 4;
    for (let i = 0; i < waveCount; i++) {
        const baseExpand = (time * 0.0012 + i * 0.75) % 3;
        const expandFrac = baseExpand / 3;
        const waveRadius = br * 1.1 + expandFrac * br * 0.8;
        const waveAlpha = Math.max(0, (1 - expandFrac) * (0.1 + avgLevel * 0.2));
        const waveAmplitude = 2 + avgLevel * 6 + Math.sin(time * 0.003 + i) * 1.5;

        ctx.save();
        ctx.globalAlpha = waveAlpha;
        ctx.strokeStyle = i % 2 === 0 ? "#6ee7b7" : "#a7f3d0";
        ctx.lineWidth = 1.5 + avgLevel * 1.5;

        ctx.beginPath();
        const segments = 80;
        for (let s = 0; s <= segments; s++) {
            const angle = (s / segments) * Math.PI * 2;
            const waveOffset = Math.sin(angle * 4 + time * 0.003 + i * 1.2) * waveAmplitude;
            const wRadius = waveRadius + waveOffset;
            const wx = cx + wRadius * Math.cos(angle);
            const wy = cy + wRadius * Math.sin(angle);
            if (s === 0) {
                ctx.moveTo(wx, wy);
            } else {
                ctx.lineTo(wx, wy);
            }
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }
}

export default function VoiceOrb({ state, frequencyData, avgLevel = 0, className }: VoiceOrbProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animFrameRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const sizeRef = useRef({ width: 240, height: 240 });
    const dprRef = useRef<number>(1);

    const draw = useCallback(
        (ctx: CanvasRenderingContext2D, time: number) => {
            const { width, height } = sizeRef.current;
            const cx = width / 2;
            const cy = height / 2;
            const r = Math.max(1, Math.min(width, height) / 2 * 0.65);

            ctx.clearRect(0, 0, width, height);

            switch (state) {
                case "idle":
                    drawIdleOrb(ctx, cx, cy, r, time);
                    break;
                case "listening":
                    drawListeningOrb(ctx, cx, cy, r, time, frequencyData ?? null, avgLevel);
                    break;
                case "thinking":
                    drawThinkingOrb(ctx, cx, cy, r, time);
                    break;
                case "speaking":
                    drawSpeakingOrb(ctx, cx, cy, r, time, avgLevel);
                    break;
            }
        },
        [state, frequencyData, avgLevel]
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const dpr = window.devicePixelRatio || 1;
        dprRef.current = dpr;

        const updateSize = () => {
            const rect = container.getBoundingClientRect();
            const size = Math.max(240, Math.min(rect.width, rect.height));
            sizeRef.current = { width: size, height: size };
            canvas.width = size * dpr;
            canvas.height = size * dpr;
            canvas.style.width = `${size}px`;
            canvas.style.height = `${size}px`;
        };

        updateSize();

        const resizeObserver = new ResizeObserver(() => {
            updateSize();
        });
        resizeObserver.observe(container);

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        startTimeRef.current = performance.now();

        const loop = (timestamp: number) => {
            const time = timestamp - startTimeRef.current;
            ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
            draw(ctx, time);
            animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animFrameRef.current);
            resizeObserver.disconnect();
        };
    }, [draw]);

    return (
        <div ref={containerRef} className={`flex items-center justify-center ${className ?? ""}`}>
            <canvas ref={canvasRef} className="block" />
        </div>
    );
}