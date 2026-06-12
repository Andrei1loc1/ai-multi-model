export async function register() {
    const originalEmit = process.emit.bind(process);
    process.emit = (event: string, ...args: unknown[]) => {
        if (event === "warning" && args[0] instanceof Error) {
            const message = args[0].message || "";
            if (message.includes("url.parse()") && message.includes("DeprecationWarning")) {
                return false;
            }
        }
        return originalEmit(event, ...args);
    };
}