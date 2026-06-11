"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MessageSquare, Code2 } from "lucide-react";

const navItems = [
    { route: "/chat", title: "Chat", icon: MessageSquare },
    { route: "/notes", title: "Notes", icon: BookOpen },
    { route: "/generateAPI", title: "API", icon: Code2 },
];

export default function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="w-full min-w-0 shrink-0 rounded-[16px] border border-white/8 bg-slate-950/72 px-2 py-1.5 shadow-[0_18px_60px_rgba(2,6,23,0.42)] backdrop-blur-xl sm:rounded-[18px] lg:w-[280px]">
            <ul className="flex items-center justify-center gap-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.route || pathname.startsWith(item.route + "/");
                    const Icon = item.icon;
                    return (
                        <li key={item.route}>
                            <Link
                                href={item.route}
                                className={`inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] transition ${
                                    isActive
                                        ? "bg-cyan-300/15 text-cyan-100"
                                        : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                                }`}
                            >
                                <Icon size={13} />
                                {item.title}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}