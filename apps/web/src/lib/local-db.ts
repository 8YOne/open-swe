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
const DEFAULT_DB_PATH = path.join(PROJECT_ROOT, '.data/local_auth.json');
const DB_PATH = process.env.LOCAL_AUTH_DB_PATH || DEFAULT_DB_PATH;

interface Database {
  users: LocalUser[];
  projects: Project[];
  nextUserId: number;
  nextProjectId: number;
}

let db: Database | null = null;

function init(): Database {
  if (db) return db;
  
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  
  // Check for existing SQLite database and migrate if needed
  const sqlitePath = DB_PATH.replace('.json', '.sqlite');
  if (fs.existsSync(sqlitePath) && !fs.existsSync(DB_PATH)) {
    console.log('Migrating from SQLite to JSON database...');
    try {
      db = migrateSqliteToJson(sqlitePath);
      persist();
      console.log('Migration completed successfully');
    } catch (error) {
      console.warn('Failed to migrate SQLite database, creating new one:', error);
      db = createEmptyDatabase();
    }
  } else if (fs.existsSync(DB_PATH)) {
    try {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      db = JSON.parse(data);
      
      // Ensure the database has the expected structure
      if (!db || typeof db !== 'object') {
        throw new Error('Invalid database format');
      }
      
      db.users = db.users || [];
      db.projects = db.projects || [];
      db.nextUserId = db.nextUserId || 1;
      db.nextProjectId = db.nextProjectId || 1;
      
      // Migrate any users without IDs
      db.users.forEach((user, index) => {
        if (!user.id) {
          user.id = db!.nextUserId++;
        }
      });
      
      // Fix nextUserId if needed
      if (db.users.length > 0) {
        const maxId = Math.max(...db.users.map(u => u.id));
        db.nextUserId = Math.max(db.nextUserId, maxId + 1);
      }
      
    } catch (error) {
      console.warn('Failed to read database file, creating new one:', error);
      db = createEmptyDatabase();
    }
  } else {
    db = createEmptyDatabase();
  }
  
  persist();
  return db;
}

function migrateSqliteToJson(sqlitePath: string): Database {
  // For now, just create an empty database
  // In a real migration, we would read the SQLite file and convert the data
  console.log('SQLite migration not implemented, creating empty database');
  return createEmptyDatabase();
}

function createEmptyDatabase(): Database {
  return {
    users: [],
    projects: [],
    nextUserId: 1,
    nextProjectId: 1,
  };
}

function persist() {
  if (!db) return;
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Failed to persist database:', error);
  }
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
  const user = database.users.find(u => u.username === username);
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
  
  // Check if user already exists
  const existing = database.users.find(u => u.username === username);
  if (existing) {
    throw new Error('User already exists');
  }
  
  const newUser: LocalUser = {
    id: database.nextUserId++,
    username,
    password_hash,
    name: name || null,
    email: email || null,
    role,
  };
  
  database.users.push(newUser);
  persist();
}

export async function setUserRole(username: string, role: string): Promise<void> {
  const database = init();
  const user = database.users.find(u => u.username === username);
  if (user) {
    user.role = role;
    persist();
  }
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
  return [...database.projects].sort((a, b) => b.id - a.id);
}

export async function getProject(id: number): Promise<Project | null> {
  const database = init();
  const project = database.projects.find(p => p.id === id);
  return project || null;
}

export async function findProjectByName(name: string): Promise<Project | null> {
  const database = init();
  const project = database.projects.find(p => p.name === name);
  return project || null;
}

export async function findProjectByRepoUrl(repoUrl: string): Promise<Project | null> {
  const database = init();
  const project = database.projects.find(p => p.repo_url === repoUrl);
  return project || null;
}

export async function createProject(input: Omit<Project, "id">): Promise<number> {
  const database = init();
  
  // Check if project with same name already exists
  const existing = database.projects.find(p => p.name === input.name);
  if (existing) {
    throw new Error('Project with this name already exists');
  }
  
  const newProject: Project = {
    id: database.nextProjectId++,
    name: input.name,
    repo_url: input.repo_url || null,
    host_pattern: input.host_pattern || null,
    app_port: input.app_port || null,
    image_template: input.image_template || null,
    env_json: input.env_json || null,
    secrets_json: input.secrets_json || null,
  };
  
  database.projects.push(newProject);
  persist();
  return newProject.id;
}

export async function updateProject(id: number, input: Partial<Omit<Project, "id">>): Promise<void> {
  const database = init();
  const project = database.projects.find(p => p.id === id);
  if (!project) return;
  
  // Update only provided fields
  if (input.name !== undefined) project.name = input.name;
  if (input.repo_url !== undefined) project.repo_url = input.repo_url;
  if (input.host_pattern !== undefined) project.host_pattern = input.host_pattern;
  if (input.app_port !== undefined) project.app_port = input.app_port;
  if (input.image_template !== undefined) project.image_template = input.image_template;
  if (input.env_json !== undefined) project.env_json = input.env_json;
  if (input.secrets_json !== undefined) project.secrets_json = input.secrets_json;
  
  persist();
}

export async function deleteProject(id: number): Promise<void> {
  const database = init();
  const index = database.projects.findIndex(p => p.id === id);
  if (index !== -1) {
    database.projects.splice(index, 1);
    persist();
  }
}

