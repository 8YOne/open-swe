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

export async function GET(req: NextRequest) {
  const adminToken = req.headers.get("x-preview-admin-token");
  if ((process.env.PREVIEW_ADMIN_TOKEN || "") && adminToken !== process.env.PREVIEW_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ns = req.nextUrl.searchParams.get("namespace");
  if (!ns) return NextResponse.json({ error: "Missing namespace" }, { status: 400 });
  const c = core();
  const pods = await c.listNamespacedPod(ns);
  const statuses = (pods.body.items || []).map((p: any) => ({ name: p.metadata?.name, phase: p.status?.phase, conditions: p.status?.conditions }));
  const allReady = statuses.every((s) => s.phase === "Running");
  return NextResponse.json({ ok: allReady, pods: statuses });
}


