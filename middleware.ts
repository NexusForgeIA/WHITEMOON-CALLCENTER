import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const expected = await sessionToken(process.env.PANEL_PASSWORD);
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (expected && token === expected) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  if (req.nextUrl.pathname !== "/") {
    url.searchParams.set("from", req.nextUrl.pathname);
  }
  return NextResponse.redirect(url);
}

export const config = {
  // Protege todo excepto /login, las rutas de auth y los assets estáticos.
  matcher: [
    "/((?!login|api/login|api/logout|_next/static|_next/image|favicon.ico).*)",
  ],
};
