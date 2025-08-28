import { NextRequest, NextResponse } from "next/server";
import { getProject, findProjectByName, findProjectByRepoUrl } from "@/lib/local-db";

function makeHost(pattern: string, branch: string) {
  return pattern.replaceAll("{branch}", branch);
}

export async function POST(req: NextRequest) {
  const adminToken = req.headers.get("x-preview-admin-token");
  if ((process.env.PREVIEW_ADMIN_TOKEN || "") && adminToken !== process.env.PREVIEW_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { projectId, projectName, repoUrl, branch, image, sha } = await req.json();
  if ((!projectId && !projectName && !repoUrl) || !branch) {
    return NextResponse.json({ error: "Missing project identifier or branch" }, { status: 400 });
  }
  let p = null;
  if (projectId) p = await getProject(Number(projectId));
  if (!p && projectName) p = await findProjectByName(projectName);
  if (!p && repoUrl) p = await findProjectByRepoUrl(repoUrl);
  if (!p) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const host = p.host_pattern ? makeHost(p.host_pattern, branch) : `pr-${branch}.local`;
  const appPort = p.app_port ?? 3000;
  const appImage = image || p.image_template?.replaceAll("{pr}", branch).replaceAll("{sha}", sha ?? "latest");
  if (!appImage) return NextResponse.json({ error: "No image provided or template configured" }, { status: 400 });
  const env = p.env_json ? JSON.parse(p.env_json) : undefined;
  const secrets = p.secrets_json ? JSON.parse(p.secrets_json) : undefined;
  // Proxy to the generic previews endpoint
  const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:7474/api"}/k8s/previews`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-preview-admin-token": adminToken || "",
    },
    body: JSON.stringify({ project: p.name, branch, host, appImage, appPort, env, secrets }),
  });
  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}


