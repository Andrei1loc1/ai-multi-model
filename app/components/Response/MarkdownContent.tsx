"use client";

import { memo, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy } from "lucide-react";

const syntaxTheme = {
    ...oneDark,
    'pre[class*="language-"]': {
        ...oneDark['pre[class*="language-"]'],
        background: "transparent",
        margin: 0,
        padding: 0,
    },
    'code[class*="language-"]': {
        ...oneDark['code[class*="language-"]'],
        background: "transparent",
    },
};

const codeLineNumberStyle = {
    minWidth: "2.8em",
    paddingRight: "1em",
    color: "#64748b",
    borderRight: "1px solid rgba(148, 163, 184, 0.18)",
    marginRight: "1em",
    textAlign: "right" as const,
    userSelect: "none" as const,
    background: "transparent",
};

const codeCustomStyle = {
    background: "transparent",
    padding: 0,
    margin: 0,
    fontSize: "0.88rem",
    lineHeight: 1.7,
};

const CodeBlock = memo(function CodeBlock({
    language,
    code,
}: {
    language: string | null;
    code: string;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="response-code-shell my-5 overflow-hidden rounded-[22px] border border-white/8 bg-[#09111f] shadow-[0_18px_60px_rgba(2,6,23,0.42)]">
            <div className="flex items-center justify-between border-b border-white/8 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-300/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-500/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-600/70" />
                    <span className="ml-2 text-[11px] uppercase tracking-[0.28em] text-slate-400">
                        {language || "code"}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/[0.08]"
                >
                    {copied ? <Check size={13} className="text-cyan-200" /> : <Copy size={13} />}
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>

            <div className="overflow-x-auto px-4 py-4">
                <SyntaxHighlighter
                    style={syntaxTheme}
                    language={language || undefined}
                    PreTag="div"
                    className="!m-0 !bg-transparent !p-0"
                    showLineNumbers
                    lineNumberStyle={codeLineNumberStyle}
                    customStyle={codeCustomStyle}
                >
                    {code.replace(/\n$/, "")}
                </SyntaxHighlighter>
            </div>
        </div>
    );
});

function MarkdownContent({
    content,
    className = "",
}: {
    content: string;
    className?: string;
}) {
    const components = useMemo(
        () => ({
            code({ className: codeClassName, children, ...props }: any) {
                const match = /language-(\w+)/.exec(codeClassName || "");
                const rawCode = String(children).replace(/\n$/, "");
                const isBlock = Boolean(match?.[1]) || rawCode.includes("\n");

                return isBlock ? (
                    <CodeBlock language={match?.[1] || null} code={rawCode} />
                ) : (
                    <code className="response-inline-code" {...props}>
                        {children}
                    </code>
                );
            },
            h1({ children, ...props }: any) {
                return (
                    <h1 className="response-markdown-heading response-markdown-heading-1" {...props}>
                        {children}
                    </h1>
                );
            },
            h2({ children, ...props }: any) {
                return (
                    <h2 className="response-markdown-heading response-markdown-heading-2" {...props}>
                        {children}
                    </h2>
                );
            },
            h3({ children, ...props }: any) {
                return (
                    <h3 className="response-markdown-heading response-markdown-heading-3" {...props}>
                        {children}
                    </h3>
                );
            },
            p({ children, ...props }: any) {
                return (
                    <p className="response-markdown-paragraph" {...props}>
                        {children}
                    </p>
                );
            },
            ul({ children, ...props }: any) {
                return (
                    <ul className="response-markdown-list response-markdown-list-ul" {...props}>
                        {children}
                    </ul>
                );
            },
            ol({ children, ...props }: any) {
                return (
                    <ol className="response-markdown-list response-markdown-list-ol" {...props}>
                        {children}
                    </ol>
                );
            },
            li({ children, ...props }: any) {
                return (
                    <li className="response-markdown-list-item" {...props}>
                        {children}
                    </li>
                );
            },
            blockquote({ children, ...props }: any) {
                return (
                    <blockquote className="response-markdown-quote" {...props}>
                        {children}
                    </blockquote>
                );
            },
            table({ children, ...props }: any) {
                return (
                    <div className="response-table-wrap">
                        <table className="response-table" {...props}>
                            {children}
                        </table>
                    </div>
                );
            },
            thead({ children, ...props }: any) {
                return <thead className="response-table-head" {...props}>{children}</thead>;
            },
            th({ children, ...props }: any) {
                return <th className="response-table-th" {...props}>{children}</th>;
            },
            td({ children, ...props }: any) {
                return <td className="response-table-td" {...props}>{children}</td>;
            },
            hr(props: any) {
                return <hr className="response-divider" {...props} />;
            },
            a({ children, ...props }: any) {
                return (
                    <a className="response-markdown-link" {...props}>
                        {children}
                    </a>
                );
            },
        }),
        []
    );

    return (
        <div className={`response-markdown ${className}`.trim()}>
            <ReactMarkdown
                components={components}
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[[rehypeKatex, { throwOnError: false, errorColor: "#cc0000", output: "html" }]]}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

export default memo(MarkdownContent);
