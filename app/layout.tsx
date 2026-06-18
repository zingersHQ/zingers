import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { PlayerSync } from "@/components/player-sync";
import { BRAND, pageTitle } from "@/lib/brand";

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", weight: ["400", "500", "700"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.site),
  title: pageTitle(),
  description: "Claim an AI champion, train how it thinks, send it to fight in a 3D world, bet Crowns, and watch it evolve.",
  openGraph: { siteName: BRAND.name, url: BRAND.site },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07060d",
  colorScheme: "dark",
  // keep the visual viewport stable when the mobile keyboard opens
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${grotesk.variable} ${mono.variable}`}>
        <PlayerSync />
        <Nav />
        {children}
      </body>
    </html>
  );
}
