import { NextRequest, NextResponse } from "next/server";
import { KubeConfig, CoreV1Api, AppsV1Api } from "@kubernetes/client-node";
import { findProjectByName } from "@/lib/local-db";

function clients() {
  const kc = new KubeConfig();
  const kubeconfig = process.env.KUBECONFIG_B64
    ? Buffer.from(process.env.KUBECONFIG_B64, "base64").toString("utf-8")
    : null;
  if (kubeconfig) kc.loadFromString(kubeconfig);
  else kc.loadFromDefault();
  return { core: kc.makeApiClient(CoreV1Api), apps: kc.makeApiClient(AppsV1Api) };
}

export async function GET(req: NextRequest) {
  const adminToken = req.headers.get("x-preview-admin-token");
  if ((process.env.PREVIEW_ADMIN_TOKEN || "") && adminToken !== process.env.PREVIEW_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { core, apps } = clients();
  const nsRes = await core.listNamespace(undefined, undefined, undefined, `open-swe/branch`);
  const namespaces = (nsRes.body.items || []) as any[];
  const out: any[] = [];
  for (const ns of namespaces) {
    const nsName = ns.metadata?.name as string;
    try {
      const depRes = await apps.listNamespacedDeployment(nsName);
      const svcRes = await core.listNamespacedService(nsName);
      const podRes = await core.listNamespacedPod(nsName);
      out.push({
        name: nsName,
        project: ns.metadata?.labels?.["open-swe/project"],
        branch: ns.metadata?.labels?.["open-swe/branch"],
        createdAt: ns.metadata?.creationTimestamp,
        deployments: (depRes.body.items || []).map((d: any) => ({
          name: d.metadata?.name,
          ready: `${d.status?.readyReplicas || 0}/${d.status?.replicas || 0}`,
          images: (d.spec?.template?.spec?.containers || []).map((c: any) => c.image),
        })),
        services: (svcRes.body.items || []).map((s: any) => ({ name: s.metadata?.name, type: s.spec?.type, ports: s.spec?.ports })),
        pods: (podRes.body.items || []).map((p: any) => ({ name: p.metadata?.name, phase: p.status?.phase })),
        url: undefined as string | undefined,
      });
    } catch {
      out.push({ name: nsName });
    }
  }
  for (const item of out) {
    if (item.project && item.branch) {
      try {
        const p = await findProjectByName(item.project);
        if (p?.host_pattern) {
          let url = p.host_pattern.replaceAll("{branch}", String(item.branch));
          if (!url.startsWith("http")) url = `http://${url}`;
          item.url = url;
        }
      } catch {}
    }
  }
  return NextResponse.json(out);
}


