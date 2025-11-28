import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const ChatWindow = ({response, loading} : {response: string | null, loading: boolean}) => {
    const components = {
        code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
                <div className="relative group">
                    <div className="absolute top-3 right-3 text-xs font-medium text-slate-400 bg-slate-800/60 px-2 py-1 rounded-md border border-slate-600/30 uppercase tracking-wide">
                        {match[1]}
                    </div>
                    <SyntaxHighlighter
                        style={{
                            ...oneDark,
                            'pre[class*="language-"]': {
                                ...oneDark['pre[class*="language-"]'],
                                background: 'transparent',
                                margin: 0,
                                padding: 0
                            },
                            'code[class*="language-"]': {
                                ...oneDark['code[class*="language-"]'],
                                background: 'transparent'
                            }
                        }}
                        language={match[1]}
                        PreTag="div"
                        className="!bg-transparent !p-0 !m-0"
                        showLineNumbers={true}
                        lineNumberStyle={{
                            minWidth: '3em',
                            paddingRight: '1em',
                            color: '#64748b',
                            borderRight: '1px solid #334155',
                            marginRight: '1em',
                            textAlign: 'right',
                            userSelect: 'none',
                            background: 'transparent'
                        }}
                        customStyle={{
                            background: 'transparent',
                            padding: 0,
                            margin: 0
                        }}
                        {...props}
                    >
                        {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                </div>
            ) : (
                <code {...props}>
                    {children}
                </code>
            );
        },
    };

    return (
        <>
            {response && (
                <div className="flex-1 mb-4 rounded-2xl min-h-0 shadow-2xl overflow-x-hidden">
                    <div className="max-h-96 rounded-2xl overflow-y-auto text-white whitespace-pre-wrap message-card">
                        <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.45),inset_0_0_25px_rgba(255,255,255,0.03)] text-slate-200 leading-relaxed transition duration-300 hover:shadow-[0_4px_30px_rgba(0,0,0,0.55),0_0_18px_rgba(100,170,255,0.15),inset_0_0_35px_rgba(255,255,255,0.05)] prose prose-invert prose-slate max-w-none">
                            <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
                                {response}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            )}
            {loading && (
                <div className="mb-4 p-4 bg-white/5 rounded-lg shadow-sm text-gray-300 flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-violet-400/30 border-t-blue-200 rounded-full animate-spin"></div>
                    <span>Generating response...</span>
                </div>
            )}
        </>
    )
}
export default ChatWindow
