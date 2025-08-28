import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Find the project root by looking for package.json or use relative path
function findProjectRoot(): string {
  let currentDir = process.cwd();
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      const packageJson = JSON.parse(fs.readFileSync(path.join(currentDir, 'package.json'), 'utf8'));
      // Look for the main project package.json (not a workspace package)
      if (packageJson.workspaces || packageJson.name === 'open-swe') {
        return currentDir;
      }
    }
    currentDir = path.dirname(currentDir);
  }
  // Fallback: assume we're in apps/web and go up two levels
  return path.join(process.cwd(), '../..');
}

const PROJECT_ROOT = findProjectRoot();
const DEFAULT_DB_PATH = path.join(PROJECT_ROOT, '.data/local_auth.sqlite');
const DB_PATH = process.env.LOCAL_AUTH_DB_PATH || DEFAULT_DB_PATH;

let db: Database.Database | null = null;

function init(): Database.Database {
  if (db) return db;
  
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  
  db.exec(`CREATE TABLE IF NOT EXISTS users (
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
  db.exec(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    repo_url TEXT,
    host_pattern TEXT,
    app_port INTEGER,
    image_template TEXT,
    env_json TEXT,
    secrets_json TEXT
  )`);
  return db;
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
  const database = init();
  const stmt = database.prepare("SELECT * FROM users WHERE username = ?");
  const user = stmt.get(username) as LocalUser | undefined;
  return user || null;
}

export async function createUser(
  username: string,
  password_hash: string,
  name?: string,
  email?: string,
  role: string = "user",
): Promise<void> {
  const database = init();
  const stmt = database.prepare(
    "INSERT INTO users (username, password_hash, name, email, role) VALUES (?, ?, ?, ?, ?)"
  );
  stmt.run(username, password_hash, name, email, role);
}

export async function setUserRole(username: string, role: string): Promise<void> {
  const database = init();
  const stmt = database.prepare("UPDATE users SET role = ? WHERE username = ?");
  stmt.run(role, username);
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
  const database = init();
  const stmt = database.prepare("SELECT * FROM projects ORDER BY id DESC");
  return stmt.all() as Project[];
}

export async function getProject(id: number): Promise<Project | null> {
  const database = init();
  const stmt = database.prepare("SELECT * FROM projects WHERE id = ?");
  const project = stmt.get(id) as Project | undefined;
  return project || null;
}

export async function findProjectByName(name: string): Promise<Project | null> {
  const database = init();
  const stmt = database.prepare("SELECT * FROM projects WHERE name = ?");
  const project = stmt.get(name) as Project | undefined;
  return project || null;
}

export async function findProjectByRepoUrl(repoUrl: string): Promise<Project | null> {
  const database = init();
  const stmt = database.prepare("SELECT * FROM projects WHERE repo_url = ?");
  const project = stmt.get(repoUrl) as Project | undefined;
  return project || null;
}

export async function createProject(input: Omit<Project, "id">): Promise<number> {
  const database = init();
  const stmt = database.prepare(`
    INSERT INTO projects (name, repo_url, host_pattern, app_port, image_template, env_json, secrets_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    input.name,
    input.repo_url,
    input.host_pattern,
    input.app_port,
    input.image_template,
    input.env_json,
    input.secrets_json
  );
  return result.lastInsertRowid as number;
}

export async function updateProject(id: number, input: Partial<Omit<Project, "id">>): Promise<void> {
  const database = init();
  
  const fields: string[] = [];
  const values: any[] = [];
  
  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.repo_url !== undefined) {
    fields.push("repo_url = ?");
    values.push(input.repo_url);
  }
  if (input.host_pattern !== undefined) {
    fields.push("host_pattern = ?");
    values.push(input.host_pattern);
  }
  if (input.app_port !== undefined) {
    fields.push("app_port = ?");
    values.push(input.app_port);
  }
  if (input.image_template !== undefined) {
    fields.push("image_template = ?");
    values.push(input.image_template);
  }
  if (input.env_json !== undefined) {
    fields.push("env_json = ?");
    values.push(input.env_json);
  }
  if (input.secrets_json !== undefined) {
    fields.push("secrets_json = ?");
    values.push(input.secrets_json);
  }
  
  if (fields.length === 0) return;
  
  values.push(id);
  const stmt = database.prepare(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
}

export async function deleteProject(id: number): Promise<void> {
  const database = init();
  const stmt = database.prepare("DELETE FROM projects WHERE id = ?");
  stmt.run(id);
}