import React, { useState } from "react";
import { ChevronDown, Cpu } from "lucide-react";
import { ProviderFilter, ProviderOptions } from "@/app/lib/AImodels/models";

const ProviderSelector = ({
    selectedProvider,
    setSelectedProvider,
}: {
    selectedProvider: ProviderFilter;
    setSelectedProvider: (provider: ProviderFilter) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selected = ProviderOptions.find((option) => option.id === selectedProvider) || ProviderOptions[0];

    return (
        <div className="relative min-w-[160px]">
            <button
                onClick={() => setIsOpen((value) => !value)}
                className="flex h-10 w-full items-center justify-between rounded-2xl border border-white/8 bg-slate-950/75 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/30"
            >
                <span className="flex min-w-0 items-center gap-2 truncate">
                    <Cpu size={14} className="text-cyan-200" />
                    <span className="truncate">{selected.label}</span>
                </span>
                <ChevronDown className={`ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`} size={16} />
            </button>

            {isOpen && (
                <ul className="absolute top-full z-20 mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/96 p-1.5 text-white shadow-[0_24px_60px_rgba(2,6,23,0.45)]">
                    {ProviderOptions.map((option) => (
                        <li
                            key={option.id}
                            onClick={() => {
                                setSelectedProvider(option.id);
                                setIsOpen(false);
                            }}
                            className="cursor-pointer rounded-xl px-3 py-2 text-sm hover:bg-white/8"
                        >
                            {option.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ProviderSelector;
