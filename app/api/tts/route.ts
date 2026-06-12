import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const TTS_SERVICE_URL = process.env.TTS_SERVICE_URL || "http://127.0.0.1:5001";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const text = body.text?.trim();
        if (!text) {
            return NextResponse.json({ error: "text field is required" }, { status: 400 });
        }

        const ttsResponse = await fetch(`${TTS_SERVICE_URL}/speak`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });

        if (!ttsResponse.ok) {
            const errorText = await ttsResponse.text().catch(() => "");
            console.error("Piper TTS error:", ttsResponse.status, errorText);
            return NextResponse.json(
                { error: "TTS service unavailable. Make sure the TTS service is running on port 5001." },
                { status: 503 },
            );
        }

        if (!ttsResponse.body) {
            return NextResponse.json({ error: "No response body from TTS service" }, { status: 502 });
        }

        const reader = ttsResponse.body.getReader();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        controller.enqueue(value);
                    }
                } catch (err) {
                    console.error("TTS stream error:", err);
                } finally {
                    controller.close();
                    reader.releaseLock();
                }
            },
        });

        return new Response(stream, {
            status: 200,
            headers: {
                "Content-Type": "audio/wav",
                "Cache-Control": "no-cache",
                "Transfer-Encoding": "chunked",
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "TTS request failed";
        console.error("TTS proxy error:", message);
        return NextResponse.json(
            { error: "TTS service unavailable. Start it with: tts-service\\start-tts.bat" },
            { status: 503 },
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const ttsResponse = await fetch(`${TTS_SERVICE_URL}/health`, {
            signal: AbortSignal.timeout(5000),
        });
        if (ttsResponse.ok) {
            return NextResponse.json({ status: "ok", service: "piper-tts" });
        }
        return NextResponse.json({ status: "unavailable" }, { status: 503 });
    } catch {
        return NextResponse.json(
            { status: "unavailable", error: "TTS service not running" },
            { status: 503 },
        );
    }
}