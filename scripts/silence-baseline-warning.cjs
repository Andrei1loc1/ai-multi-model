const originalWarn = console.warn.bind(console);

console.warn = (...args) => {
  const message = args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) return arg.message;
      return "";
    })
    .join(" ");

  if (message.includes("[baseline-browser-mapping]")) {
    return;
  }

  originalWarn(...args);
};
