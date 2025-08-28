import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createUser, getUserByUsername, setUserRole } from "@/lib/local-db";

export async function POST(req: NextRequest) {
  // Registration is disabled - use CLI scripts to create users
  return NextResponse.json({ error: "Registration is disabled. Use CLI scripts to create users." }, { status: 403 });
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


