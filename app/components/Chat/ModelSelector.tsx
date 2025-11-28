import React, { useState } from 'react';
import { AIModels } from '@/app/lib/models';
import { ChevronDown } from 'lucide-react';

const ModelSelector = ({ selectedModel, setSelectedModel }: { selectedModel: string, setSelectedModel: (model: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const models = ["auto", ...AIModels.filter(m => m.active).map(m => m.id)];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="px-4 py-2 text-white rounded-xl shadow-2xl bg-white/5 outline-none focus:bg-white/10 flex items-center justify-between w-full"
            >
                {selectedModel}
                <ChevronDown className={`ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} size={16} />
            </button>
            {isOpen && (
                <ul className="absolute top-full mt-1 w-48 bg-black/40 text-white rounded-xl shadow-2xl max-h-40 overflow-y-auto overflow-x-hidden z-10 model-selector-dropdown">
                    {models.map((model) => (
                        <li
                            key={model}
                            onClick={() => {
                                setSelectedModel(model);
                                setIsOpen(false);
                            }}
                            className="px-4 py-2 hover:bg-white/10 cursor-pointer"
                        >
                            {model}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ModelSelector;
