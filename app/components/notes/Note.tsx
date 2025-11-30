import React, { useState } from 'react';

import {WandSparkles, X, MoreVertical, Trash2} from 'lucide-react';
import MarkDownViewer from "@/app/components/MarkDown/MarkDownViewer";
import { rewriteDocument } from "@/app/lib/chatUtils/sendMessage";
import { deleteChatResponse } from "@/app/lib/database/firebase";

const Note = ({ id, title, respon }: { id: string; title: string; respon: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentRespon, setCurrentRespon] = useState(respon);
    const [menuOpen, setMenuOpen] = useState(false);

    const handleOpenModal = () => {
        setCurrentRespon(respon);
        setIsOpen(true);
        setMenuOpen(false);
    };
    const handleCloseModal = () => setIsOpen(false);

    const handleDelete = () => {
        deleteChatResponse(id);
        setIsOpen(false);
    };

    return (
        <>
            <div
                onClick={handleOpenModal}
                className="relative flex w-64 h-56 bg-white/3 rounded-2xl shadow-2xl items-center justify-center cursor-pointer p-4 overflow-hidden"
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(!menuOpen);
                    }}
                    className="absolute top-2 right-2 text-gray-400 hover:text-white"
                >
                    <MoreVertical size={20} />
                </button>
                {menuOpen && (
                    <div className="absolute top-8 right-2 bg-black/50 rounded-lg p-2 px-4 shadow-lg">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete();
                            }}
                            className="flex items-center gap-2 text-red-400 hover:text-red-300"
                        >
                            <Trash2 size={16} />
                            Delete
                        </button>
                    </div>
                )}
                <h1 className="text-xl text-center font-extrabold bg-gradient-to-r from-purple-200 via-blue-200 to-blue-200 bg-clip-text text-transparent line-clamp-2">{title}</h1>
            </div>

            {isOpen && (
                <div className="fixed inset-0 bg-gradient-to-br from-black/70 via-gray-900/60 to-purple-900/50 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <button
                        onClick={async () => {
                            const newText = await rewriteDocument(id, currentRespon, title, setLoading);
                            if (newText) setCurrentRespon(newText);
                        }}
                        disabled={loading}
                        className="absolute flex items-center gap-2 top-4 py-2 px-6 text-gray-200 text-sm font-bold font-mono tracking-widest bg-white/5 hover:bg-white/15 backdrop-blur-md rounded-full border border-blue-300 disabled:opacity-50">
                        {loading ? 'Rewriting...' : 'AI DOCUMENT REWRITER'}
                        <WandSparkles className="w-4 h-4"/>
                    </button>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-white/2 to-white/4 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.45),inset_0_0_25px_rgba(255,255,255,0.03),0_0_10px_rgba(100,170,255,0.05)] text-slate-300 leading-loose transition-all duration-300 hover:shadow-[0_4px_30px_rgba(0,0,0,0.55),0_0_12px_rgba(100,170,255,0.08),inset_0_0_35px_rgba(255,255,255,0.05)] prose prose-invert prose-slate max-w-4xl max-h-96 w-11/12 max-h-[80vh] overflow-y-auto relative">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 text-2xl font-bold">
                                {title}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-white/70 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-white/10"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <MarkDownViewer respon={currentRespon} />
                    </div>
                </div>
            )}
        </>
    );
};
export default Note;

