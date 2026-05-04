import { NextResponse, type NextRequest } from 'next/server';

// routes that require authentication
const PROTECTED_PREFIXES = ['/wallet', '/issuer', '/verifier', '/admin'];

// routes that are only accessible to authenticated users
const AUTH_PAGES = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const refreshToken = request.cookies.get('refreshToken')?.value;
  const accessToken = request.cookies.get('accessToken')?.value;
  const hasSession = Boolean(refreshToken || accessToken);

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some(p => pathname.startsWith(p));

  if (isProtected && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL('/wallet', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
