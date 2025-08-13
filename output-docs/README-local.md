### Local, No-Paid-Dependency Deployment

Use Docker to run the full stack locally:

1) Generate secrets:
```bash
bash scripts/gen-local-secrets.sh
```

2) Build and start:
```bash
docker compose --env-file .env.local up --build
```

3) Pull a local model:
```bash
docker exec -it $(docker ps -qf name=ollama) ollama pull llama3.1
```

4) Open http://localhost:3000 and set model names to `ollama:llama3.1` in Settings → Configuration.

Details and troubleshooting: see `output-docs/local-deployment-docker.md`.


