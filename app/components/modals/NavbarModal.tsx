import React from 'react'
import Link from "next/link";
import {routes} from "@/app/lib/constants/AllPageRoutes";

const NavbarModal = ({setIsOpen} : {isOpen :boolean, setIsOpen: (isOpen: boolean) => void}) => {
    return (
        <div className="absolute left-0 top-14 w-64 rounded-3xl border border-white/10 bg-slate-950/88 p-3 shadow-[0_28px_80px_rgba(2,6,23,0.58)] backdrop-blur-2xl">
            <div className="mb-3 px-2">
                <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-200/60">Navigation</div>
                <div className="mt-1 text-sm text-slate-400">Move fast between chat, notes and key tools.</div>
            </div>
            <div className="flex flex-col space-y-2">
            { routes.map((route, index) => {
                return (
                    <Link href={route.route} key={index}>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:border-cyan-300/20 hover:bg-cyan-300/10 hover:text-white">
                            {route.title}
                        </button>
                    </Link>
                )
            })}
            </div>
        </div>
    )
}
export default NavbarModal
