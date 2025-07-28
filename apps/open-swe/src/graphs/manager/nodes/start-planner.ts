import { v4 as uuidv4 } from "uuid";
import { GraphConfig } from "@open-swe/shared/open-swe/types";
import {
  ManagerGraphState,
  ManagerGraphUpdate,
} from "@open-swe/shared/open-swe/manager/types";
import { createLangGraphClient } from "../../../utils/langgraph-client.js";
import { PLANNER_GRAPH_ID } from "@open-swe/shared/constants";
import { createLogger, LogLevel } from "../../../utils/logger.js";
import { getBranchName } from "../../../utils/github/git.js";
import { PlannerGraphUpdate } from "@open-swe/shared/open-swe/planner/types";
import { getDefaultHeaders } from "../../../utils/default-headers.js";
import { getCustomConfigurableFields } from "../../../utils/config.js";
import { getRecentUserRequest } from "../../../utils/user-request.js";

const logger = createLogger(LogLevel.INFO, "StartPlanner");

/**
 * Start planner node.
 * This node will kickoff a new planner session using the LangGraph SDK.
 */
export async function startPlanner(
  state: ManagerGraphState,
  config: GraphConfig,
): Promise<ManagerGraphUpdate> {
  const langGraphClient = createLangGraphClient({
    defaultHeaders: getDefaultHeaders(config),
  });

  const plannerThreadId = state.plannerSession?.threadId ?? uuidv4();
  const followupMessage = getRecentUserRequest(state.messages, {
    returnFullMessage: true,
  });
  
  // For initial planner runs, pass all messages if no followup message exists
  const isInitialRun = !state.plannerSession?.threadId;
  const messagesToPass = followupMessage 
    ? [followupMessage] 
    : (isInitialRun && state.messages.length > 0 ? state.messages : []);
  
  // Debug: Log messages being passed to planner
  logger.info("Messages being passed to planner", {
    isInitialRun,
    hasFollowupMessage: !!followupMessage,
    messagesToPassCount: messagesToPass.length,
    messagesToPassTypes: messagesToPass.map(m => ({
      type: m._getType(),
      hasToolCalls: 'tool_calls' in m ? (m as any).tool_calls?.length : 0,
      toolCallId: 'tool_call_id' in m ? (m as any).tool_call_id : null,
      id: m.id,
    }))
  });
  
  try {
    const runInput: PlannerGraphUpdate = {
      // github issue ID & target repo so the planning agent can fetch the user's request, and clone the repo.
      githubIssueId: state.githubIssueId,
      targetRepository: state.targetRepository,
      // Include the existing task plan, so the agent can use it as context when generating followup tasks.
      taskPlan: state.taskPlan,
      branchName: state.branchName ?? getBranchName(config),
      autoAcceptPlan: state.autoAcceptPlan,
      ...(messagesToPass.length > 0 && { messages: messagesToPass }),
    };
    const run = await langGraphClient.runs.create(
      plannerThreadId,
      PLANNER_GRAPH_ID,
      {
        input: runInput,
        config: {
          recursion_limit: 400,
          configurable: getCustomConfigurableFields(config),
        },
        ifNotExists: "create",
        multitaskStrategy: "enqueue",
        streamResumable: true,
        streamMode: ["values", "updates", "messages-tuple", "custom"],
      },
    );

    return {
      plannerSession: {
        threadId: plannerThreadId,
        runId: run.run_id,
      },
    };
  } catch (error) {
    logger.error("Failed to start planner", {
      ...(error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : {
            error,
          }),
    });
    throw error;
  }
}
