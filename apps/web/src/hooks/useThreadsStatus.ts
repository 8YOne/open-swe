import useSWR from "swr";
import { ThreadUIStatus, ThreadStatusData } from "@/lib/schemas/thread-status";
import { fetchThreadStatus } from "@/services/thread-status.service";
import { THREAD_STATUS_SWR_CONFIG } from "@/lib/swr-config";
import { useMemo, useRef } from "react";

interface ThreadStatusMap {
  [threadId: string]: ThreadUIStatus;
}

interface ThreadStatusCounts {
  all: number;
  running: number;
  completed: number;
  failed: number;
  pending: number;
  idle: number;
  paused: number;
  error: number;
}

interface GroupedThreads {
  running: string[];
  completed: string[];
  failed: string[];
  pending: string[];
  idle: string[];
  paused: string[];
  error: string[];
}

interface UseThreadsStatusResult {
  statusMap: ThreadStatusMap;
  statusCounts: ThreadStatusCounts;
  groupedThreads: GroupedThreads;
  isLoading: boolean;
  hasErrors: boolean;
}

/**
 * Fetches statuses for multiple threads in parallel
 * Uses and updates lastPollingStates for optimization
 */
async function fetchAllThreadStatuses(
  threadIds: string[],
  lastPollingStates: Map<string, ThreadStatusData>,
): Promise<{
  statusMap: ThreadStatusMap;
  updatedStates: Map<string, ThreadStatusData>;
}> {
  const statusPromises = threadIds.map(async (threadId) => {
    try {
      const lastState = lastPollingStates.get(threadId) || null;
      const statusData = await fetchThreadStatus(threadId, lastState);
      return { threadId, status: statusData.status, statusData };
    } catch (error) {
      console.error(`Failed to fetch status for thread ${threadId}:`, error);
      return {
        threadId,
        status: "idle" as ThreadUIStatus,
        statusData: null,
      };
    }
  });

  const results = await Promise.all(statusPromises);
  const statusMap: ThreadStatusMap = {};
  const updatedStates = new Map<string, ThreadStatusData>();

  results.forEach(({ threadId, status, statusData }) => {
    statusMap[threadId] = status;
    if (statusData) {
      updatedStates.set(threadId, statusData);
    }
  });

  return { statusMap, updatedStates };
}

/**
 * Hook that fetches statuses for multiple threads in parallel
 * Uses SWR for caching and deduplication with state optimization
 */
export function useThreadsStatus(threadIds: string[]): UseThreadsStatusResult {
  // Store last polling states for optimization
  const lastPollingStatesRef = useRef<Map<string, ThreadStatusData>>(new Map());

  // Create a stable key for the thread IDs array
  const threadIdsKey = threadIds.sort().join(",");

  // Fetch all thread statuses in a single SWR call
  const {
    data: fetchResult,
    isLoading,
    error,
  } = useSWR(
    threadIds.length > 0 ? `threads-status-${threadIdsKey}` : null,
    async () => {
      const result = await fetchAllThreadStatuses(
        threadIds,
        lastPollingStatesRef.current,
      );
      // Update the stored states
      lastPollingStatesRef.current = result.updatedStates;
      return result;
    },
    THREAD_STATUS_SWR_CONFIG,
  );

  const statusMap = fetchResult?.statusMap || {};

  return useMemo(() => {
    const groupedThreads: GroupedThreads = {
      running: [],
      completed: [],
      failed: [],
      pending: [],
      idle: [],
      paused: [],
      error: [],
    };

    // If we have status data, group threads by status
    if (statusMap) {
      Object.entries(statusMap).forEach(([threadId, status]) => {
        if (groupedThreads[status]) {
          groupedThreads[status].push(threadId);
        }
      });
    }

    // Calculate status counts
    const statusCounts: ThreadStatusCounts = {
      all: threadIds.length,
      running: groupedThreads.running.length,
      completed: groupedThreads.completed.length,
      failed: groupedThreads.failed.length,
      pending: groupedThreads.pending.length,
      idle: groupedThreads.idle.length,
      paused: groupedThreads.paused.length,
      error: groupedThreads.error.length,
    };

    return {
      statusMap: statusMap || {},
      statusCounts,
      groupedThreads,
      isLoading,
      hasErrors: !!error,
    };
  }, [statusMap, threadIds, threadIdsKey, isLoading, error]);
}
