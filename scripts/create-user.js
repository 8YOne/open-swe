#!/usr/bin/env node

/**
 * User Management Script for Open-SWE Local Authentication
 * 
 * Usage:
 *   node scripts/create-user.js <username> <password> [name] [email] [role]
 *   node scripts/create-user.js --interactive
 * 
 * Examples:
 *   node scripts/create-user.js admin secretpassword "Admin User" admin@example.com admin
 *   node scripts/create-user.js john mypassword "John Doe" john@example.com user
 *   node scripts/create-user.js --interactive
 */

import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'readline';
import bcrypt from 'bcryptjs';

const DB_PATH = process.env.LOCAL_AUTH_DB_PATH || '.data/local_auth.json';

let db = null;

function initDB() {
  if (db) return db;
  
  // Ensure directory exists
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  if (fs.existsSync(DB_PATH)) {
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

function createEmptyDatabase() {
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

async function getUserByUsername(username) {
  const database = initDB();
  const user = database.users.find(u => u.username === username);
  return user || null;
}

async function createUser(username, password_hash, name, email, role = 'user') {
  const database = initDB();
  
  // Check if user already exists
  const existing = database.users.find(u => u.username === username);
  if (existing) {
    throw new Error('User already exists');
  }
  
  const newUser = {
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

async function listUsers() {
  const database = initDB();
  return database.users.sort((a, b) => a.id - b.id);
}

async function deleteUser(username) {
  const database = initDB();
  const index = database.users.findIndex(u => u.username === username);
  if (index !== -1) {
    database.users.splice(index, 1);
    persist();
  }
}

async function updateUserRole(username, role) {
  const database = initDB();
  const user = database.users.find(u => u.username === username);
  if (user) {
    user.role = role;
    persist();
  }
}

function createReadlineInterface() {
  return createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function question(rl, query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function interactiveMode() {
  const rl = createReadlineInterface();
  
  console.log('\n=== Open-SWE User Management ===\n');
  console.log('1. Create user');
  console.log('2. List users');
  console.log('3. Delete user');
  console.log('4. Update user role');
  console.log('5. Exit\n');
  
  const choice = await question(rl, 'Select an option (1-5): ');
  
  switch (choice) {
    case '1':
      await interactiveCreateUser(rl);
      break;
    case '2':
      await interactiveListUsers(rl);
      break;
    case '3':
      await interactiveDeleteUser(rl);
      break;
    case '4':
      await interactiveUpdateRole(rl);
      break;
    case '5':
      console.log('Goodbye!');
      rl.close();
      return;
    default:
      console.log('Invalid option. Please try again.\n');
      rl.close();
      await interactiveMode();
      return;
  }
  
  const another = await question(rl, '\nPerform another action? (y/n): ');
  rl.close();
  
  if (another.toLowerCase() === 'y' || another.toLowerCase() === 'yes') {
    await interactiveMode();
  }
}

async function interactiveCreateUser(rl) {
  console.log('\n--- Create New User ---');
  
  const username = await question(rl, 'Username (required): ');
  if (!username) {
    console.log('Username is required!');
    return;
  }
  
  // Check if user exists
  const existing = await getUserByUsername(username);
  if (existing) {
    console.log(`User '${username}' already exists!`);
    return;
  }
  
  const password = await question(rl, 'Password (required): ');
  if (!password) {
    console.log('Password is required!');
    return;
  }
  
  const name = await question(rl, 'Full name (optional): ');
  const email = await question(rl, 'Email (optional): ');
  const role = await question(rl, 'Role [user/admin] (default: user): ') || 'user';
  
  if (!['user', 'admin'].includes(role)) {
    console.log('Role must be either "user" or "admin"');
    return;
  }
  
  try {
    const password_hash = await bcrypt.hash(password, 10);
    await createUser(username, password_hash, name, email, role);
    console.log(`✅ User '${username}' created successfully!`);
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
  }
}

async function interactiveListUsers(rl) {
  console.log('\n--- User List ---');
  
  try {
    const users = await listUsers();
    if (users.length === 0) {
      console.log('No users found.');
      return;
    }
    
    console.log('\nID | Username | Name | Email | Role');
    console.log('---|----------|------|-------|-----');
    
    users.forEach(user => {
      console.log(`${user.id} | ${user.username} | ${user.name || 'N/A'} | ${user.email || 'N/A'} | ${user.role || 'user'}`);
    });
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
  }
}

async function interactiveDeleteUser(rl) {
  console.log('\n--- Delete User ---');
  
  const username = await question(rl, 'Username to delete: ');
  if (!username) {
    console.log('Username is required!');
    return;
  }
  
  const existing = await getUserByUsername(username);
  if (!existing) {
    console.log(`User '${username}' not found!`);
    return;
  }
  
  const confirm = await question(rl, `Are you sure you want to delete user '${username}'? (y/n): `);
  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    console.log('Operation cancelled.');
    return;
  }
  
  try {
    await deleteUser(username);
    console.log(`✅ User '${username}' deleted successfully!`);
  } catch (error) {
    console.error('❌ Error deleting user:', error.message);
  }
}

async function interactiveUpdateRole(rl) {
  console.log('\n--- Update User Role ---');
  
  const username = await question(rl, 'Username: ');
  if (!username) {
    console.log('Username is required!');
    return;
  }
  
  const existing = await getUserByUsername(username);
  if (!existing) {
    console.log(`User '${username}' not found!`);
    return;
  }
  
  console.log(`Current role: ${existing.role || 'user'}`);
  const newRole = await question(rl, 'New role [user/admin]: ');
  
  if (!['user', 'admin'].includes(newRole)) {
    console.log('Role must be either "user" or "admin"');
    return;
  }
  
  try {
    await updateUserRole(username, newRole);
    console.log(`✅ User '${username}' role updated to '${newRole}'!`);
  } catch (error) {
    console.error('❌ Error updating user role:', error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
User Management Script for Open-SWE Local Authentication

Usage:
  node scripts/create-user.js <username> <password> [name] [email] [role]
  node scripts/create-user.js --interactive
  node scripts/create-user.js --list
  node scripts/create-user.js --delete <username>
  node scripts/create-user.js --update-role <username> <role>

Examples:
  node scripts/create-user.js admin secretpassword "Admin User" admin@example.com admin
  node scripts/create-user.js john mypassword "John Doe" john@example.com user
  node scripts/create-user.js --interactive
  node scripts/create-user.js --list
  node scripts/create-user.js --delete john
  node scripts/create-user.js --update-role john admin

Options:
  --interactive, -i    Interactive mode
  --list, -l          List all users
  --delete <username>  Delete a user
  --update-role <username> <role>  Update user role
  --help, -h          Show this help message
`);
    return;
  }
  
  if (args[0] === '--interactive' || args[0] === '-i') {
    await interactiveMode();
    return;
  }
  
  if (args[0] === '--list' || args[0] === '-l') {
    const users = await listUsers();
    if (users.length === 0) {
      console.log('No users found.');
      return;
    }
    
    console.log('\nID | Username | Name | Email | Role');
    console.log('---|----------|------|-------|-----');
    
    users.forEach(user => {
      console.log(`${user.id} | ${user.username} | ${user.name || 'N/A'} | ${user.email || 'N/A'} | ${user.role || 'user'}`);
    });
    return;
  }
  
  if (args[0] === '--delete') {
    if (args.length < 2) {
      console.error('Username is required for delete operation');
      process.exit(1);
    }
    
    const username = args[1];
    const existing = await getUserByUsername(username);
    if (!existing) {
      console.error(`User '${username}' not found!`);
      process.exit(1);
    }
    
    await deleteUser(username);
    console.log(`✅ User '${username}' deleted successfully!`);
    return;
  }
  
  if (args[0] === '--update-role') {
    if (args.length < 3) {
      console.error('Username and role are required for update-role operation');
      process.exit(1);
    }
    
    const username = args[1];
    const role = args[2];
    
    if (!['user', 'admin'].includes(role)) {
      console.error('Role must be either "user" or "admin"');
      process.exit(1);
    }
    
    const existing = await getUserByUsername(username);
    if (!existing) {
      console.error(`User '${username}' not found!`);
      process.exit(1);
    }
    
    await updateUserRole(username, role);
    console.log(`✅ User '${username}' role updated to '${role}'!`);
    return;
  }
  
  // Create user mode
  if (args.length < 2) {
    console.error('Username and password are required');
    console.error('Use --help for usage information');
    process.exit(1);
  }
  
  const [username, password, name, email, role = 'user'] = args;
  
  if (!['user', 'admin'].includes(role)) {
    console.error('Role must be either "user" or "admin"');
    process.exit(1);
  }
  
  // Check if user exists
  const existing = await getUserByUsername(username);
  if (existing) {
    console.error(`User '${username}' already exists!`);
    process.exit(1);
  }
  
  try {
    const password_hash = await bcrypt.hash(password, 10);
    await createUser(username, password_hash, name, email, role);
    console.log(`✅ User '${username}' created successfully!`);
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
