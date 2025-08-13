import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import jwt from "jsonwebtoken";

/**
 * API route to check GitHub authentication status
 */
export async function GET(request: NextRequest) {
  try {
    const localToken = request.cookies.get("local_auth_token")?.value;
    if (localToken) {
      try {
        jwt.verify(
          localToken,
          process.env.LOCAL_AUTH_JWT_SECRET || "dev_local_secret_change_me",
        );
        return NextResponse.json({ authenticated: true });
      } catch (e) {
        // ignore and fall back
      }
    }
    const authenticated = isAuthenticated(request);
    return NextResponse.json({ authenticated });
  } catch (error) {
    console.error("Error checking auth status:", error);
    return NextResponse.json(
      { authenticated: false, error: "Failed to check authentication status" },
      { status: 500 },
    );
  }
}
