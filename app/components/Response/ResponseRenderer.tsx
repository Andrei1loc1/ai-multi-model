"use client";

import { memo, useMemo } from "react";
import {
    AlertTriangle,
    ArrowRight,
    Info,
    Lightbulb,
    Sparkles,
} from "lucide-react";
import MarkdownContent from "@/app/components/Response/MarkdownContent";
import { parseResponse } from "@/app/lib/response/parseResponse";
import type { ResponseBlock, ResponseCalloutTone } from "@/app/lib/response/types";

const calloutToneMap: Record<
    ResponseCalloutTone,
    { icon: typeof Info; className: string }
> = {
    important: {
        icon: Sparkles,
        className: "response-callout response-callout-important",
    },
    warning: {
        icon: AlertTriangle,
        className: "response-callout response-callout-warning",
    },
    note: {
        icon: Info,
        className: "response-callout response-callout-note",
    },
    recommendation: {
        icon: Lightbulb,
        className: "response-callout response-callout-recommendation",
    },
    "next-step": {
        icon: ArrowRight,
        className: "response-callout response-callout-next-step",
    },
};

function renderBlock(block: ResponseBlock, index: number) {
    switch (block.type) {
        case "lead":
            return (
                <section key={`lead-${index}`} className="response-lead">
                    <MarkdownContent content={block.content} />
                </section>
            );
        case "heading":
            return (
                <section key={`heading-${index}`} className="response-section-heading-wrap">
                    <div className="response-section-kicker">Section</div>
                    <h2 className="response-section-heading">{block.text}</h2>
                </section>
            );
        case "steps":
            return (
                <section key={`steps-${index}`} className="response-card">
                    <div className="response-card-label">Steps</div>
                    <div className="response-steps">
                        {block.items.map((item, itemIndex) => (
                            <div key={`${item}-${itemIndex}`} className="response-step-item">
                                <div className="response-step-badge">{itemIndex + 1}</div>
                                <div className="response-step-content">
                                    <MarkdownContent content={item} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            );
        case "key-points":
            return (
                <section key={`key-points-${index}`} className="response-card">
                    <div className="response-card-label">Key Points</div>
                    <div className="response-key-points">
                        {block.items.map((item, itemIndex) => (
                            <div key={`${item}-${itemIndex}`} className="response-key-point-item">
                                <span className="response-key-point-dot" />
                                <div className="response-key-point-content">
                                    <MarkdownContent content={item} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            );
        case "callout": {
            const toneConfig = calloutToneMap[block.tone];
            const Icon = toneConfig.icon;
            return (
                <section key={`callout-${index}`} className={toneConfig.className}>
                    <div className="response-callout-header">
                        <Icon size={16} />
                        <span>{block.title}</span>
                    </div>
                    <MarkdownContent content={block.content} />
                </section>
            );
        }
        case "code":
            return (
                <section key={`code-${index}`} className="response-code-block">
                    <MarkdownContent
                        content={`\`\`\`${block.language || ""}\n${block.content}\n\`\`\``}
                    />
                </section>
            );
        case "table":
            return (
                <section key={`table-${index}`} className="response-card response-card-table">
                    <MarkdownContent content={block.content} />
                </section>
            );
        case "quote":
            return (
                <section key={`quote-${index}`} className="response-editorial-quote">
                    <MarkdownContent content={block.content} />
                </section>
            );
        case "markdown":
            return (
                <section key={`markdown-${index}`} className="response-flow-block">
                    <MarkdownContent content={block.content} />
                </section>
            );
        default:
            return null;
    }
}

function ResponseRenderer({
    content,
    compact = false,
    headerActions,
}: {
    content: string;
    compact?: boolean;
    headerActions?: React.ReactNode;
}) {
    const blocks = useMemo(() => parseResponse(content), [content]);

    return (
        <div className={`response-surface ${compact ? "response-surface-compact" : ""}`.trim()}>
            <div className="response-surface-header response-surface-header-minimal">
                <div className="response-surface-header-inline">
                    <div className="response-surface-badge">AI Answer</div>
                    {headerActions}
                </div>
            </div>

            <div className="response-surface-body">
                {blocks.length ? blocks.map(renderBlock) : <MarkdownContent content={content} />}
            </div>
        </div>
    );
}

export default memo(ResponseRenderer);
