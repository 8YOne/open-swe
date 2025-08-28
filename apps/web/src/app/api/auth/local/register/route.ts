import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser, getUserByUsername } from "@/lib/local-db";

export async function POST(request: NextRequest) {
  // Registration is disabled - use CLI scripts to create users
  return NextResponse.json({ error: "Registration is disabled. Use CLI scripts to create users." }, { status: 403 });
}

