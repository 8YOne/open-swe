import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { getModelManager } from "../utils/llms/model-manager.js";

jest.mock("langchain/chat_models/universal", () => {
  return {
    initChatModel: jest.fn(async (_model: string, _opts: any) => ({
      _defaultConfig: { modelProvider: _opts.modelProvider, model: _model },
    })),
  };
});

describe("ModelManager baseUrl handling", () => {
  beforeEach(() => {
    process.env.SECRETS_ENCRYPTION_KEY =
      process.env.SECRETS_ENCRYPTION_KEY ||
      "test_secret_key_1234567890abcdef1234567890abcdef";
    const { initChatModel } = require("langchain/chat_models/universal");
    (initChatModel as jest.Mock).mockClear();
  });

  it("passes openai baseUrl when configured", async () => {
    const manager = getModelManager();
    const config: any = {
      configurable: {
        plannerModelName: "openai:gpt-5",
        openaiBaseUrl: "http://localhost:8080/v1",
      },
    };

    const model = await manager.loadModel(config, "planner" as any);
    expect(model).toBeTruthy();
    const { initChatModel } = require("langchain/chat_models/universal");
    expect((initChatModel as jest.Mock).mock.calls[0][1]).toMatchObject({
      modelProvider: "openai",
      baseUrl: "http://localhost:8080/v1",
    });
  });

  it("uses default ollama baseUrl when not configured", async () => {
    const manager = getModelManager();
    const config: any = {
      configurable: {
        programmerModelName: "ollama:llama3.1",
      },
    };

    const model = await manager.loadModel(config, "programmer" as any);
    expect(model).toBeTruthy();
    const { initChatModel } = require("langchain/chat_models/universal");
    const lastCall = (initChatModel as jest.Mock).mock.calls.at(-1) as any[];
    expect(lastCall[1]).toMatchObject({
      modelProvider: "ollama",
      baseUrl: "http://localhost:11434",
    });
  });

  it("uses configured ollama baseUrl when provided", async () => {
    const manager = getModelManager();
    const config: any = {
      configurable: {
        reviewerModelName: "ollama:qwen2.5-coder",
        ollamaBaseUrl: "http://my-ollama:11434",
      },
    };

    const model = await manager.loadModel(config, "reviewer" as any);
    expect(model).toBeTruthy();
    const { initChatModel } = require("langchain/chat_models/universal");
    const lastCall = (initChatModel as jest.Mock).mock.calls.at(-1) as any[];
    expect(lastCall[1]).toMatchObject({
      modelProvider: "ollama",
      baseUrl: "http://my-ollama:11434",
    });
  });
});


