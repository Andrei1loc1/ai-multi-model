const STOPWORDS = new Set([
    "a",
    "ai",
    "al",
    "ale",
    "am",
    "ar",
    "as",
    "at",
    "ce",
    "cea",
    "cei",
    "cel",
    "cele",
    "cum",
    "cu",
    "da",
    "de",
    "despre",
    "din",
    "do",
    "este",
    "e",
    "for",
    "i",
    "in",
    "is",
    "it",
    "la",
    "mai",
    "mi",
    "o",
    "on",
    "pe",
    "poza",
    "picture",
    "photo",
    "si",
    "sunt",
    "that",
    "the",
    "this",
    "to",
    "un",
    "una",
    "unde",
    "what",
]);

function tokenize(input: string) {
    return input
        .toLowerCase()
        .split(/[^a-z0-9_./-]+/i)
        .map((token) => token.trim())
        .filter((token) => Boolean(token) && token.length > 1 && !STOPWORDS.has(token));
}

export function scoreTextMatch(query: string, candidate: string) {
    if (!candidate) return 0;

    const queryTokens = tokenize(query);
    if (!queryTokens.length) return 0;

    const haystack = candidate.toLowerCase();
    let score = 0;
    let matchedTokens = 0;

    for (const token of queryTokens) {
        if (haystack === token) {
            score += 8;
            matchedTokens += 1;
        } else if (haystack.includes(token)) {
            score += 3;
            matchedTokens += 1;
        }
    }

    if (matchedTokens === 0) {
        return 0;
    }

    if (queryTokens.length > 1 && haystack.includes(query.toLowerCase())) {
        score += 5;
    }

    const coverageBoost = matchedTokens / queryTokens.length;
    score += coverageBoost >= 0.75 ? 3 : coverageBoost >= 0.5 ? 1 : 0;

    return score;
}

export function scoreRecency(isoDate: string | null | undefined) {
    if (!isoDate) return 0;
    const ageMs = Date.now() - new Date(isoDate).getTime();
    if (Number.isNaN(ageMs)) return 0;
    const dayMs = 1000 * 60 * 60 * 24;
    if (ageMs < dayMs) return 4;
    if (ageMs < 7 * dayMs) return 2;
    if (ageMs < 30 * dayMs) return 1;
    return 0;
}

export function uniqueTopByScore<T extends { score: number }>(
    items: T[],
    keyFn: (item: T) => string,
    limit: number
) {
    const seen = new Set<string>();
    return items
        .sort((a, b) => b.score - a.score)
        .filter((item) => {
            const key = keyFn(item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, limit);
}
