import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/app/components/Navigation/Navbar";

export const metadata: Metadata = {
    title: "MULTI : : AI",
    description: "Chatbot AI powered by OpenRouter",
    icons: {
        icon: ["/assets/M_logo.png"],
    },
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
        <body className="bg-gray-100 min-h-screen">
        <Navbar />
        {children}
        </body>
        </html>
    );
}
