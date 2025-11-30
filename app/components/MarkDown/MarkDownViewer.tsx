import React from 'react'
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MarkDownViewer = ({respon} : {respon:any}) => {
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
                                padding: 0,
                            },
                            'code[class*="language-"]': {
                                ...oneDark['code[class*="language-"]'],
                                background: 'transparent',
                            },
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
                            background: 'transparent',
                        }}
                        customStyle={{
                            background: 'transparent',
                            padding: 0,
                            margin: 0,
                        }}
                        {...props}
                    >
                        {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                </div>
            ) : (
                <code {...props}>{children}</code>
            );
        },
        ul({ children, ...props }: any) {
            return <ul className="list-disc list-inside space-y-2 ml-4" {...props}>{children}</ul>;
        },
        ol({ children, ...props }: any) {
            return <ol className="list-decimal list-inside space-y-2 ml-4" {...props}>{children}</ol>;
        },
        li({ children, ...props }: any) {
            return <li className="leading-relaxed" {...props}>{children}</li>;
        },
        h1({ children, ...props }: any) {
            return <h1 className="text-3xl font-bold text-purple-300 mb-4 mt-6" {...props}>{children}</h1>;
        },
        h2({ children, ...props }: any) {
            return <h2 className="text-2xl font-bold text-blue-300 mb-3 mt-5" {...props}>{children}</h2>;
        },
        h3({ children, ...props }: any) {
            return <h3 className="text-xl font-semibold text-green-300 mb-2 mt-4" {...props}>{children}</h3>;
        },
        p({ children, ...props }: any) {
            return <p className="mb-4 leading-relaxed" {...props}>{children}</p>;
        },
        blockquote({ children, ...props }: any) {
            return <blockquote className="border-l-4 border-purple-400 pl-4 italic text-slate-300 my-4" {...props}>{children}</blockquote>;
        },
        math({ children, ...props }: any) {
            return (
                <div className="my-4 p-4 bg-slate-800/50 border border-slate-600 rounded-lg text-center overflow-x-auto" {...props}>
                    {children}
                </div>
            );
        },
        inlineMath({ children, ...props }: any) {
            return <span className="mx-1 px-1 py-0.5 bg-slate-700/30 rounded text-sm" {...props}>{children}</span>;
        },
    };

    return (
        <ReactMarkdown
            components={components}
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[[rehypeKatex, {throwOnError: false, errorColor: '#cc0000', output: 'html'}]]}
        >
            {respon}
        </ReactMarkdown>
    )
}
export default MarkDownViewer
