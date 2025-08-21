import { NextRequest, NextResponse } from "next/server";
import { KubeConfig, AppsV1Api } from "@kubernetes/client-node";

function apps() {
  const kc = new KubeConfig();
  const kubeconfig = process.env.KUBECONFIG_B64
    ? Buffer.from(process.env.KUBECONFIG_B64, "base64").toString("utf-8")
    : null;
  if (kubeconfig) kc.loadFromString(kubeconfig);
  else kc.loadFromDefault();
  return kc.makeApiClient(AppsV1Api);
}

export async function POST(req: NextRequest) {
  const adminToken = req.headers.get("x-preview-admin-token");
  if ((process.env.PREVIEW_ADMIN_TOKEN || "") && adminToken !== process.env.PREVIEW_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { namespace, deployment, image } = await req.json();
  if (!namespace || !deployment || !image) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const a = apps();
  const dep = await a.readNamespacedDeployment(deployment, namespace);
  const containers = dep.body.spec?.template?.spec?.containers || [];
  if (!containers.length) return NextResponse.json({ error: "No containers in deployment" }, { status: 400 });
  containers[0].image = image;
  await a.replaceNamespacedDeployment(deployment, namespace, dep.body as any);
  return NextResponse.json({ ok: true });
}


