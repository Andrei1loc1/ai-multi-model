export function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
}

export function getErrorStatus(error: unknown, fallback = 500) {
    const message = getErrorMessage(error, "").toLowerCase();

    if (!message) {
        return fallback;
    }

    if (message.includes("not found")) {
        return 404;
    }

    if (
        message.includes("required") ||
        message.includes("only image") ||
        message.includes("empty") ||
        message.includes("too large") ||
        message.includes("does not belong")
    ) {
        return 400;
    }

    return fallback;
}
