import React, { useState } from "react";
import { ChevronDown, Zap, Target, GraduationCap, Flame, Sparkles } from "lucide-react";
import { souls } from "@/app/lib/orchestrator/modelProfiles";
import type { SoulType } from "@/app/lib/workspaces/types";

const soulIcons: Record<SoulType, React.ComponentType<{ size?: number; className?: string }>> = {
    default: Zap,
    concise: Target,
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
    const current = souls[soul];
    const CurrentIcon = soulIcons[soul];

    return (
        <div className="relative w-full min-w-0 sm:min-w-[180px]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex h-10 w-full items-center justify-between rounded-2xl border border-white/8 bg-slate-950/75 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-300/30"
            >
                <span className="flex items-center gap-2 truncate">
                    <CurrentIcon size={14} className="text-violet-300/80" />
                    <span>{current.label}</span>
                </span>
                <ChevronDown
                    className={`ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    size={16}
                />
            </button>
            {isOpen && (
                <ul className="soul-selector-dropdown absolute top-full z-20 mt-2 max-h-64 w-full overflow-y-auto overflow-x-hidden rounded-2xl border border-white/10 bg-slate-950/96 p-1.5 text-white shadow-[0_24px_60px_rgba(2,6,23,0.45)]">
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