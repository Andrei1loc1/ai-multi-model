import React from 'react';
import MarkDownViewer from "@/app/components/MarkDown/MarkDownViewer";

const ChatWindow = ({ response, loading }: { response: string | null; loading: boolean }) => {
    return (
        <>
            {response && (
                <div className="flex-1 mb-4 rounded-2xl min-h-0 shadow-2xl overflow-x-hidden">
                    <div className="max-h-96 rounded-2xl overflow-y-auto text-white whitespace-pre-wrap message-card">
                        <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.45),inset_0_0_25px_rgba(255,255,255,0.03)] text-slate-200 leading-relaxed transition duration-300 hover:shadow-[0_4px_30px_rgba(0,0,0,0.55),0_0_18px_rgba(100,170,255,0.15),inset_0_0_35px_rgba(255,255,255,0.05)] prose prose-invert prose-slate max-w-none">
                            <MarkDownViewer respon={response} />
                        </div>
                    </div>
                </div>
            )}
            {loading && (
                <div className="mb-4 p-4 bg-white/5 rounded-lg shadow-sm text-gray-300 flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-violet-400/30 border-t-blue-200 rounded-full animate-spin"></div>
                    <span>Generating response...</span>
                </div>
            )}
        </>
    );
};
export default ChatWindow;
