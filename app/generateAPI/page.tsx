"use client"
import React, { useState } from 'react';
import {Braces, Copy, Check, SquareMousePointer} from "lucide-react";

const Page = () => {
    const [apiOpen, setApiOpen] = useState(false);
    const [key, setKey] = useState("");
    const [copied, setCopied] = useState(false);

    async function getKey() {
        setApiOpen(true);
        setCopied(false);
        try {
            const response = await fetch("/api/generate-key", { method: 'POST' });
            const data = await response.json();
            setKey(data.apiKey);
        } catch (err) {
            console.log(err);
        }
    }

    const handleCopy = () => {
        if (key) {
            navigator.clipboard.writeText(key).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    return (
        <div className="min-h-screen p-4 flex flex-col items-center pt-10 bg-gray-900 bg-[linear-gradient(135deg,#0f0f23_0%,#1e293b_20%,#312e81_40%,#1e1b4b_60%,#0f172a_80%,#1e293b_100%)]">
            <div className="w-full max-w-4xl bg-white/3 p-6 rounded-lg shadow-2xl items-center justify-center">
                <h1 className="text-2xl font-extrabold bg-gradient-to-r from-purple-200 via-blue-200 to-blue-200 bg-clip-text text-transparent drop-shadow-lg">
                    Generate multi-model <span className="font-mono">API KEY</span>
                </h1>
            </div>
            <div className="w-full mt-10 max-w-4xl bg-white/3 p-6 rounded-lg shadow-2xl items-center justify-center">
                <div className="flex flex-row gap-2 items-center">
                    <button
                        onClick={getKey}
                        className="px-6 py-2 flex items-center text-base rounded-xl tracking-wider text-white bg-[linear-gradient(135deg,theme(colors.purple.500/0.2),theme(colors.indigo.500/0.15),theme(colors.purple.400/0.2))] shover:from-purple-500/30 hover:via-indigo-500/25 hover:to-purple-400/30 transition hover:scale-102 transition-all duration-300"
                    >   <SquareMousePointer  className="mr-2"/>
                        <span className="text-lg font-bold font-mono">{'CLICK '}</span>
                    </button>
                    <span className="font-mono text-gray-300"> to generate API Key</span>
                </div>
                                 {apiOpen && (<div className="mt-8 p-6 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 rounded-xl shadow-2xl backdrop-blur-sm">
                                         <div className="flex items-center gap-3 mb-4">
                                             <Braces className="w-6 h-6 text-purple-300" />
                                             <h2 className="text-xl font-semibold text-white">Your API Key</h2>
                                         </div>
                                         <div className="bg-gray-900/80 flex justify-between items-center p-4 rounded-lg font-mono text-violet-300 text-sm overflow-x-auto shadow-inner">
                                             <span className="truncate">{key}</span>
                                             {copied ? (
                                                 <div className="flex items-center gap-2">
                                                     <Check className="w-5 h-5 text-green-400" />
                                                     <span className="text-green-400 text-xs">Copied!</span>
                                                 </div>
                                             ) : (
                                                 <Copy
                                                     className="hover:text-gray-400 active:scale-90 active:text-violet-300 transition-all duration-100 cursor-pointer"
                                                     onClick={handleCopy}
                                                 />
                                             )}
                                         </div>
                                     </div>
                                 )}
                                 {apiOpen && (
                                    <div className="mt-8 p-6 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 rounded-xl shadow-2xl backdrop-blur-sm">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Braces className="w-6 h-6 text-purple-300" />
                                            <h2 className="text-xl font-semibold text-white">How to use your API Key</h2>
                                        </div>
                                        <p className="text-sm text-gray-300 mb-4">
                                            Use your generated API key to access the AI chat functionality from your applications.
                                            Make a <code className="bg-gray-800 p-1 rounded">POST</code> request to the endpoint <code className="bg-gray-800 p-1 rounded">/api/v1/chat</code>.
                                        </p>
                                        <p className="text-sm text-gray-300 mb-2">
                                            Include your API key in the <code className="bg-gray-800 p-1 rounded">Authorization</code> header:
                                        </p>
                                        <pre className="bg-gray-900/80 p-3 rounded-lg font-mono text-violet-300 text-xs overflow-x-auto mb-4">
                                            Authorization: Bearer {'<YOUR_API_KEY>'}
                                        </pre>
                                        <p className="text-sm text-gray-300 mb-2">
                                            The request body should be a JSON object with <code className="bg-gray-800 p-1 rounded">prompt</code> and optional <code className="bg-gray-800 p-1 rounded">model</code> fields:
                                        </p>
                                        <pre className="bg-gray-900/80 p-3 rounded-lg font-mono text-violet-300 text-xs overflow-x-auto mb-4">
                                            {`
{
  "prompt": "Your question for the AI",
  "model": "default"
}`}
                                        </pre>
                                        <p className="text-sm text-gray-300 mb-2">
                                            Example using <code className="bg-gray-800 p-1 rounded">curl</code>:
                                        </p>
                                        <pre className="bg-gray-900/80 p-3 rounded-lg font-mono text-violet-300 text-xs overflow-x-auto">
                                            {`curl -X POST \\
              http://localhost:3000/api/v1/chat \\
              -H "Content-Type: application/json" \\
              -H "Authorization: Bearer <YOUR_API_KEY>" \\
              -d '{ "prompt": "Tell me about AI", "model": "default" }'`}
                                        </pre>
                                    </div>
                                )}            </div>
        </div>
    );
}
export default Page;
