"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/http";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Project = {
  id: number;
  name: string;
  repo_url?: string | null;
  host_pattern?: string | null;
  app_port?: number | null;
  image_template?: string | null;
  env_json?: string | null;
  secrets_json?: string | null;
};

export function ProjectsManager() {
  const [items, setItems] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");
  const [hostPattern, setHostPattern] = useState("");
  const [appPort, setAppPort] = useState("3000");
  const [imageTemplate, setImageTemplate] = useState("");
  const [busy, setBusy] = useState(false);
  const [envJson, setEnvJson] = useState("{}");
  const [secretsJson, setSecretsJson] = useState("{}");

  async function load() {
    const res = await api.get("/projects");
    setItems(res.data);
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    setBusy(true);
    try {
      await api.post("/projects", {
        name,
        repo_url: repo || null,
        host_pattern: hostPattern || null,
        app_port: Number(appPort) || 3000,
        image_template: imageTemplate || null,
        env_json: envJson || null,
        secrets_json: secretsJson || null,
      });
      setName("");
      setRepo("");
      setHostPattern("");
      setAppPort("3000");
      setImageTemplate("");
      setEnvJson("{}");
      setSecretsJson("{}");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>Manage per-project defaults for previews.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Project Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-project" />
            </div>
            <div>
              <Label>Repository URL</Label>
              <Input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/org/repo.git" />
            </div>
            <div>
              <Label>Host Pattern</Label>
              <Input value={hostPattern} onChange={(e) => setHostPattern(e.target.value)} placeholder="{branch}.previews.local" />
            </div>
            <div>
              <Label>App Port</Label>
              <Input value={appPort} onChange={(e) => setAppPort(e.target.value)} placeholder="3000" />
            </div>
            <div className="md:col-span-2">
              <Label>Image Template</Label>
              <Input value={imageTemplate} onChange={(e) => setImageTemplate(e.target.value)} placeholder="ghcr.io/org/repo:pr-{pr}-{sha}" />
            </div>
            <div className="md:col-span-2">
              <Label>Project Env (JSON)</Label>
              <Input value={envJson} onChange={(e) => setEnvJson(e.target.value)} placeholder='{"NEXT_PUBLIC_API_URL":"https://api.example.com"}' />
            </div>
            <div className="md:col-span-2">
              <Label>Project Secrets (JSON)</Label>
              <Input value={secretsJson} onChange={(e) => setSecretsJson(e.target.value)} placeholder='{"DATABASE_URL":"postgres://..."}' />
            </div>
          </div>
          <div>
            <Button onClick={create} disabled={busy}>{busy ? "Saving..." : "Add Project"}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className="border-border flex items-center justify-between rounded border p-3">
            <div>
              <div className="font-mono text-sm">{p.name}</div>
              <div className="text-muted-foreground text-xs">{p.repo_url} · {p.host_pattern} · port {p.app_port}</div>
            </div>
            <div className="text-muted-foreground text-xs">image: {p.image_template}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


