import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Auth from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import TestPage from "@/pages/test";
import { useAuth } from "./hooks/useAuth";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useEffect } from "react";

function Router() {
  const { user, isLoading } = useAuth();
  
  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    const token = urlParams.get('token');
    
    if (authStatus === 'success' && token) {
      localStorage.setItem('auth_token', token);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Reload to refresh auth state
      window.location.reload();
    } else if (authStatus === 'error') {
      console.error('OAuth authentication failed');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={user ? Dashboard : Auth} />
      <Route path="/auth" component={Auth} />
      <Route path="/dashboard" component={user ? Dashboard : Auth} />
      <Route path="/test" component={user ? TestPage : Auth} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Toaster />
        <Router />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
