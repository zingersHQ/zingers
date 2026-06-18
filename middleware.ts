import { NextResponse, type NextRequest } from "next/server";
import { BRAND } from "@/lib/brand";
import { isGamePath, isOrgHost, isPublicAsset, ORG_DOC_ROOTS } from "@/lib/org/hosts";

const ORG_ORIGIN = BRAND.siteTech.replace(/\/$/, "");
const GAME_ORIGIN = BRAND.site.replace(/\/$/, "");

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublicAsset(pathname)) return NextResponse.next();

  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";

  // ── zingers.org — docs surface ───────────────────────────────────────────
  if (isOrgHost(host)) {
    if (pathname.startsWith("/api/")) {
      return new NextResponse("Not found", { status: 404 });
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
