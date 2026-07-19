import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const authUser = requestHeaders.get('Remote-User');

  const url = request.nextUrl.pathname;
  if (
    url.startsWith('/_next') ||
    url.startsWith('/api') ||
    url.startsWith('/favicon.ico')
  ) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  if (!authUser) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
