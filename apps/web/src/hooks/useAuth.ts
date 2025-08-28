import { useState, useEffect, useCallback } from "react";

export interface User {
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  html_url: string | null;
  provider: "local" | "github";
}

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isLocalAuth: boolean;
  isGitHubAuth: boolean;
  refreshUser: () => Promise<void>;
}

/**
 * Hook for managing user authentication state
 * Fetches current user info and provides authentication status
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/auth/user");

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else if (response.status === 401) {
        // User is not authenticated
        setUser(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch user info");
        setUser(null);
      }
    } catch (err) {
      setError("Network error while fetching user info");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return {
    user,
    isLoading,
    error,
    isAuthenticated: user !== null,
    isLocalAuth: user?.provider === "local",
    isGitHubAuth: user?.provider === "github",
    refreshUser,
  };
}
