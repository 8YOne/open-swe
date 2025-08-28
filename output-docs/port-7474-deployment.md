# Deployment to Port 7474

This document outlines the changes made to deploy the Open-SWE project to port 7474 instead of the default port 3000.

## Changes Made

### 1. Docker Compose Configuration (`docker-compose.yml`)

- **Port Mapping**: Changed from `"3000:3000"` to `"7474:3000"`
  - External port: 7474 (accessible from host)
  - Internal port: 3000 (Next.js app listens internally)
- **Environment Variable**: Updated `NEXT_PUBLIC_API_URL` from `http://localhost:3000/api` to `http://localhost:7474/api`

### 2. Kubernetes Deployments

#### Web Service (`k8s/templates/deployment-web.yaml`)
- **Service Port**: Changed from `port: 3000` to `port: 7474`
- **Target Port**: Remains `3000` (internal container port)
- **Container Port**: Remains `3000` (Next.js app internal port)

#### Ingress Configuration (`k8s/templates/ingress.yaml`)
- **Backend Service Port**: Changed from `number: 3000` to `number: 7474`

### 3. API Fallback URLs

Updated hardcoded localhost:3000 fallbacks to use port 7474 in the following files:
- `apps/web/src/app/api/k8s/previews/by-project/route.ts`
- `apps/web/src/app/api/admin/k8s/previews/rollout/route.ts`
- `apps/web/src/app/api/admin/k8s/previews/health/route.ts`
- `apps/web/src/app/api/admin/k8s/previews/delete/route.ts`
- `apps/web/src/app/api/admin/k8s/previews/list/route.ts`
- `apps/web/src/utils/github.ts`

## Deployment Instructions

### Using Docker Compose

1. Ensure you have the required environment variables set:
   ```bash
   export SECRETS_ENCRYPTION_KEY="your-encryption-key"
   export API_BEARER_TOKEN="your-api-token"
   export PREVIEW_ADMIN_TOKEN="your-admin-token"
   export KUBECONFIG_B64="your-base64-encoded-kubeconfig"
   ```

2. Build and start the services:
   ```bash
   docker-compose up --build
   ```

3. Access the application at: `http://localhost:7474`

### Using Kubernetes

1. Apply the Kubernetes manifests:
   ```bash
   kubectl apply -f k8s/templates/
   ```

2. The web service will be available on port 7474 within the cluster
3. Configure your ingress or load balancer to route traffic to port 7474

## Architecture Notes

- **Internal Port**: The Next.js application continues to listen on port 3000 inside the container
- **External Port**: The application is now exposed on port 7474 to the outside world
- **Service Discovery**: Internal service-to-service communication remains unchanged
- **API URLs**: All API endpoint references have been updated to use the new port

## Testing

The deployment configuration has been validated using `docker-compose config` and shows:
- Web service correctly mapped: `7474:3000`
- Environment variables properly configured
- Service dependencies maintained

## Troubleshooting

If you encounter issues:

1. **Port Conflicts**: Ensure port 7474 is not in use by another service
2. **Environment Variables**: Verify all required environment variables are set
3. **Service Communication**: Check that the langgraph service is accessible on port 2024
4. **API Endpoints**: Confirm API calls are using the updated port 7474 in URLs

## Rollback

To revert to port 3000:
1. Change `"7474:3000"` back to `"3000:3000"` in `docker-compose.yml`
2. Update `NEXT_PUBLIC_API_URL` to `http://localhost:3000/api`
3. Revert Kubernetes service port from 7474 to 3000
4. Update API fallback URLs back to port 3000
