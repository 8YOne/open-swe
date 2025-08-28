import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getUserByUsername } from "@/lib/local-db";

const JWT_SECRET = process.env.LOCAL_AUTH_JWT_SECRET || "dev_local_secret_change_me";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const row = await getUserByUsername(username);
    if (!row) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = jwt.sign(
      {
        sub: String(row.id),
        username: row.username,
        name: row.name,
        email: row.email,
        provider: "local",
      },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    const response = NextResponse.json({ ok: true });
    response.cookies.set("local_auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ 
      error: "Login failed", 
      details: process.env.NODE_ENV === "development" ? String(error) : undefined 
    }, { status: 500 });
  }
}

