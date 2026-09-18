import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/overlay";
import { AvatarViewerProvider } from "@/components/ui/AvatarViewer";
import "./globals.css";

export const metadata: Metadata = {
  title: "GymFlow — Run your gym. Know your numbers. Grow your community.",
  description:
    "GymFlow is a premium gym management platform for members, trainers, subscriptions, payments, attendance and analytics.",
};

export const viewport: Viewport = {
  themeColor: "#15151A",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router loads this once for the whole app */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-canvas-dark font-sans text-ghost antialiased">
        <AvatarViewerProvider>
          {children}
        </AvatarViewerProvider>
        <Toaster />
      </body>
    </html>
  );
}
