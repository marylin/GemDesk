import axios from 'axios';
import { URL } from 'url';

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

export class GoogleOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.VITE_GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    
    // Use the correct Replit domain for OAuth redirect
    const replitDomain = process.env.REPLIT_DOMAINS || 'workspace--MarylinAlarcon.repl.co';
    this.redirectUri = `https://${replitDomain}/api/auth/google/callback`;
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw new Error('Failed to exchange code for tokens');
    }
  }

  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('User info error:', error);
      throw new Error('Failed to get user info');
    }
  }

  async refreshToken(refreshToken: string): Promise<GoogleTokenResponse> {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error('Failed to refresh token');
    }
  }

  parseJwtToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      const decodedPayload = Buffer.from(payload, 'base64').toString();
      return JSON.parse(decodedPayload);
    } catch (error) {
      throw new Error('Failed to parse JWT token');
    }
  }
}

export const googleOAuthService = new GoogleOAuthService();