interface GoogleAuthConfig {
  clientId: string;
  redirectUri: string;
}

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export class GoogleAuthService {
  private config: GoogleAuthConfig;
  private scriptLoaded = false;

  constructor(config: GoogleAuthConfig) {
    this.config = config;
  }

  async loadGoogleScript(): Promise<void> {
    if (this.scriptLoaded) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async initializeGoogleAuth(): Promise<void> {
    await this.loadGoogleScript();
    
    return new Promise((resolve) => {
      window.google.accounts.id.initialize({
        client_id: this.config.clientId,
        callback: this.handleCredentialResponse.bind(this),
      });
      resolve();
    });
  }

  private handleCredentialResponse(response: any) {
    // This will be handled by the component that calls signIn
  }

  async signIn(): Promise<GoogleUser> {
    await this.initializeGoogleAuth();
    
    return new Promise((resolve, reject) => {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback to popup
          this.signInWithPopup().then(resolve).catch(reject);
        }
      });

      // Override the callback to handle the response
      window.google.accounts.id.initialize({
        client_id: this.config.clientId,
        callback: (response: any) => {
          const userData = this.parseJwtToken(response.credential);
          resolve(userData);
        },
      });
    });
  }

  private async signInWithPopup(): Promise<GoogleUser> {
    return new Promise((resolve, reject) => {
      const popup = window.open(
        `https://accounts.google.com/oauth/v2/auth?` +
        `client_id=${this.config.clientId}&` +
        `redirect_uri=${encodeURIComponent(this.config.redirectUri)}&` +
        `response_type=code&` +
        `scope=openid email profile&` +
        `access_type=offline`,
        'google-auth',
        'width=500,height=600'
      );

      if (!popup) {
        reject(new Error('Failed to open popup'));
        return;
      }

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          reject(new Error('Popup closed by user'));
        }
      }, 1000);

      // Listen for messages from the popup
      window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          clearInterval(checkClosed);
          popup.close();
          resolve(event.data.user);
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          clearInterval(checkClosed);
          popup.close();
          reject(new Error(event.data.error));
        }
      });
    });
  }

  private parseJwtToken(token: string): GoogleUser {
    try {
      const payload = token.split('.')[1];
      const decodedPayload = atob(payload);
      const userData = JSON.parse(decodedPayload);
      
      return {
        id: userData.sub,
        email: userData.email,
        name: userData.name,
        picture: userData.picture
      };
    } catch (error) {
      throw new Error('Failed to parse JWT token');
    }
  }

  renderSignInButton(element: HTMLElement, options?: { theme?: 'outline' | 'filled_blue' | 'filled_black' }) {
    if (!this.scriptLoaded) {
      this.loadGoogleScript().then(() => {
        this.renderButton(element, options);
      });
    } else {
      this.renderButton(element, options);
    }
  }

  private renderButton(element: HTMLElement, options?: { theme?: 'outline' | 'filled_blue' | 'filled_black' }) {
    window.google.accounts.id.renderButton(element, {
      theme: options?.theme || 'outline',
      size: 'large',
      width: element.offsetWidth
    });
  }
}

// Environment configuration - in production, these would come from environment variables
const getGoogleAuthConfig = (): GoogleAuthConfig => {
  // For development, we'll use a mock configuration
  // In production, replace with actual Google OAuth client ID
  return {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com',
    redirectUri: `${window.location.origin}/auth/callback`
  };
};

export const googleAuthService = new GoogleAuthService(getGoogleAuthConfig());

declare global {
  interface Window {
    google: any;
  }
}