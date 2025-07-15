import { storage } from "../storage";
import { InsertUser, User } from "@shared/schema";
import crypto from "crypto";

export interface AuthResult {
  user: User;
  token: string;
}

export class AuthService {
  async authenticateWithGoogle(googleId: string, email: string, username: string, avatar?: string): Promise<AuthResult> {
    try {
      // Check if user exists with Google ID
      let user = await storage.getUserByGoogleId(googleId);
      
      if (!user) {
        // Check if user exists with email
        user = await storage.getUserByEmail(email);
        
        if (user) {
          // Link Google account to existing user
          user = await storage.updateUser(user.id, { googleId, avatar });
        } else {
          // Create new user
          const userData: InsertUser = {
            username,
            email,
            googleId,
            avatar
          };
          user = await storage.createUser(userData);
        }
      }

      if (!user) {
        throw new Error("Failed to create or retrieve user");
      }

      // Create session
      const token = this.generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await storage.createSession({
        userId: user.id,
        token,
        expiresAt
      });

      return { user, token };
    } catch (error) {
      console.error('Google authentication error:', error);
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  async validateSession(token: string): Promise<User | null> {
    try {
      if (!token) return null;

      const session = await storage.getSession(token);
      if (!session) return null;

      const user = await storage.getUser(session.userId);
      return user || null;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  async logout(token: string): Promise<boolean> {
    try {
      return await storage.deleteSession(token);
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async cleanupExpiredSessions(): Promise<void> {
    await storage.deleteExpiredSessions();
  }
}

export const authService = new AuthService();
