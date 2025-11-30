"use client"

import React, { useState } from 'react'
import NavbarModal from "@/app/components/modals/NavbarModal";

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed top-4 left-2 sm:left-4 flex flex-row items-center z-50">
            <div className="w-1 sm:w-2 h-24 sm:h-32 bg-gradient-to-b from-purple-500/20 to-blue-500/20 rounded-full shadow-lg border border-white/10"></div>
            {isOpen && (
                <NavbarModal isOpen={isOpen} setIsOpen={setIsOpen} />
            )}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="ml-2 sm:ml-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm px-2 sm:px-3 py-8 sm:py-12 items-center justify-center rounded-xl border border-white/10 shadow-lg text-white/60 text-base sm:text-lg font-bold hover:text-white hover:from-purple-600/30 hover:to-blue-600/30 transition-all duration-300 transform hover:scale-105"
                >
                    {isOpen ? '<' : '>'}
                </button>
        </div>
    )
}
export default Navbar
