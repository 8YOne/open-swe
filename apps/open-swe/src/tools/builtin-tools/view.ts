import { tool } from "@langchain/core/tools";
import { GraphState, GraphConfig } from "@open-swe/shared/open-swe/types";
import { createLogger, LogLevel } from "../../utils/logger.js";
import { getRepoAbsolutePath } from "@open-swe/shared/git";
import { getSandboxSessionOrThrow } from "../utils/get-sandbox-id.js";
import { createViewToolFields } from "@open-swe/shared/open-swe/tools";
import { handleViewCommand } from "./handlers.js";
import { isLocalMode, getLocalWorkingDirectory } from "../../utils/local-mode.js";
import { getLocalShellExecutor } from "../../utils/local-shell-executor.js";
import { TIMEOUT_SEC } from "@open-swe/shared/constants";

const logger = createLogger(LogLevel.INFO, "ViewTool");

export function createViewTool(
  state: Pick<GraphState, "sandboxSessionId" | "targetRepository">,
  config: GraphConfig,
) {
  const viewTool = tool(
    async (input): Promise<{ result: string; status: "success" | "error" }> => {
      try {
        const { command, path, view_range } = input as any;
        if (command !== "view") {
          throw new Error(`Unknown command: ${command}`);
        }

        let workDir;
        if (isLocalMode(config)) {
          // In local mode, use the local working directory
          workDir = getLocalWorkingDirectory();
        } else {
          // In sandbox mode, use the sandbox path
          const sandbox = await getSandboxSessionOrThrow(input);
          workDir = getRepoAbsolutePath(state.targetRepository);
        }

        let result;
        if (isLocalMode(config)) {
          // Local mode: use LocalShellExecutor for file viewing
          const executor = getLocalShellExecutor(getLocalWorkingDirectory());
          const filePath = `${workDir}/${path}`;
          
          // Use cat command to view file content
          const response = await executor.executeCommand(
            `cat "${filePath}"`,
            workDir,
            {},
            TIMEOUT_SEC,
            true, // localMode
          );
          
          if (response.exitCode !== 0) {
            throw new Error(`Failed to read file: ${response.result}`);
          }
          
          result = response.result;
        } else {
          // Sandbox mode: use existing handler
          const sandbox = await getSandboxSessionOrThrow(input);
          result = await handleViewCommand(
            sandbox,
            path,
            workDir,
            view_range as [number, number] | undefined,
          );
        }

        logger.info(`View command executed successfully on ${path}`);
        return { result, status: "success" };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`View command failed: ${errorMessage}`);
        return {
          result: `Error: ${errorMessage}`,
          status: "error",
        };
      }
    },
    createViewToolFields(state.targetRepository),
  );

  return viewTool;
}
