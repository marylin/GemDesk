import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface AuthResult {
  user: User;
  token: string;
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    retry: false,
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          return data.user;
        }
        return null;
      } catch {
        return null;
      }
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (authData: { googleId: string; email: string; username: string; avatar?: string }) => {
      const response = await apiRequest('POST', '/api/auth/google', authData);
      return await response.json() as AuthResult;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/me'], data.user);
      localStorage.setItem('auth_token', data.token);
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/auth/logout');
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/me'], null);
      localStorage.removeItem('auth_token');
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
    isLoading: isLoading || loginMutation.isPending || logoutMutation.isPending,
    login,
    logout,
    isAuthenticated: !!user
  };
}
