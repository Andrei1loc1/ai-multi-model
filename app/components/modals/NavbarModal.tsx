import React from 'react'
import Link from "next/link";
import {routes} from "@/app/lib/constants/AllPageRoutes";

const NavbarModal = ({isOpen, setIsOpen} : {isOpen :boolean, setIsOpen: any}) => {
    return (
        <div className="flex flex-col space-y-2 sm:space-y-3 ml-2 p-3 sm:p-4 bg-white/0 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl max-w-xs sm:max-w-sm">
            { routes.map((route, index) => {
                return (
                    <Link href={route.route} key={index}>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full text-xs sm:text-sm font-bold font-mono tracking-wider px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-white bg-gradient-to-r from-indigo-500/20 to-none hover:from-indigo-500/30 hover:to-indigo-500/5 backdrop-blur-sm border border-white/10 shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_20px_rgba(147,51,234,0.3)]">
                            {route.title}
                        </button>
                    </Link>
                )
            })}
        </div>
    )
}
export default NavbarModal
