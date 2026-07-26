import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Nav } from "@/components/nav";
import { PlayerSync } from "@/components/player-sync";
import { SessionPing } from "@/components/session-ping";
import { ChunkReloadGuard } from "@/components/chunk-reload-guard";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/locales";
import { BRAND, pageTitle, STORAGE } from "@/lib/brand";

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", weight: ["400", "500", "700"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.site),
  title: pageTitle(),
  description: "Claim an AI champion, train how it thinks, send it to fight in a 3D world, back Crowns, and watch it evolve.",
  openGraph: { siteName: BRAND.name, url: BRAND.site },
  icons: {
    icon: [{ url: "/brand/robot-mark.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/robot-mark.svg" }],
  },
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

// Mirror durable locale preference into the SSR cookie ASAP so refresh / next
// navigation keeps the language the player picked on this origin.
const localeBoot = `(function(){try{var v=localStorage.getItem("${STORAGE.locale}");if(!v){var s=localStorage.getItem("${STORAGE.settings}");if(s){var p=JSON.parse(s);v=p&&p.state&&p.state.locale;}}if(v==="en"||v==="es"||v==="zh"||v==="ru"||v==="ja"){document.cookie="${LOCALE_COOKIE}="+encodeURIComponent(v)+";path=/;max-age=31536000;samesite=lax";document.documentElement.lang=v==="zh"?"zh-Hans":v;}}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const raw = await getLocale();
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const messages = await getMessages();
  const htmlLang = locale === "zh" ? "zh-Hans" : locale;

  return (
    <html lang={htmlLang} data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        <script dangerouslySetInnerHTML={{ __html: localeBoot }} />
      </head>
      <body className={`${grotesk.variable} ${mono.variable}`}>
        <LocaleProvider locale={locale} messages={messages}>
          <ChunkReloadGuard />
          <PlayerSync />
          <SessionPing />
          <Nav />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
