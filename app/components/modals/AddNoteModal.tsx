import React, {useState} from 'react'
import {X} from "lucide-react";
import {saveChatResponse} from "@/app/lib/database/firebase";

const AddNoteModal = ({setIsOpen} : {setIsOpen: any}) => {
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')

    const handleCloseModal = () => {
        setIsOpen(false)
        setTitle('')
        setContent('')
    }

    const handleSave = () => {
        if (title.trim() && content.trim()) {
            saveChatResponse(content, title)
            handleCloseModal()
        }
    }
    return (
        <div className="fixed inset-0 bg-gradient-to-br from-black/70 via-gray-900/60 to-purple-900/50 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-white/2 to-white/4 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.45),inset_0_0_25px_rgba(255,255,255,0.03),0_0_10px_rgba(100,170,255,0.05)] text-slate-200 leading-relaxed transition-all duration-300 hover:shadow-[0_4px_30px_rgba(0,0,0,0.55),0_0_12px_rgba(100,170,255,0.08),inset_0_0_35px_rgba(255,255,255,0.05)] max-w-4xl w-11/12 max-h-[80vh] overflow-y-auto relative">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-blue-200 to-blue-200 text-2xl font-bold">
                        Add New Note
                    </h2>
                    <button
                        onClick={handleCloseModal}
                        className="text-white/70 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-white/10"
                    >
                        <X size={24} />
                    </button>
                </div>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Note Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <textarea
                        placeholder="Write your markdown content here..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={10}
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                    <button
                        onClick={handleSave}
                        className="w-full p-3 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white rounded-lg hover:from-indigo-500/30 hover:to-purple-500/30 transition-colors duration-200 font-semibold"
                    >
                        Save Note
                    </button>
                </div>
            </div>
        </div>
    )
}
export default AddNoteModal
