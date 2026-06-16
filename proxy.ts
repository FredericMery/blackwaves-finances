import { NextRequest, NextResponse } from "next/server";

const GENERIC_PROTECTED = ["/bureau", "/adherent", "/planning", "/admin"];
const ATHLETE_PROTECTED = ["/athlete"];

const FINANCE_BUREAU_EXACT = ["/bureau", "/bureau/login"];
const FINANCE_BUREAU_PREFIXES = [
  "/bureau/dashboard",
  "/bureau/gerer-asso-2",
  "/bureau/finances",
  "/bureau/budget",
  "/bureau/previsionnel",
  "/bureau/comparatif-budget",
  "/bureau/comptes-athletes",
  "/bureau/preparer-saison",
];

function isAllowedFinanceRoute(pathname: string) {
  return (
    FINANCE_BUREAU_EXACT.includes(pathname) ||
    FINANCE_BUREAU_PREFIXES.some((route) => pathname === route || pathname.startsWith(route + "/"))
  );
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/athlete/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/bureau")) {
    if (pathname === "/bureau/login") {
      return NextResponse.next();
    }

    const authCookie = req.cookies.get("bw_adherent_auth")?.value;
    const roleCookie = req.cookies.get("bw_role")?.value;

    if (authCookie !== "1" || roleCookie !== "bureau") {
      const url = new URL("/bureau/login", req.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }

    if (!isAllowedFinanceRoute(pathname)) {
      return NextResponse.redirect(new URL("/bureau/dashboard", req.url));
    }

    return NextResponse.next();
  }

  const authCookie = req.cookies.get("bw_adherent_auth")?.value;
  const isAuthenticated = authCookie === "1";

  if (ATHLETE_PROTECTED.some((p) => pathname.startsWith(p))) {
    if (!isAuthenticated) {
      const url = new URL("/athlete/login", req.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }

    const roleCookie = req.cookies.get("bw_role")?.value;
    if (roleCookie !== "athlete" && roleCookie !== "bureau") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  }

  if (GENERIC_PROTECTED.some((p) => pathname.startsWith(p))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/bureau/:path*",
    "/adherent/:path*",
    "/planning/:path*",
    "/admin/:path*",
    "/athlete/:path*",
  ],
};
