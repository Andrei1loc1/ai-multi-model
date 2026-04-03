"use client"

import React, { useState } from 'react'
import NavbarModal from "@/app/components/modals/NavbarModal";
import { PanelLeft } from "lucide-react";

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed top-4 left-4 z-50">
            {isOpen && (
                <NavbarModal isOpen={isOpen} setIsOpen={setIsOpen} />
            )}
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle navigation"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 text-white/70 shadow-[0_16px_40px_rgba(15,23,42,0.35)] backdrop-blur-xl transition-all duration-200 hover:border-cyan-300/20 hover:bg-slate-900/85 hover:text-white"
            >
                <PanelLeft size={18} />
            </button>
        </div>
    )
}
export default Navbar
