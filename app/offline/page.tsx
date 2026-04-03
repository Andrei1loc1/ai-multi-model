import Link from "next/link";

export default function OfflinePage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
            <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_30px_90px_rgba(2,6,23,0.45)] backdrop-blur-xl">
                <div className="mb-3 text-[11px] uppercase tracking-[0.32em] text-cyan-200/60">Offline</div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white">
                    The app shell is available, but the network is offline.
                </h1>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                    You can reopen pages that were already cached. Live AI responses, uploads, and cloud data need an active connection.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Link
                        href="/chat"
                        className="inline-flex items-center justify-center rounded-full border border-cyan-300/18 bg-cyan-300/[0.12] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-300/[0.18]"
                    >
                        Open Chat
                    </Link>
                    <Link
                        href="/notes"
                        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
                    >
                        Open Notes
                    </Link>
                </div>
            </div>
        </main>
    );
}
