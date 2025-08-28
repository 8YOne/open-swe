import { NextRequest, NextResponse } from "next/server";

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:7474/api";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const adminToken = process.env.PREVIEW_ADMIN_TOKEN || "";
  const res = await fetch(`${apiBase()}/k8s/previews/delete`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(adminToken ? { "x-preview-admin-token": adminToken } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}


