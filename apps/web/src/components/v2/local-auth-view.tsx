"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface LocalAuthViewProps {
  children: React.ReactNode;
}

/**
 * Component that shows appropriate content based on authentication method
 * For local users, shows an info banner about GitHub features
 * For GitHub users, shows the normal GitHub-integrated interface
 */
export function LocalAuthView({ children }: LocalAuthViewProps) {
  const { user, isLocalAuth, isGitHubAuth, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isLocalAuth) {
    return (
      <div className="space-y-6">
        {/* Welcome message for local users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Welcome, {user?.name || user?.login}!
            </CardTitle>
            <CardDescription>
              You're signed in with a local account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Local Authentication Mode:</strong> You're using local authentication. 
                GitHub repository features are not available in this mode. To access GitHub 
                repositories and create issues, please sign in with GitHub instead.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Basic chat interface without GitHub features */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Chat Interface</h2>
          <p className="text-muted-foreground">
            You can use the basic chat functionality. GitHub integration features 
            (repository selection, issue creation, etc.) require GitHub authentication.
          </p>
          
          {/* Show the children but in a limited context */}
          <div className="opacity-75">
            {children}
          </div>
        </div>
      </div>
    );
  }

  if (isGitHubAuth) {
    // Show full GitHub-integrated interface
    return <>{children}</>;
  }

  // Fallback for unauthenticated state
  return (
    <div className="flex items-center justify-center h-64">
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Please sign in to continue.</p>
        </CardContent>
      </Card>
    </div>
  );
}
