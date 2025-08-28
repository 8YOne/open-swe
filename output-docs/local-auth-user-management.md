# Local Authentication User Management

This document explains how to manage users in the Open-SWE local authentication system after the security improvements.

## Overview

As of the recent security update:
- **User registration is disabled** in the web interface for security reasons
- **User management is now handled via CLI scripts**
- **Login uses a proper login page** instead of browser dialogs
- **Authentication flow has been improved** with better UX

## User Management Script

The `scripts/create-user.js` script provides comprehensive user management capabilities.

### Prerequisites

Make sure you have Node.js installed and the required dependencies:

```bash
cd /path/to/open-swe
npm install bcryptjs sql.js
```

### Usage

#### Interactive Mode (Recommended)

```bash
node scripts/create-user.js --interactive
```

This launches an interactive menu where you can:
1. Create users
2. List all users
3. Delete users
4. Update user roles
5. Exit

#### Command Line Usage

**Create a user:**
```bash
node scripts/create-user.js <username> <password> [name] [email] [role]
```

**Examples:**
```bash
# Create admin user
node scripts/create-user.js admin secretpassword "Admin User" admin@example.com admin

# Create regular user
node scripts/create-user.js john mypassword "John Doe" john@example.com user

# Create user with minimal info
node scripts/create-user.js jane password123
```

**List all users:**
```bash
node scripts/create-user.js --list
```

**Delete a user:**
```bash
node scripts/create-user.js --delete username
```

**Update user role:**
```bash
node scripts/create-user.js --update-role username admin
node scripts/create-user.js --update-role username user
```

**Get help:**
```bash
node scripts/create-user.js --help
```

### User Roles

- **user**: Regular user with standard access
- **admin**: Administrative user with elevated privileges

## Database Location

By default, user data is stored in `.data/local_auth.sqlite`. You can change this by setting the `LOCAL_AUTH_DB_PATH` environment variable:

```bash
export LOCAL_AUTH_DB_PATH="/custom/path/to/users.sqlite"
```

## Authentication Flow

### 1. Login Page

Users now access a proper login page at `/login` instead of browser dialogs. The page offers:
- GitHub authentication (if configured)
- Local username/password authentication
- Modern, responsive UI with proper error handling
- Password visibility toggle
- Form validation

### 2. Security Features

- Passwords are hashed using bcrypt with salt rounds of 10
- JWT tokens are used for session management
- HTTP-only cookies for secure token storage
- Automatic redirect to chat for authenticated users
- Protected routes with middleware

### 3. Middleware Protection

The updated middleware:
- Redirects unauthenticated users to `/login`
- Redirects authenticated users away from login pages
- Supports both local and GitHub authentication
- Protects all chat routes

## Environment Variables

```bash
# JWT secret for local authentication (change in production!)
LOCAL_AUTH_JWT_SECRET="your-secure-secret-here"

# Custom database path (optional)
LOCAL_AUTH_DB_PATH="/path/to/users.sqlite"

# Admin token for user role management via API (optional)
LOCAL_ADMIN_TOKEN="your-admin-token"
```

## Migration from Old System

If you had users created via the old registration system, they will continue to work. The database schema is backward compatible.

## Security Best Practices

1. **Change the JWT secret** in production:
   ```bash
   export LOCAL_AUTH_JWT_SECRET="$(openssl rand -base64 32)"
   ```

2. **Use strong passwords** when creating users:
   ```bash
   node scripts/create-user.js admin "$(openssl rand -base64 16)" "Admin" admin@company.com admin
   ```

3. **Regularly audit users**:
   ```bash
   node scripts/create-user.js --list
   ```

4. **Remove unused accounts**:
   ```bash
   node scripts/create-user.js --delete unused_username
   ```

5. **Backup the user database** regularly:
   ```bash
   cp .data/local_auth.sqlite .data/local_auth.sqlite.backup
   ```

## Troubleshooting

### "Registration is disabled" error
This is expected behavior. Use the CLI scripts to create users.

### "User already exists" error
Check existing users with `--list` and use a different username.

### Database permission errors
Ensure the `.data` directory is writable:
```bash
chmod 755 .data
chmod 644 .data/local_auth.sqlite
```

### JWT secret warnings
Set a proper JWT secret in production:
```bash
export LOCAL_AUTH_JWT_SECRET="your-secure-secret"
```

### Script execution errors
Make sure the script is executable:
```bash
chmod +x scripts/create-user.js
```

## API Endpoints

- `POST /api/auth/local/login` - Login with username/password
- `GET /api/auth/user` - Get current user info
- `POST /api/auth/local/register` - **DISABLED** (returns 403)

## Example Deployment Setup

```bash
#!/bin/bash
# Initial setup script for production deployment

# Set secure JWT secret
export LOCAL_AUTH_JWT_SECRET="$(openssl rand -base64 32)"

# Create admin user
node scripts/create-user.js admin "$(openssl rand -base64 16)" "System Admin" admin@company.com admin

# Create regular user
node scripts/create-user.js user "$(openssl rand -base64 12)" "Regular User" user@company.com user

# List created users
node scripts/create-user.js --list

echo "User setup complete!"
```

This improved system provides better security, user experience, and administrative control over user management.
