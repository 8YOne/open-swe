import { NextRequest, NextResponse } from "next/server";

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
}

export async function GET(req: NextRequest) {
  const ns = req.nextUrl.searchParams.get("namespace");
  if (!ns) return NextResponse.json({ error: "Missing namespace" }, { status: 400 });
  const adminToken = process.env.PREVIEW_ADMIN_TOKEN || "";
  const res = await fetch(`${apiBase()}/k8s/previews/health?namespace=${encodeURIComponent(ns)}`, {
    headers: adminToken ? { "x-preview-admin-token": adminToken } : undefined,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}


