import { NextRequest, NextResponse } from "next/server";
import { KubeConfig, CoreV1Api, AppsV1Api, NetworkingV1Api } from "@kubernetes/client-node";

function getKubeClients() {
  const kc = new KubeConfig();
  const kubeconfig = process.env.KUBECONFIG_B64
    ? Buffer.from(process.env.KUBECONFIG_B64, "base64").toString("utf-8")
    : null;
  if (kubeconfig) {
    kc.loadFromString(kubeconfig);
  } else {
    kc.loadFromDefault();
  }
  return {
    core: kc.makeApiClient(CoreV1Api),
    apps: kc.makeApiClient(AppsV1Api),
    net: kc.makeApiClient(NetworkingV1Api),
  };
}

function ns(project: string, branch: string) {
  const safe = branch.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return `open-swe-${project}-${safe}`;
}

export async function POST(req: NextRequest) {
  const adminToken = req.headers.get("x-preview-admin-token");
  if ((process.env.PREVIEW_ADMIN_TOKEN || "") && adminToken !== process.env.PREVIEW_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { project, branch, host, appImage, appPort, secretsEncryptionKey, apiBearerToken, env, secrets } = body;

  if (!project || !branch || !host || !appImage || !appPort) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const nsName = ns(project, branch);
  const { core, apps, net } = getKubeClients();

  // Namespace
  await core.createNamespace({
    metadata: { name: nsName, labels: { "open-swe/branch": branch, "open-swe/project": project } },
  } as any).catch(() => {});

  // Secrets
  const secret: any = {
    metadata: { name: "open-swe-shared-secrets", namespace: nsName },
    type: "Opaque",
    stringData: {
      SECRETS_ENCRYPTION_KEY: secretsEncryptionKey || process.env.SECRETS_ENCRYPTION_KEY || "",
      API_BEARER_TOKEN: apiBearerToken || process.env.API_BEARER_TOKEN || "",
    },
  } as any;
  await core.createNamespacedSecret(nsName, secret).catch(async (e: any) => {
    if (e?.response?.statusCode === 409) {
      await core.replaceNamespacedSecret("open-swe-shared-secrets", nsName, secret);
    } else {
      throw e;
    }
  });

  // Optional: Project-level secret for app
  if (secrets && typeof secrets === "object" && Object.keys(secrets).length > 0) {
    const appSecret: any = {
      metadata: { name: "project-app-secrets", namespace: nsName },
      type: "Opaque",
      stringData: secrets,
    };
    await core.createNamespacedSecret(nsName, appSecret).catch(async (e: any) => {
      if (e?.response?.statusCode === 409) {
        await core.replaceNamespacedSecret("project-app-secrets", nsName, appSecret);
      } else {
        throw e;
      }
    });
  }

  // App Deployment + Service (project preview)
  const appDep: any = {
    metadata: { name: "sandbox-app", namespace: nsName },
    spec: {
      selector: { matchLabels: { app: "sandbox-app" } },
      replicas: 1,
      template: {
        metadata: { labels: { app: "sandbox-app" } },
        spec: {
          containers: [
            {
              name: "app",
              image: appImage,
              imagePullPolicy: "IfNotPresent",
              ports: [{ containerPort: Number(appPort) }],
              env: [
                ...(env && typeof env === "object"
                  ? Object.entries(env).map(([k, v]) => ({ name: String(k), value: String(v) }))
                  : []),
                ...(secrets && typeof secrets === "object"
                  ? Object.keys(secrets).map((k) => ({ name: k, valueFrom: { secretKeyRef: { name: "project-app-secrets", key: k } } }))
                  : []),
              ],
            },
          ],
        },
      },
    },
  };
  await apps.createNamespacedDeployment(nsName, appDep as any).catch(async (e: any) => {
    if (e?.response?.statusCode === 409) {
      await apps.replaceNamespacedDeployment("sandbox-app", nsName, appDep as any);
    } else {
      throw e;
    }
  });
  await core.createNamespacedService(nsName, {
    metadata: { name: "sandbox-app", namespace: nsName },
    spec: { selector: { app: "sandbox-app" }, ports: [{ name: "http", port: Number(appPort), targetPort: Number(appPort) }] },
  } as any).catch(() => {});

  // Ingress
  const rule: any = { host, http: { paths: [{ path: "/", pathType: "Prefix", backend: { service: { name: "sandbox-app", port: { number: Number(appPort) } } } }] } };
  const ingress: any = {
    metadata: { name: "open-swe", namespace: nsName, annotations: { "kubernetes.io/ingress.class": "nginx" } },
    spec: { rules: [rule] },
  };
  await net.createNamespacedIngress(nsName, ingress).catch(async (e: any) => {
    if (e?.response?.statusCode === 409) {
      await net.replaceNamespacedIngress("open-swe", nsName, ingress);
    } else {
      throw e;
    }
  });

  return NextResponse.json({ namespace: nsName, host });
}

export async function DELETE(req: NextRequest) {
  const adminToken = req.headers.get("x-preview-admin-token");
  if ((process.env.PREVIEW_ADMIN_TOKEN || "") && adminToken !== process.env.PREVIEW_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  const branch = searchParams.get("branch");
  if (!project || !branch) {
    return NextResponse.json({ error: "Missing project or branch" }, { status: 400 });
  }
  const nsName = ns(project, branch);
  const { core } = getKubeClients();
  await core.deleteNamespace(nsName).catch(() => {});
  return NextResponse.json({ namespace: nsName, deleted: true });
}


