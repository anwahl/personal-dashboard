import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTHELIA_URL = process.env.AUTHELIA_ISSUER || '';
const AUTHELIA_AUTH_ENDPOINT = `${AUTHELIA_URL}/api/authz/forward-auth`;

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const targetUrl = request.url;

  try {
    const authResponse = await fetch(AUTHELIA_AUTH_ENDPOINT, {
      method: 'GET',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'X-Forwarded-Proto': request.nextUrl.protocol.replace(':', ''),
        'X-Forwarded-Host': request.headers.get('host') || '',
        'X-Forwarded-URI': pathname + search,
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || '127.0.0.1',
      },
      cache: 'no-store',
    });

    if (authResponse.status === 200) {
      const response = NextResponse.next();
      
      const remoteUser = authResponse.headers.get('Remote-User');
      const remoteGroups = authResponse.headers.get('Remote-Groups');
      
      if (remoteUser) response.headers.set('x-user', remoteUser);
      if (remoteGroups) response.headers.set('x-groups', remoteGroups);
      
      return response;
    }

    const redirectUrl = new URL(AUTHELIA_URL);
    redirectUrl.searchParams.set('rd', targetUrl);
    
    return NextResponse.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('Authelia proxy authentication failure:', error);
    return new NextResponse('Authentication Service Unavailable', { status: 503 });
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
