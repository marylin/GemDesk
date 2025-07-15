import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { User } from "@shared/schema";

interface AuthResult {
  user: User;
  token: string;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  
  // Initialize token from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors - these are expected when not authenticated
      if (error.response?.status === 401) {
        return false;
      }
      return failureCount < 2; // Retry up to 2 times for other errors
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      try {
        const response = await api.get<{ user: User }>('/auth/me');
        // If we successfully get user data, extract the token from the response or session
        if (response.data.user && !token) {
          // Try to get token from session/cookie or generate one
          const sessionToken = localStorage.getItem('auth_token') || 'session_token_' + Date.now();
          setToken(sessionToken);
          localStorage.setItem('auth_token', sessionToken);
        }
        return response.data.user;
      } catch (error: any) {
        // Only clear token on actual 401 errors
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          setToken(null);
        }
        return null;
      }
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (authData: { googleId: string; email: string; username: string; avatar?: string }) => {
      const response = await api.post<AuthResult>('/auth/google', authData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/me'], data.user);
      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (token) {
        await api.post('/auth/logout');
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/me'], null);
      localStorage.removeItem('auth_token');
      setToken(null);
      queryClient.clear();
    }
  });

  const login = (authData: { googleId: string; email: string; username: string; avatar?: string }) => {
    return loginMutation.mutateAsync(authData);
  };

  const logout = () => {
    return logoutMutation.mutateAsync();
  };

  return {
    user,
    token,
    isLoading: isLoading || loginMutation.isPending || logoutMutation.isPending,
    login,
    logout,
    isAuthenticated: !!user && !!token
  };
}
