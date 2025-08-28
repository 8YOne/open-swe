"use client";

import { DefaultView } from "@/components/v2/default-view";
import { LocalAuthView } from "@/components/v2/local-auth-view";
import { useThreadsSWR } from "@/hooks/useThreadsSWR";
import { GitHubAppProvider, useGitHubAppProvider } from "@/providers/GitHubApp";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";
import { MANAGER_GRAPH_ID } from "@openswe/shared/constants";

function ChatPageComponent() {
  const { currentInstallation } = useGitHubAppProvider();
  const { threads, isLoading: threadsLoading } = useThreadsSWR({
    assistantId: MANAGER_GRAPH_ID,
    currentInstallation,
  });

  if (!threads) {
    return <div>No threads</div>;
  }

  return (
    <div className="bg-background h-screen">
      <Suspense>
        <Toaster />
        <LocalAuthView>
          <DefaultView
            threads={threads}
            threadsLoading={threadsLoading}
          />
        </LocalAuthView>
      </Suspense>
    </div>
  );
}

export default function ChatPage() {
  return (
    <GitHubAppProvider>
      <ChatPageComponent />
    </GitHubAppProvider>
  );
}
