import fs from "node:fs";
import initSqlJs from "sql.js";

const DB_PATH = process.env.LOCAL_AUTH_DB_PATH || ".data/local_auth.sqlite";

let db: any | null = null;

async function init(): Promise<any> {
  if (db) return db;
  const SQL = await initSqlJs();
  fs.mkdirSync(".data", { recursive: true });
  if (fs.existsSync(DB_PATH)) {
    const filebuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(new Uint8Array(filebuffer));
  } else {
    db = new SQL.Database();
  }
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'user'
  )`);
  // Backfill role column if missing
  try {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
  } catch {
    // Column already exists, ignore error
  }
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    repo_url TEXT,
    host_pattern TEXT,
    app_port INTEGER,
    image_template TEXT,
    env_json TEXT,
    secrets_json TEXT
  )`);
  persist();
  return db;
}

function persist() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export type LocalUser = {
  id: number;
  username: string;
  password_hash: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

export async function getUserByUsername(username: string): Promise<LocalUser | null> {
  const conn = await init();
  const stmt = conn.prepare("SELECT id, username, password_hash, name, email, role FROM users WHERE username = ?");
  stmt.bind([username]);
  const result = stmt.step() ? (stmt.getAsObject() as any) : null;
  stmt.free();
  return result as LocalUser | null;
}

export async function createUser(
  username: string,
  password_hash: string,
  name?: string,
  email?: string,
  role: string = "user",
): Promise<void> {
  const conn = await init();
  const stmt = conn.prepare("INSERT INTO users (username, password_hash, name, email, role) VALUES (?, ?, ?, ?, ?)");
  stmt.bind([username, password_hash, name ?? null, email ?? null, role]);
  stmt.step();
  stmt.free();
  persist();
}

export async function setUserRole(username: string, role: string): Promise<void> {
  const conn = await init();
  const stmt = conn.prepare("UPDATE users SET role = ? WHERE username = ?");
  stmt.bind([role, username]);
  stmt.step();
  stmt.free();
  persist();
}

export type Project = {
  id: number;
  name: string;
  repo_url?: string | null;
  host_pattern?: string | null;
  app_port?: number | null;
  image_template?: string | null;
  env_json?: string | null;
  secrets_json?: string | null;
};

export async function listProjects(): Promise<Project[]> {
  const conn = await init();
  const result: Project[] = [];
  const stmt = conn.prepare("SELECT id, name, repo_url, host_pattern, app_port, image_template, env_json, secrets_json FROM projects ORDER BY id DESC");
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    result.push(row as Project);
  }
  stmt.free();
  return result;
}

export async function getProject(id: number): Promise<Project | null> {
  const conn = await init();
  const stmt = conn.prepare("SELECT id, name, repo_url, host_pattern, app_port, image_template, env_json, secrets_json FROM projects WHERE id = ?");
  stmt.bind([id]);
  const row = stmt.step() ? (stmt.getAsObject() as any) : null;
  stmt.free();
  return (row as Project) || null;
}

export async function findProjectByName(name: string): Promise<Project | null> {
  const conn = await init();
  const stmt = conn.prepare("SELECT id, name, repo_url, host_pattern, app_port, image_template, env_json, secrets_json FROM projects WHERE name = ?");
  stmt.bind([name]);
  const row = stmt.step() ? (stmt.getAsObject() as any) : null;
  stmt.free();
  return (row as Project) || null;
}

export async function findProjectByRepoUrl(repoUrl: string): Promise<Project | null> {
  const conn = await init();
  const stmt = conn.prepare("SELECT id, name, repo_url, host_pattern, app_port, image_template, env_json, secrets_json FROM projects WHERE repo_url = ?");
  stmt.bind([repoUrl]);
  const row = stmt.step() ? (stmt.getAsObject() as any) : null;
  stmt.free();
  return (row as Project) || null;
}

export async function createProject(input: Omit<Project, "id">): Promise<number> {
  const conn = await init();
  const stmt = conn.prepare("INSERT INTO projects (name, repo_url, host_pattern, app_port, image_template, env_json, secrets_json) VALUES (?, ?, ?, ?, ?, ?, ?)");
  stmt.bind([
    input.name,
    input.repo_url ?? null,
    input.host_pattern ?? null,
    input.app_port ?? null,
    input.image_template ?? null,
    input.env_json ?? null,
    input.secrets_json ?? null,
  ]);
  stmt.step();
  stmt.free();
  const idStmt = conn.prepare("SELECT last_insert_rowid() as id");
  idStmt.step();
  const id = (idStmt.getAsObject() as any).id as number;
  idStmt.free();
  persist();
  return id;
}

export async function updateProject(id: number, input: Partial<Omit<Project, "id">>): Promise<void> {
  const conn = await init();
  // Fetch existing
  const existing = await getProject(id);
  if (!existing) return;
  const merged = {
    name: input.name ?? existing.name,
    repo_url: input.repo_url ?? existing.repo_url,
    host_pattern: input.host_pattern ?? existing.host_pattern,
    app_port: input.app_port ?? existing.app_port,
    image_template: input.image_template ?? existing.image_template,
    env_json: input.env_json ?? existing.env_json,
    secrets_json: input.secrets_json ?? existing.secrets_json,
  };
  const stmt = conn.prepare("UPDATE projects SET name = ?, repo_url = ?, host_pattern = ?, app_port = ?, image_template = ?, env_json = ?, secrets_json = ? WHERE id = ?");
  stmt.bind([
    merged.name,
    merged.repo_url ?? null,
    merged.host_pattern ?? null,
    merged.app_port ?? null,
    merged.image_template ?? null,
    merged.env_json ?? null,
    merged.secrets_json ?? null,
    id,
  ]);
  stmt.step();
  stmt.free();
  persist();
}

export async function deleteProject(id: number): Promise<void> {
  const conn = await init();
  const stmt = conn.prepare("DELETE FROM projects WHERE id = ?");
  stmt.bind([id]);
  stmt.step();
  stmt.free();
  persist();
}

