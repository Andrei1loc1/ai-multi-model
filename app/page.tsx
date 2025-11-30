import Link from "next/link";

export default function Home() {
    return (
        <main className="min-h-screen p-4 flex flex-col items-center justify-center bg-gray-900 bg-[linear-gradient(135deg,#0f0f23_0%,#1e293b_20%,#312e81_40%,#1e1b4b_60%,#0f172a_80%,#1e293b_100%)]">
            <h1 className="mb-10 text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-purple-200 via-blue-200 to-blue-200 bg-clip-text text-transparent drop-shadow-lg text-center">
                Multi-Model AI Chat
            </h1>

            <Link
                href="/chat"
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-indigo-600/40  to-none text-white rounded-full shadow-lg hover:shadow-2xl hover:scale-110 transition-all duration-300 focus:outline-none animate-pulse hover:animate-none font-mono tracking-widest font-bold text-lg sm:text-xl"
            >
                {'<'} OPEN CHAT {'>'}
            </Link>
            <span className="text-gray-500 mt-5 text-sm sm:text-base">or</span>
            <Link
                href="/generateAPI"
                className="px-4 py-2 mt-5 bg-gradient-to-r from-purple-600/30  to-none text-white rounded-full shadow-lg hover:shadow-2xl hover:scale-110 transition-all duration-300 focus:outline-none  hover:animate-none font-mono tracking-widest font-bold text-sm sm:text-base"
            >
                {'<'} API KEY {'>'}
            </Link>
        </main>
    );
}
