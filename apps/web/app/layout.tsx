import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/*
 * Archivo is a grotesque drawn for signage and dense tabular settings, which is
 * what this console is; IBM Plex Mono carries every number so telemetry columns
 * stay aligned while values change.
 */
const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ui",
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Urban Intelligence — Fleet Sensing Operations",
  description:
    "City road intelligence collected by the public bus fleet: live positions, road defects, congestion, waterlogging and infrastructure faults.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0E1216",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${archivo.variable} ${plexMono.variable}`}>
      <body className="h-full bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
