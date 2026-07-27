import { NextResponse, type NextRequest } from "next/server";
import { BRAND } from "@/lib/brand";
import { isGamePath, isOrgHost, isPublicAsset, ORG_DOC_ROOTS } from "@/lib/org/hosts";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/locales";

const ORG_ORIGIN = BRAND.siteTech.replace(/\/$/, "");
const GAME_ORIGIN = BRAND.site.replace(/\/$/, "");
const ORG_LOCALES = new Set(["es", "zh", "ru", "ja"]);

function withLocaleCookie(res: NextResponse, locale: string) {
  if (isLocale(locale)) {
    res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return res;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublicAsset(pathname)) return NextResponse.next();

  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";

  // ── zingers.org — docs surface ───────────────────────────────────────────
  if (isOrgHost(host)) {
    if (pathname.startsWith("/api/")) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Locale-prefixed docs: /es/bible/… → cookie + rewrite to /org/bible/…
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] && ORG_LOCALES.has(segments[0])) {
      const locale = segments[0];
      const rest = segments.slice(1).join("/");
      const destPath = rest ? `/org/${rest}` : "/org";
      return withLocaleCookie(NextResponse.rewrite(new URL(`${destPath}${search}`, request.url)), locale);
    }

    // Legacy /org/* URLs → clean canonical paths
    if (pathname === "/org" || pathname.startsWith("/org/")) {
      const rest = pathname === "/org" ? "/" : pathname.slice("/org".length);
      return NextResponse.redirect(new URL(`${rest}${search}`, ORG_ORIGIN), 308);
    }

    if (isGamePath(pathname)) {
      return NextResponse.redirect(new URL(`${pathname}${search}`, GAME_ORIGIN));
    }

    // Visual bible gallery (game route) — only on .gg; /gallery aliases it here
    if (pathname === "/gallery" || pathname.startsWith("/gallery/")) {
      const rest = pathname.slice("/gallery".length) || "";
      return NextResponse.rewrite(new URL(`/bible${rest}${search}`, request.url));
    }

    // Public press kit (React page) + legacy /creative → /press
    if (pathname === "/creative" || pathname.startsWith("/creative/")) {
      return NextResponse.redirect(new URL(`/press${search}`, ORG_ORIGIN), 308);
    }
    if (pathname === "/press" || pathname.startsWith("/press/")) {
      return NextResponse.next();
    }

    // Docs home
    if (pathname === "/") {
      return NextResponse.rewrite(new URL(`/org${search}`, request.url));
    }

    // Clean doc URLs → internal /org/* routes
    const root = pathname.split("/").filter(Boolean)[0];
    if (root && ORG_DOC_ROOTS.has(root)) {
      return NextResponse.rewrite(new URL(`/org${pathname}${search}`, request.url));
    }

    return NextResponse.redirect(new URL(`/${search}`, ORG_ORIGIN));
  }

  // ── zingers.gg (and localhost / previews) — game surface ─────────────────
  // Legacy mobile door → shared Ascent URL (query preserved for challenges).
  if (pathname === "/m" || pathname.startsWith("/m/")) {
    return NextResponse.redirect(new URL(`/ascent${search}`, request.url), 308);
  }

  // Legacy short shares used ?c= — prefer clean /ascent/<id> paths.
  if (pathname === "/ascent") {
    const c = request.nextUrl.searchParams.get("c")?.trim() ?? "";
    if (/^[a-zA-Z0-9]{6,16}$/.test(c)) {
      const url = request.nextUrl.clone();
      url.pathname = `/ascent/${c}`;
      url.searchParams.delete("c");
      return NextResponse.redirect(url, 308);
    }
  }

  if (pathname === "/org" || pathname.startsWith("/org/")) {
    const rest = pathname === "/org" ? "" : pathname.slice("/org".length);
    // Keep /org on localhost for dev; redirect in production on the game domain
    const isLocal = host === "localhost" || host === "127.0.0.1";
    const isPreview = host.endsWith(".vercel.app");
    if (!isLocal && !isPreview) {
      return NextResponse.redirect(new URL(`${rest || "/"}${search}`, ORG_ORIGIN), 308);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
