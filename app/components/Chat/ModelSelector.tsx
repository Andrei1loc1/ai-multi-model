import React, { useState } from 'react';
import { getModelsForProvider, ProviderFilter } from '@/app/lib/AImodels/models';
import { ChevronDown } from 'lucide-react';

const providerLabel: Record<ProviderFilter, string> = {
    all: "Best overall",
    openrouter: "OpenRouter only",
    "nvidia-direct": "NVIDIA Direct only",
};

const ModelSelector = ({
    selectedModel,
    setSelectedModel,
    selectedProvider = "all",
}: {
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    selectedProvider?: ProviderFilter;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const models = getModelsForProvider(selectedProvider);
    const selected = models.find((model) => model.id === selectedModel);

    return (
        <div className="relative min-w-[180px]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex h-10 w-full items-center justify-between rounded-2xl border border-white/8 bg-slate-950/75 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/30"
            >
                <span className="truncate">{selected ? selected.label : `Auto (${providerLabel[selectedProvider]})`}</span>
                <ChevronDown className={`ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} size={16} />
            </button>
            {isOpen && (
                <ul className="model-selector-dropdown absolute top-full z-20 mt-2 max-h-52 w-full overflow-y-auto overflow-x-hidden rounded-2xl border border-white/10 bg-slate-950/96 p-1.5 text-white shadow-[0_24px_60px_rgba(2,6,23,0.45)]">
                    <li
                        onClick={() => {
                            setSelectedModel("auto");
                            setIsOpen(false);
                        }}
                        className="cursor-pointer rounded-xl px-3 py-2 text-sm hover:bg-white/8"
                    >
                        Auto ({providerLabel[selectedProvider]})
                    </li>
                    {models.map((model) => (
                        <li
                            key={model.id}
                            onClick={() => {
                                setSelectedModel(model.id);
                                setIsOpen(false);
                            }}
                            className="cursor-pointer rounded-xl px-3 py-2 text-sm hover:bg-white/8"
                        >
                            <div className="truncate">{model.label}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                                {model.provider === "nvidia-direct" ? "NVIDIA Direct" : "OpenRouter"}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ModelSelector;
