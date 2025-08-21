"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/lib/http";

type Preview = { name?: string; project?: string; branch?: string; createdAt?: string; deployments?: any[]; services?: any[]; pods?: any[]; url?: string };

export function PreviewsList() {
  const [items, setItems] = useState<Preview[]>([]);

  async function load() {
    const res = await adminApi.get("/k8s/previews/list", { headers: { "cache-control": "no-cache" } });
    setItems(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function deleteNs(ns: string) {
    await adminApi.post("/k8s/previews/delete", { namespace: ns });
    await load();
  }

  async function rollout(ns: string, dep: string) {
    const image = prompt("New image tag (e.g., ghcr.io/org/app:sha)");
    if (!image) return;
    await adminApi.post("/k8s/previews/rollout", { namespace: ns, deployment: dep, image });
    await load();
  }

  async function refreshHealth(ns: string) {
    const res = await adminApi.get(`/k8s/previews/health`, { params: { namespace: ns } });
    return res.data?.ok ? "healthy" : "degraded";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Previews</CardTitle>
        <CardDescription>Namespaces with branch-specific previews.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((p) => (
            <div key={p.name} className="border-border rounded border p-2 text-sm">
              <div className="font-mono">{p.name}</div>
              <div className="text-muted-foreground">{p.project} · {p.branch} · {p.createdAt}</div>
              {/* Simple health badge */}
              <div className="text-xs mt-1">
                <span className="inline-flex items-center gap-2">
                  <span className="font-mono">health:</span>
                  {/* naive ping; can be improved to poll */}
                  <Button size="sm" variant="outline" onClick={async () => alert(await refreshHealth(p.name!))}>Check</Button>
                </span>
              </div>
              <div className="mt-1">
                {p.deployments?.map((d) => (
                  <div key={d.name} className="text-xs">
                    dep: {d.name} · ready {d.ready} · {d.images?.join(", ")}
                    <Button className="ml-2" size="sm" variant="outline" onClick={() => rollout(p.name!, d.name)}>Rollout</Button>
                  </div>
                ))}
                {p.services?.map((s) => (
                  <div key={s.name} className="text-xs">svc: {s.name} · {s.type}</div>
                ))}
                {/* Pod logs quick links */}
                {p.pods?.map((pod: any) => (
                  <div key={pod.name} className="text-xs">
                    pod: {pod.name} · {pod.phase} ·
                    <a className="underline ml-1" href={`/api/admin/k8s/previews/logs?namespace=${encodeURIComponent(p.name!)}&pod=${encodeURIComponent(pod.name)}`} target="_blank" rel="noreferrer">logs</a>
                  </div>
                ))}
                {p.url && (
                  <div className="text-xs mt-1">
                    <a className="underline" href={p.url} target="_blank" rel="noreferrer">Open Preview</a>
                  </div>
                )}
              </div>
              <div className="mt-2">
                <Button size="sm" variant="destructive" onClick={() => deleteNs(p.name!)}>Delete</Button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="text-muted-foreground text-sm">No previews found.</div>}
        </div>
      </CardContent>
    </Card>
  );
}


