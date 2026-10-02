import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, isValidSession } from "./lib/auth";

export async function proxy(request: NextRequest) {
  if (await isValidSession(request.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Signed out" }, { status: 401 });
  }
  const url = new URL("/login", request.url);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest).*)"],
};
