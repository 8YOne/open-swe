# TASKS

- [x] Add support for local/open-source models (Ollama) via universal chat model provider
  - [x] Extend provider list to include `ollama`
  - [x] Add default Ollama model choices to shared `MODEL_OPTIONS`
  - [x] Add configurable `ollamaBaseUrl` in `GraphConfiguration`
  - [x] Wire `baseUrl` to model initialization for OpenAI and Ollama
- [x] Add UI fields in Settings → Configuration to set `openaiBaseUrl` and `ollamaBaseUrl`
- [ ] Update docs with usage for local models (Ollama) and OpenAI-compatible servers
- [ ] Add unit tests for ModelManager base URL handling and provider selection

Planned next:

- [ ] Collaboration features MVP
  - [ ] Add task assignment fields (`assignees`, `labels`) to `Task` type and UI
  - [ ] Add multi-user comments on tasks/plan items
  - [ ] Persist team metadata (owners, repos) and visibility
- [ ] Add provider: `openrouter` and `local-ai` (OpenAI-compatible)
- [ ] Add per-task model override in UI


