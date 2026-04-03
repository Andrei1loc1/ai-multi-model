import type { ResponseBlock, ResponseCalloutTone } from "@/app/lib/response/types";

type Token =
    | { type: "text"; content: string }
    | { type: "code"; content: string; language: string | null };

const CALLOUT_PATTERNS: Array<{ tone: ResponseCalloutTone; matcher: RegExp; title: string }> = [
    { tone: "important", matcher: /^important\s*[:\-]\s*/i, title: "Important" },
    { tone: "warning", matcher: /^warning\s*[:\-]\s*/i, title: "Warning" },
    { tone: "note", matcher: /^note\s*[:\-]\s*/i, title: "Note" },
    { tone: "recommendation", matcher: /^recommendation\s*[:\-]\s*/i, title: "Recommendation" },
    { tone: "next-step", matcher: /^next\s*step\s*[:\-]\s*/i, title: "Next Step" },
];

function tokenizeResponse(input: string): Token[] {
    const lines = input.replace(/\r\n/g, "\n").split("\n");
    const tokens: Token[] = [];
    let textBuffer: string[] = [];
    let codeBuffer: string[] = [];
    let codeLanguage: string | null = null;
    let inCode = false;

    const flushText = () => {
        const content = textBuffer.join("\n").trim();
        if (content) {
            tokens.push({ type: "text", content });
        }
        textBuffer = [];
    };

    const flushCode = () => {
        const content = codeBuffer.join("\n").replace(/\n+$/, "");
        tokens.push({ type: "code", content, language: codeLanguage });
        codeBuffer = [];
        codeLanguage = null;
    };

    for (const line of lines) {
        const fenceMatch = line.trim().match(/^```([\w.+-]+)?\s*$/);
        if (fenceMatch) {
            if (!inCode) {
                flushText();
                inCode = true;
                codeLanguage = fenceMatch[1] || null;
            } else {
                flushCode();
                inCode = false;
            }
            continue;
        }

        if (inCode) {
            codeBuffer.push(line);
        } else {
            textBuffer.push(line);
        }
    }

    if (inCode) {
        flushCode();
    } else {
        flushText();
    }

    return tokens;
}

function splitTextIntoGroups(content: string): string[] {
    return content
        .split(/\n\s*\n/g)
        .map((group) => group.trim())
        .filter(Boolean);
}

function isOrderedList(group: string) {
    const lines = group.split("\n").map((line) => line.trim()).filter(Boolean);
    return lines.length > 1 && lines.every((line) => /^\d+\.\s+/.test(line));
}

function isBulletList(group: string) {
    const lines = group.split("\n").map((line) => line.trim()).filter(Boolean);
    return lines.length > 1 && lines.every((line) => /^[-*+]\s+/.test(line));
}

function isQuote(group: string) {
    const lines = group.split("\n").map((line) => line.trim()).filter(Boolean);
    return lines.length > 0 && lines.every((line) => line.startsWith(">"));
}

function isMarkdownTable(group: string) {
    const lines = group.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return false;
    return /^\|?.+\|.+\|?$/.test(lines[0]) && /^[:\-\s|]+$/.test(lines[1]);
}

function parseHeading(group: string) {
    const match = group.match(/^(#{1,6})\s+(.+)$/);
    if (!match) return null;
    return {
        level: match[1].length,
        text: normalizeStructuralText(match[2]),
    };
}

function parseEmphasisHeading(group: string) {
    const match = group.trim().match(/^\*\*(.+?)\*\*:?\s*$/);
    if (!match) return null;

    return {
        level: 3,
        text: normalizeStructuralText(match[1]),
    };
}

function parseCallout(group: string) {
    const normalized = group.trim();
    for (const rule of CALLOUT_PATTERNS) {
        if (rule.matcher.test(normalized)) {
            return {
                tone: rule.tone,
                title: rule.title,
                content: normalized.replace(rule.matcher, "").trim(),
            };
        }
    }
    return null;
}

function normalizeListItem(line: string) {
    return line.replace(/^(\d+\.|[-*+])\s+/, "").trim();
}

function normalizeStructuralText(text: string) {
    const trimmed = text.trim();
    const emphasisOnlyMatch = trimmed.match(/^\*\*(.+?)\*\*:?\s*$/);
    const normalized = (emphasisOnlyMatch ? emphasisOnlyMatch[1] : trimmed).trim();
    return normalized.replace(/:\s*$/, "").trim();
}

function classifyGroup(group: string): ResponseBlock[] {
    const heading = parseHeading(group);
    if (heading) {
        return [{ type: "heading", level: heading.level, text: heading.text }];
    }

    const emphasisHeading = parseEmphasisHeading(group);
    if (emphasisHeading) {
        return [{ type: "heading", level: emphasisHeading.level, text: emphasisHeading.text }];
    }

    const callout = parseCallout(group);
    if (callout) {
        return [
            {
                type: "callout",
                tone: callout.tone,
                title: callout.title,
                content: callout.content,
            },
        ];
    }

    if (isMarkdownTable(group)) {
        return [{ type: "table", content: group }];
    }

    if (isQuote(group)) {
        return [{ type: "quote", content: group.replace(/^>\s?/gm, "").trim() }];
    }

    if (isOrderedList(group)) {
        return [
            {
                type: "steps",
                items: group
                    .split("\n")
                    .map((line) => normalizeListItem(line.trim()))
                    .filter(Boolean),
            },
        ];
    }

    if (isBulletList(group)) {
        return [
            {
                type: "key-points",
                items: group
                    .split("\n")
                    .map((line) => normalizeListItem(line.trim()))
                    .filter(Boolean),
            },
        ];
    }

    const lines = group.split("\n");
    if (lines.length > 1) {
        const firstHeading = parseHeading(lines[0].trim()) || parseEmphasisHeading(lines[0].trim());
        const remainder = lines.slice(1).join("\n").trim();
        const blocks: ResponseBlock[] = [];
        if (firstHeading) {
            blocks.push({ type: "heading", level: firstHeading.level, text: firstHeading.text });
        }
        if (firstHeading && remainder) {
            blocks.push(...classifyGroup(remainder));
            return blocks;
        }
    }

    return [{ type: "markdown", content: group }];
}

function promoteLeadBlock(blocks: ResponseBlock[]): ResponseBlock[] {
    const firstContentIndex = blocks.findIndex((block) => block.type === "markdown");
    if (firstContentIndex !== 0) {
        return blocks;
    }

    const first = blocks[0];
    if (first.type !== "markdown") {
        return blocks;
    }

    const wordCount = first.content.split(/\s+/).filter(Boolean).length;
    const lineCount = first.content.split("\n").filter(Boolean).length;
    if (wordCount < 12 || wordCount > 80 || lineCount > 3) {
        return blocks;
    }

    return [{ type: "lead", content: first.content }, ...blocks.slice(1)];
}

export function parseResponse(input: string): ResponseBlock[] {
    const trimmed = input.trim();
    if (!trimmed) {
        return [];
    }

    const tokens = tokenizeResponse(trimmed);
    const blocks: ResponseBlock[] = [];

    for (const token of tokens) {
        if (token.type === "code") {
            blocks.push({
                type: "code",
                language: token.language,
                content: token.content,
            });
            continue;
        }

        for (const group of splitTextIntoGroups(token.content)) {
            blocks.push(...classifyGroup(group));
        }
    }

    return promoteLeadBlock(blocks);
}
