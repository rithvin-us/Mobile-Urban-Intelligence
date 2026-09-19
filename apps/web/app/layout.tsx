import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "UrbanIntelligence - SIH26124 AI Sensing Platform",
  description: "AI-powered onboard + centralized urban sensing platform using public transport buses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <Navbar />
        <main className="flex-1 p-4 md:p-6 container mx-auto max-w-7xl space-y-6">
          {children}
        </main>
      </body>
    </html>
  );
}
