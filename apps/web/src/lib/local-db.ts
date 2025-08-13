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
    email TEXT
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
};

export async function getUserByUsername(username: string): Promise<LocalUser | null> {
  const conn = await init();
  const stmt = conn.prepare("SELECT id, username, password_hash, name, email FROM users WHERE username = ?");
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
): Promise<void> {
  const conn = await init();
  const stmt = conn.prepare("INSERT INTO users (username, password_hash, name, email) VALUES (?, ?, ?, ?)");
  stmt.bind([username, password_hash, name ?? null, email ?? null]);
  stmt.step();
  stmt.free();
  persist();
}

