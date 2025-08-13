import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser, getUserByUsername } from "@/lib/local-db";

export async function POST(request: NextRequest) {
  try {
    const { username, password, name, email } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (await getUserByUsername(username)) {
      return NextResponse.json({ error: "User exists" }, { status: 409 });
    }
    const password_hash = await bcrypt.hash(password, 10);
    try {
      await createUser(username, password_hash, name, email);
    } catch (e) {
      return NextResponse.json({ error: "Could not create user" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

