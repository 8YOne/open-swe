import { NextRequest, NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/local-db";

export async function GET() {
  const items = await listProjects();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = await createProject({
    name: body.name,
    repo_url: body.repo_url ?? null,
    host_pattern: body.host_pattern ?? null,
    app_port: body.app_port ?? null,
    image_template: body.image_template ?? null,
    env_json: body.env_json ?? null,
    secrets_json: body.secrets_json ?? null,
  });
  return NextResponse.json({ id }, { status: 201 });
}


