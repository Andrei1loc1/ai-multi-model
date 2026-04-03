import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/app/components/Navigation/Navbar";
import PWARegistrar from "@/app/components/PWA/PWARegistrar";

export const metadata: Metadata = {
    title: "Multi-Model Cloud Agent",
    description: "Installable AI workspace for chat, notes, image analysis, API access, and cloud project context.",
    manifest: "/manifest.webmanifest",
    icons: {
        icon: [
            { url: "/pwa/icon-192.svg", type: "image/svg+xml", sizes: "192x192" },
            { url: "/pwa/icon-512.svg", type: "image/svg+xml", sizes: "512x512" },
            "/assets/M_logo.png",
        ],
        apple: [{ url: "/pwa/icon-192.svg", type: "image/svg+xml" }],
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "AI Workspace",
    },
};

export const viewport: Viewport = {
    themeColor: "#020617",
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
        <body className="bg-gray-100 min-h-screen">
        <PWARegistrar />
        <Navbar />
        {children}
        </body>
        </html>
    );
}
