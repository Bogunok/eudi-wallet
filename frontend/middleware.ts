import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/wallet', '/issuer', '/verifier', '/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const accessToken = request.cookies.get('accessToken')?.value;
  const hasSession = Boolean(refreshToken || accessToken);

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));

  if (isProtected && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
