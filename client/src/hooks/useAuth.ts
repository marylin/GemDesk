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
  const [token, setToken] = useState<string | null>(null);
  
  // Initialize token from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    setToken(savedToken);
  }, []);

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    retry: false,
    enabled: !!token, // Only run query if we have a token
    queryFn: async () => {
      if (!token) return null;
      
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          return data.user;
        }
        // If 401, clear the invalid token
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          setToken(null);
          queryClient.clear();
        }
        return null;
      } catch {
        localStorage.removeItem('auth_token');
        setToken(null);
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
      setToken(data.token);
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (token) {
        await apiRequest('POST', '/api/auth/logout', undefined);
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
