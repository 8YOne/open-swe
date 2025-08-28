import { NextRequest, NextResponse } from "next/server";
import { getGitHubToken } from "@/lib/auth";
import { verifyGithubUser } from "@openswe/shared/github/verify-user";
import jwt from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    // Local JWT first
    const localToken = request.cookies.get("local_auth_token")?.value;
    if (localToken) {
      try {
        const payload = jwt.verify(
          localToken,
          process.env.LOCAL_AUTH_JWT_SECRET || "dev_local_secret_change_me",
        ) as any;
        return NextResponse.json({
          user: {
            login: payload.username,
            name: payload.name || payload.username,
            email: payload.email || null,
            avatar_url: null,
            html_url: null,
            provider: "local",
          },
        });
      } catch {
        // ignore invalid local token, fall back to GitHub
      }
    }

    const token = getGitHubToken(request);
    if (!token || !token.access_token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const user = await verifyGithubUser(token.access_token);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid GitHub token" },
        { status: 401 },
      );
    }
    return NextResponse.json({
      user: {
        login: user.login,
        avatar_url: user.avatar_url,
        html_url: user.html_url,
        name: user.name,
        email: user.email,
        provider: "github",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch user info" },
      { status: 500 },
    );
  }
}
