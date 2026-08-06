import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  if (process.env.DISABLE_AUTH) {
    return NextResponse.next();
  }
  
  const session = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  if (!session) {
    const signInUrl = new URL("/api/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

//  "/((?!_next/static|_next/image|favicon.ico).*)",
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
