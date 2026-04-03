"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Braces, Check, Copy, KeyRound, LockKeyhole, SquareMousePointer } from "lucide-react";

const exampleModel = "qwen3-coder-free";

export default function Page() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [apiOpen, setApiOpen] = useState(false);
    const [key, setKey] = useState("");
    const [copied, setCopied] = useState(false);
    const [origin, setOrigin] = useState("https://your-domain.vercel.app");

    useEffect(() => {
        if (typeof window !== "undefined" && window.location.origin) {
            setOrigin(window.location.origin);
        }
    }, []);

    const requestExample = useMemo(
        () =>
            JSON.stringify(
                {
                    prompt: "Explain how async/await works in JavaScript.",
                    model: exampleModel,
                },
                null,
                2
            ),
        []
    );

    const responseExample = useMemo(
        () =>
            JSON.stringify(
                {
                    success: true,
                    model: "qwen/qwen3-coder:free",
                    provider: "openrouter",
                    text: "async/await is syntax built on top of promises...",
                    raw: "{provider response object}",
                },
                null,
                2
            ),
        []
    );

    const curlExample = useMemo(
        () =>
            `curl -X POST "${origin}/api/v1/chat" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -d '${requestExample.replace(/\n/g, "\n  ")}'`,
        [origin, requestExample]
    );

    const fetchExample = useMemo(
        () =>
            `const response = await fetch("${origin}/api/v1/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer <YOUR_API_KEY>"
  },
  body: JSON.stringify({
    prompt: "Explain how async/await works in JavaScript.",
    model: "${exampleModel}"
  })
});

const data = await response.json();`,
        [origin]
    );

    const handleLogin = () => {
        const correctPassword = process.env.NEXT_PUBLIC_API_GEN_PASSWORD;
        if (password === correctPassword) {
            setIsAuthenticated(true);
            setLoginError("");
        } else {
            setLoginError("Parola incorecta");
        }
    };

    async function getKey() {
        setApiOpen(true);
        setCopied(false);

        try {
            const response = await fetch("/api/generate-key", { method: "POST" });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate API key.");
            }

            setKey(data.apiKey || "");
        } catch (error) {
            console.error(error);
        }
    }

    const handleCopy = async () => {
        if (!key) return;

        await navigator.clipboard.writeText(key);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[linear-gradient(135deg,#0f0f23_0%,#1e293b_20%,#312e81_40%,#1e1b4b_60%,#0f172a_80%,#1e293b_100%)] p-4">
                <div className="mx-auto flex min-h-screen max-w-md items-center justify-center">
                    <div className="w-full rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
                        <div className="mb-6 text-center">
                            <div className="mx-auto mb-4 inline-flex rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-100">
                                <LockKeyhole size={22} />
                            </div>
                            <h2 className="mb-2 bg-gradient-to-r from-cyan-100 via-white to-slate-300 bg-clip-text text-2xl font-extrabold text-transparent">
                                Acces protejat
                            </h2>
                            <p className="text-sm text-slate-300">Introdu parola pentru a genera chei API si a vedea documentatia corecta.</p>
                        </div>

                        <div className="space-y-4">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-2xl border border-white/10 bg-slate-900/60 p-3 text-white placeholder-slate-400 outline-none transition focus:border-cyan-300/30"
                                placeholder="Parola"
                            />

                            <button
                                onClick={handleLogin}
                                className="w-full rounded-2xl bg-gradient-to-r from-cyan-400/28 to-violet-400/24 px-4 py-3 font-semibold text-white transition hover:from-cyan-400/38 hover:to-violet-400/34"
                            >
                                Autentificare
                            </button>

                            {loginError && (
                                <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-300">
                                    {loginError}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[linear-gradient(135deg,#0f0f23_0%,#1e293b_20%,#312e81_40%,#1e1b4b_60%,#0f172a_80%,#1e293b_100%)] p-4">
            <div className="mx-auto flex max-w-5xl flex-col gap-6 py-8">
                <section className="rounded-[28px] border border-white/10 bg-white/4 p-6 shadow-2xl backdrop-blur-md">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="mb-2 text-[10px] uppercase tracking-[0.34em] text-cyan-100/70">API info</div>
                            <h1 className="bg-gradient-to-r from-cyan-100 via-white to-slate-300 bg-clip-text text-3xl font-extrabold text-transparent">
                                Generate and use your API key
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                                This page documents the real public endpoint exposed by your app so you can integrate it correctly in other apps, scripts, or automations.
                            </p>
                        </div>

                        <button
                            onClick={getKey}
                            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400/28 to-violet-400/24 px-5 text-sm font-semibold text-white transition hover:from-cyan-400/38 hover:to-violet-400/34"
                        >
                            <SquareMousePointer size={16} />
                            Generate API key
                        </button>
                    </div>
                </section>

                {apiOpen && (
                    <section className="rounded-[28px] border border-white/10 bg-white/4 p-6 shadow-2xl backdrop-blur-md">
                        <div className="mb-4 flex items-center gap-3">
                            <KeyRound className="text-cyan-200" size={20} />
                            <h2 className="text-xl font-semibold text-white">Your API key</h2>
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-slate-950/80 p-4 font-mono text-sm text-cyan-200">
                            <span className="min-w-0 flex-1 truncate">{key || "Generating..."}</span>
                            <button
                                type="button"
                                onClick={handleCopy}
                                disabled={!key}
                                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-50"
                            >
                                {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                                {copied ? "Copied" : "Copy"}
                            </button>
                        </div>
                    </section>
                )}

                <section className="rounded-[28px] border border-white/10 bg-white/4 p-6 shadow-2xl backdrop-blur-md">
                    <div className="mb-4 flex items-center gap-3">
                        <Braces className="text-cyan-200" size={20} />
                        <h2 className="text-xl font-semibold text-white">API documentation</h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                            <div className="mb-2 text-[10px] uppercase tracking-[0.28em] text-slate-400">Endpoint</div>
                            <code className="text-sm text-cyan-200">{origin}/api/v1/chat</code>
                        </div>

                        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                            <div className="mb-2 text-[10px] uppercase tracking-[0.28em] text-slate-400">Method</div>
                            <code className="text-sm text-cyan-200">POST</code>
                        </div>
                    </div>

                    <div className="mt-4 rounded-[22px] border border-amber-300/10 bg-amber-300/[0.08] p-4 text-sm leading-6 text-amber-50">
                        <strong>Important:</strong> send the API key in the <code className="rounded bg-black/20 px-1.5 py-0.5">Authorization</code> header as <code className="rounded bg-black/20 px-1.5 py-0.5">Bearer YOUR_API_KEY</code>.
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                            <div className="mb-2 text-[10px] uppercase tracking-[0.28em] text-slate-400">Request body</div>
                            <ul className="space-y-2 text-sm leading-6 text-slate-300">
                                <li><code className="rounded bg-black/20 px-1.5 py-0.5">prompt</code>: required string</li>
                                <li><code className="rounded bg-black/20 px-1.5 py-0.5">model</code>: optional model id like <code className="rounded bg-black/20 px-1.5 py-0.5">{exampleModel}</code></li>
                            </ul>
                            <p className="mt-3 text-sm leading-6 text-slate-400">
                                If you omit <code className="rounded bg-black/20 px-1.5 py-0.5">model</code>, the server uses its current default available model.
                            </p>
                        </div>

                        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                            <div className="mb-2 text-[10px] uppercase tracking-[0.28em] text-slate-400">Response body</div>
                            <ul className="space-y-2 text-sm leading-6 text-slate-300">
                                <li><code className="rounded bg-black/20 px-1.5 py-0.5">success</code>: boolean</li>
                                <li><code className="rounded bg-black/20 px-1.5 py-0.5">model</code>: provider model slug used on the server</li>
                                <li><code className="rounded bg-black/20 px-1.5 py-0.5">provider</code>: provider used for the response</li>
                                <li><code className="rounded bg-black/20 px-1.5 py-0.5">text</code>: final text answer</li>
                                <li><code className="rounded bg-black/20 px-1.5 py-0.5">raw</code>: raw provider payload</li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="mb-2 text-[10px] uppercase tracking-[0.28em] text-slate-400">Headers</div>
                        <pre className="overflow-x-auto rounded-2xl border border-white/8 bg-slate-950/80 p-4 text-xs leading-6 text-cyan-200">{`Content-Type: application/json
Authorization: Bearer <YOUR_API_KEY>`}</pre>
                    </div>

                    <div className="mt-6">
                        <div className="mb-2 text-[10px] uppercase tracking-[0.28em] text-slate-400">Example request JSON</div>
                        <pre className="overflow-x-auto rounded-2xl border border-white/8 bg-slate-950/80 p-4 text-xs leading-6 text-cyan-200">{requestExample}</pre>
                    </div>

                    <div className="mt-6">
                        <div className="mb-2 text-[10px] uppercase tracking-[0.28em] text-slate-400">Example response JSON</div>
                        <pre className="overflow-x-auto rounded-2xl border border-white/8 bg-slate-950/80 p-4 text-xs leading-6 text-cyan-200">{responseExample}</pre>
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                        <div>
                            <div className="mb-2 text-[10px] uppercase tracking-[0.28em] text-slate-400">cURL example</div>
                            <pre className="overflow-x-auto rounded-2xl border border-white/8 bg-slate-950/80 p-4 text-xs leading-6 text-cyan-200">{curlExample}</pre>
                        </div>

                        <div>
                            <div className="mb-2 text-[10px] uppercase tracking-[0.28em] text-slate-400">JavaScript example</div>
                            <pre className="overflow-x-auto rounded-2xl border border-white/8 bg-slate-950/80 p-4 text-xs leading-6 text-cyan-200">{fetchExample}</pre>
                        </div>
                    </div>

                    <div className="mt-6 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                        <div className="mb-2 text-[10px] uppercase tracking-[0.28em] text-slate-400">Notes</div>
                        <ul className="space-y-2 text-sm leading-6 text-slate-300">
                            <li>This public endpoint is <strong>POST only</strong>.</li>
                            <li>The current page documents <code className="rounded bg-black/20 px-1.5 py-0.5">/api/v1/chat</code>, not the internal workspace route.</li>
                            <li>Do not send <code className="rounded bg-black/20 px-1.5 py-0.5">"default"</code> as a model id. Either omit <code className="rounded bg-black/20 px-1.5 py-0.5">model</code> or use a real model id.</li>
                            <li>If the API key is missing or invalid, the endpoint returns <code className="rounded bg-black/20 px-1.5 py-0.5">401</code>.</li>
                        </ul>
                    </div>
                </section>
            </div>
        </div>
    );
}
