import React, {useState} from 'react'
import {X} from "lucide-react";
import {saveChatResponse} from "@/app/lib/database/firebase";

const SaveResponseModal = ({ response, setIsSaveModalOpen } : {response: any, setIsSaveModalOpen: any}) => {
    const [title, setTitle] = useState('');

    const handleConfirmSave = () => {
        if (response && title.trim()) {
            saveChatResponse(response, title.trim());
            setIsSaveModalOpen(false);
            setTitle('');
        }
    };
    const handleCloseSaveModal = () => {
        setIsSaveModalOpen(false);
        setTitle('');
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-white/2 to-white/4 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.45),inset_0_0_25px_rgba(255,255,255,0.03),0_0_10px_rgba(100,170,255,0.05)] transition-all duration-300 hover:shadow-[0_4px_30px_rgba(0,0,0,0.55),0_0_12px_rgba(100,170,255,0.08),inset_0_0_35px_rgba(255,255,255,0.05)] border border-white/20 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-bold text-white">Save Note</h4>
                    <button
                        onClick={handleCloseSaveModal}
                        className="text-white/70 hover:text-white p-1"
                    >
                        <X size={24} />
                    </button>
                </div>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter note title..."
                    className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400 mb-4"
                />
                <button
                    onClick={handleConfirmSave}
                    disabled={!title.trim()}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                    Save Note
                </button>
            </div>
        </div>
    )
}
export default SaveResponseModal
