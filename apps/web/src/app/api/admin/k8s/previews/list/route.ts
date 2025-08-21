import { NextRequest, NextResponse } from "next/server";

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
}

export async function GET(_req: NextRequest) {
  const adminToken = process.env.PREVIEW_ADMIN_TOKEN || "";
  const res = await fetch(`${apiBase()}/k8s/previews/list`, {
    headers: adminToken ? { "x-preview-admin-token": adminToken } : undefined,
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}


