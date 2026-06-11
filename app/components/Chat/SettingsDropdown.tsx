import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { getModelsForProvider, type ProviderFilter } from "@/app/lib/AImodels/models";
import ModelSelector from "@/app/components/Chat/ModelSelector";
import ProviderSelector from "@/app/components/Chat/ProviderSelector";
import SoulSelector from "@/app/components/Chat/SoulSelector";
import type { SoulType } from "@/app/lib/workspaces/types";

const SettingsDropdown = ({
    selectedProvider,
    setSelectedProvider,
    selectedModel,
    setSelectedModel,
    soul,
    setSoul,
    showSoul,
}: {
    selectedProvider: ProviderFilter;
    setSelectedProvider: (p: ProviderFilter) => void;
    selectedModel: string;
    setSelectedModel: (m: string) => void;
    soul: SoulType;
    setSoul: (s: SoulType) => void;
    showSoul: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

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
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/8 bg-slate-950/75 px-3.5 text-sm text-white transition hover:border-cyan-300/20 hover:bg-slate-900/85"
            >
                <Settings2 size={15} />
                <span className="hidden sm:inline">Settings</span>
                <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-white/10 bg-slate-950/98 p-3 shadow-[0_24px_60px_rgba(2,6,23,0.5)]">
                    <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-[10px] uppercase tracking-[0.24em] text-slate-500">Provider</label>
                            <ProviderSelector
                                selectedProvider={selectedProvider}
                                setSelectedProvider={setSelectedProvider}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[10px] uppercase tracking-[0.24em] text-slate-500">Model</label>
                            <ModelSelector
                                selectedModel={selectedModel}
                                setSelectedModel={setSelectedModel}
                                selectedProvider={selectedProvider}
                            />
                        </div>
                        {showSoul && (
                            <div>
                                <label className="mb-1 block text-[10px] uppercase tracking-[0.24em] text-slate-500">Soul</label>
                                <SoulSelector
                                    soul={soul}
                                    setSoul={setSoul}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsDropdown;