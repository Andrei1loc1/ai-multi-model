import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Zap, Mic, Target, Feather, GraduationCap, Flame, Sparkles } from "lucide-react";
import { souls } from "@/app/lib/orchestrator/modelProfiles";
import type { SoulType } from "@/app/lib/workspaces/types";

const soulIcons: Record<SoulType, React.ComponentType<{ size?: number; className?: string }>> = {
    default: Zap,
    voice: Mic,
    concise: Target,
    simple: Feather,
    tutor: GraduationCap,
    challenger: Flame,
    creative: Sparkles,
};

const SoulSelector = ({
    soul,
    setSoul,
}: {
    soul: SoulType;
    setSoul: (soul: SoulType) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current = souls[soul];
    const CurrentIcon = soulIcons[soul];

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/8 bg-slate-950/75 px-3.5 text-sm text-white transition hover:border-violet-300/20 hover:bg-slate-900/85"
            >
                <CurrentIcon size={14} className="text-violet-300/80" />
                <span>{current.label}</span>
                <ChevronDown
                    className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                    size={14}
                />
            </button>
            {isOpen && (
                <ul className="soul-selector-dropdown absolute top-full z-20 mt-2 max-h-64 w-56 overflow-y-auto overflow-x-hidden rounded-2xl border border-white/10 bg-slate-950/96 p-1.5 text-white shadow-[0_24px_60px_rgba(2,6,23,0.45)]">
                    {(Object.keys(souls) as SoulType[]).map((key) => {
                        const s = souls[key];
                        const Icon = soulIcons[key];
                        const isSelected = soul === key;
                        return (
                            <li
                                key={key}
                                onClick={() => {
                                    setSoul(key);
                                    setIsOpen(false);
                                }}
                                className={`cursor-pointer rounded-xl px-3 py-2.5 text-sm transition ${
                                    isSelected
                                        ? "bg-violet-400/15 text-violet-200"
                                        : "hover:bg-white/8"
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <Icon
                                        size={15}
                                        className={isSelected ? "text-violet-300" : "text-slate-500"}
                                    />
                                    <div>
                                        <div className="font-medium">{s.label}</div>
                                        <div className="mt-0.5 text-[11px] text-slate-500">
                                            {s.description}
                                        </div>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default SoulSelector;