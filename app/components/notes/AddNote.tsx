"use client"

import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { saveChatResponse } from '@/app/lib/database/firebase'
import AddNoteModal from "@/app/components/modals/AddNoteModal";

const AddNote = () => {
    const [isOpen, setIsOpen] = useState(false)

    const handleOpenModal = () => setIsOpen(true)

    return (
        <>
            <div
                onClick={handleOpenModal}
                className="flex w-64 h-56 bg-white/3 rounded-2xl shadow-2xl items-center justify-center cursor-pointer"
            >
                <div className="bg-white/3 rounded-full p-4"><Plus className="text-gray-200 w-7 h-7" /></div>
            </div>

            {isOpen && (
                <AddNoteModal setIsOpen={setIsOpen} />
            )}
        </>
    )
}
export default AddNote
