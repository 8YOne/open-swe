import { NextRequest, NextResponse } from "next/server";
import {
  GITHUB_TOKEN_COOKIE,
  GITHUB_INSTALLATION_ID_COOKIE,
} from "@openswe/shared/constants";
import { verifyGithubUser } from "@openswe/shared/github/verify-user";
import jwt from "jsonwebtoken";

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  // Check local JWT token first
  const localToken = request.cookies.get("local_auth_token")?.value;
  if (localToken) {
    try {
      jwt.verify(
        localToken,
        process.env.LOCAL_AUTH_JWT_SECRET || "dev_local_secret_change_me"
      );
      return true;
    } catch {
      // Invalid local token, continue to GitHub check
    }
  }

  // Check GitHub authentication
  const githubToken = request.cookies.get(GITHUB_TOKEN_COOKIE)?.value;
  const installationId = request.cookies.get(GITHUB_INSTALLATION_ID_COOKIE)?.value;
  
  if (githubToken && installationId) {
    const user = await verifyGithubUser(githubToken);
    return !!user;
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const authenticated = await isAuthenticated(request);

  // Redirect authenticated users from home and login to chat
  if (request.nextUrl.pathname === "/" || request.nextUrl.pathname === "/login") {
    if (authenticated) {
      const url = request.nextUrl.clone();
      url.pathname = "/chat";
      return NextResponse.redirect(url);
    }
    // Redirect unauthenticated users from home to login
    if (request.nextUrl.pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // Protect chat routes
  if (request.nextUrl.pathname.startsWith("/chat")) {
    if (!authenticated) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
