import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createUser, getUserByUsername, setUserRole } from "@/lib/local-db";

export async function POST(req: NextRequest) {
  const { username, password, name, email, role } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Missing username or password" }, { status: 400 });
  }
  const existing = await getUserByUsername(username);
  if (existing) return NextResponse.json({ error: "User exists" }, { status: 400 });
  const hash = await bcrypt.hash(password, 10);
  await createUser(username, hash, name, email, role === "admin" ? "admin" : "user");
  const token = jwt.sign({ username, name, email, role: role === "admin" ? "admin" : "user" }, process.env.LOCAL_AUTH_JWT_SECRET || "dev_local_secret_change_me", { expiresIn: "30d" });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("local_auth_token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return res;
}

export async function PUT(req: NextRequest) {
  const admin = req.headers.get("x-admin-token");
  if (!admin || admin !== (process.env.LOCAL_ADMIN_TOKEN || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { username, role } = await req.json();
  if (!username || !role) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  await setUserRole(username, role);
  return NextResponse.json({ ok: true });
}


