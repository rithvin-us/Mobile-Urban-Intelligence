import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Urban Intelligence — Fleet Sensing Operations",
  description:
    "City road intelligence collected by the public bus fleet: live positions, road defects, congestion, waterlogging and infrastructure faults.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B0E12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="h-full bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
