Progress log created on first implementation pass.

1. Local/open-source model support
   - Added `ollama` provider and default models in `packages/shared/src/open-swe/models.ts`
   - Added `openaiBaseUrl` and `ollamaBaseUrl` to `GraphConfiguration` in `packages/shared/src/open-swe/types.ts`
   - Passed `baseUrl` to `initChatModel` in `apps/open-swe/src/utils/llms/model-manager.ts` for OpenAI and Ollama
   - Surfaced fields in Settings → Configuration automatically via `GraphConfigurationMetadata`

Next steps
   - Add unit tests covering base URL handling and provider selection
   - Expand docs for local model setup and examples

