import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Multi-Model Cloud Agent",
        short_name: "AI Workspace",
        description: "Installable AI workspace for chat, notes, API access, and cloud project context.",
        start_url: "/chat",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#020617",
        theme_color: "#020617",
        categories: ["productivity", "developer tools", "utilities"],
        lang: "en",
        icons: [
            {
                src: "/pwa/icon-192.svg",
                sizes: "192x192",
                type: "image/svg+xml",
                purpose: "any",
            },
            {
                src: "/pwa/icon-512.svg",
                sizes: "512x512",
                type: "image/svg+xml",
                purpose: "maskable",
            },
        ],
    };
}
