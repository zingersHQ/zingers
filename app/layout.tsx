import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { PlayerSync } from "@/components/player-sync";
import { SessionPing } from "@/components/session-ping";
import { BRAND, pageTitle, STORAGE } from "@/lib/brand";

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", weight: ["400", "500", "700"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.site),
  title: pageTitle(),
  description: "Claim an AI champion, train how it thinks, send it to fight in a 3D world, back Crowns, and watch it evolve.",
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

// Applies the saved theme to <html> before first paint so a light-mode reload
// never flashes the dark palette. Kept tiny + inline; mirrors lib/theme.ts.
const themeBoot = `(function(){try{var t=localStorage.getItem("${STORAGE.theme}");document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark");}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className={`${grotesk.variable} ${mono.variable}`}>
        <PlayerSync />
        <SessionPing />
        <Nav />
        {children}
      </body>
    </html>
  );
}
