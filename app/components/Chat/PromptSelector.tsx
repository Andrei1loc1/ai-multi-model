import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const PromptSelector = ({ selectedPrompt, setSelectedPrompt }: { selectedPrompt: string, setSelectedPrompt: (prompt: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const prompts = ["instant", "detailed", "human", "math", "teoretic"];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="px-4 py-2 text-white rounded-xl shadow-2xl bg-white/5 outline-none focus:bg-white/10 flex items-center justify-between w-full"
            >
                {selectedPrompt}
                <ChevronDown className={`ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} size={16} />
            </button>
            {isOpen && (
                <ul className="absolute top-full mt-1 w-48 bg-black/40 text-white rounded-xl shadow-2xl max-h-40 overflow-y-auto overflow-x-hidden z-10 prompt-selector-dropdown">
                    {prompts.map((prompt) => (
                        <li
                            key={prompt}
                            onClick={() => {
                                setSelectedPrompt(prompt);
                                setIsOpen(false);
                            }}
                            className="px-4 py-2 hover:bg-white/10 cursor-pointer"
                        >
                            {prompt}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default PromptSelector;