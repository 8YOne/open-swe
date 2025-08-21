import { NextRequest, NextResponse } from "next/server";
import { KubeConfig, CoreV1Api } from "@kubernetes/client-node";

function core() {
  const kc = new KubeConfig();
  const kubeconfig = process.env.KUBECONFIG_B64
    ? Buffer.from(process.env.KUBECONFIG_B64, "base64").toString("utf-8")
    : null;
  if (kubeconfig) kc.loadFromString(kubeconfig);
  else kc.loadFromDefault();
  return kc.makeApiClient(CoreV1Api);
}

export async function POST(req: NextRequest) {
  const adminToken = req.headers.get("x-preview-admin-token");
  if ((process.env.PREVIEW_ADMIN_TOKEN || "") && adminToken !== process.env.PREVIEW_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { namespace } = await req.json();
  if (!namespace) return NextResponse.json({ error: "Missing namespace" }, { status: 400 });
  try {
    await core().deleteNamespace(namespace);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}


