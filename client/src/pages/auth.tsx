import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { useLocation } from "wouter";
import { googleAuthService } from "@/lib/google-auth";

declare global {
  interface Window {
    google: any;
  }
}

export default function Auth() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [useRealAuth, setUseRealAuth] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clear any previous errors when toggling auth mode
    setGoogleAuthError(null);
    
    // Check if Google OAuth is properly configured
    if (useRealAuth) {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      console.log('Google Client ID check:', clientId);
      
      const hasGoogleClientId = clientId && 
        clientId !== 'your-google-client-id.apps.googleusercontent.com' &&
        clientId.length > 0 &&
        clientId.includes('.apps.googleusercontent.com');
      
      console.log('Has valid Google Client ID:', hasGoogleClientId);
      
      if (!hasGoogleClientId) {
        setGoogleAuthError('Google Client ID not configured');
      }
    }
  }, [useRealAuth]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    
    try {
      if (useRealAuth) {
        // Real Google OAuth - redirect to backend OAuth flow
        window.location.href = '/api/auth/google';
        return;
      } else {
        // Mock Google OAuth for development
        const mockGoogleData = {
          googleId: `google_${Date.now()}`,
          email: "user@example.com",
          username: "John Doe",
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=32&h=32"
        };
        await login(mockGoogleData);
        setLocation("/dashboard");
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">Gemini CLI Desktop</CardTitle>
          <p className="text-gray-400 mt-2">
            Sign in to access your AI-powered development environment
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <span className="text-sm text-gray-300">Use Real Google OAuth</span>
            <Button
              variant={useRealAuth ? "default" : "outline"}
              size="sm"
              onClick={() => setUseRealAuth(!useRealAuth)}
              className="ml-2"
            >
              {useRealAuth ? "ON" : "OFF"}
            </Button>
          </div>

          {useRealAuth ? (
            <div className="space-y-3">
              {googleAuthError ? (
                <div className="p-4 bg-red-900/20 border border-red-600 rounded-lg text-center">
                  <p className="text-red-400 font-medium">Google OAuth Not Configured</p>
                  <p className="text-red-300 text-sm mt-2">
                    {googleAuthError}
                  </p>
                  <div className="mt-3 text-xs text-red-300">
                    <p>To enable Google OAuth:</p>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Create a Google Cloud project</li>
                      <li>Enable Google+ API</li>
                      <li>Create OAuth 2.0 credentials</li>
                      <li>Add VITE_GOOGLE_CLIENT_ID to environment</li>
                    </ol>
                  </div>
                  <Button
                    onClick={() => setUseRealAuth(false)}
                    variant="outline"
                    size="sm"
                    className="mt-3 border-red-600 text-red-300 hover:bg-red-900/30"
                  >
                    Use Mock Authentication
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Redirecting to Google...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>Continue with Google</span>
                      </div>
                    )}
                  </Button>
                  <div className="text-center text-sm text-gray-400">
                    <p>Secure server-side OAuth flow with Google.</p>
                    <p className="mt-2">Uses both Client ID and Client Secret for authentication.</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google (Mock)</span>
                  </div>
                )}
              </Button>
              
              <div className="text-center text-sm text-gray-400">
                <p>For demo purposes, this will create a mock user account.</p>
                <p className="mt-2">Toggle "Real Google OAuth" above for production mode.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
