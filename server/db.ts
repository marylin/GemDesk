import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import type { IStorage, User, InsertUser, File, InsertFile, ChatMessage, InsertChatMessage, Session, InsertSession } from "./storage";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.googleId, googleId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(schema.users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, id))
      .returning();
    return user || undefined;
  }

  async getFiles(userId: number, parentId?: number): Promise<File[]> {
    const condition = parentId 
      ? eq(schema.files.parentId, parentId)
      : eq(schema.files.userId, userId);
    
    return await db.select().from(schema.files).where(condition);
  }

  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(schema.files).where(eq(schema.files.id, id));
    return file || undefined;
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const [file] = await db
      .insert(schema.files)
      .values(insertFile)
      .returning();
    return file;
  }

  async updateFile(id: number, updates: Partial<InsertFile>): Promise<File | undefined> {
    const [file] = await db
      .update(schema.files)
      .set(updates)
      .where(eq(schema.files.id, id))
      .returning();
    return file || undefined;
  }

  async deleteFile(id: number): Promise<boolean> {
    const result = await db.delete(schema.files).where(eq(schema.files.id, id));
    return result.rowCount > 0;
  }

  async getFileByPath(userId: number, path: string): Promise<File | undefined> {
    const [file] = await db.select().from(schema.files)
      .where(eq(schema.files.userId, userId))
      .where(eq(schema.files.path, path));
    return file || undefined;
  }

  async getChatMessages(userId: number, limit: number = 50): Promise<ChatMessage[]> {
    return await db.select().from(schema.chatMessages)
      .where(eq(schema.chatMessages.userId, userId))
      .orderBy(schema.chatMessages.createdAt)
      .limit(limit);
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(schema.chatMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async deleteChatMessage(id: number): Promise<boolean> {
    const result = await db.delete(schema.chatMessages).where(eq(schema.chatMessages.id, id));
    return result.rowCount > 0;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db
      .insert(schema.sessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async getSession(token: string): Promise<Session | undefined> {
    const [session] = await db.select().from(schema.sessions).where(eq(schema.sessions.token, token));
    return session || undefined;
  }

  async deleteSession(token: string): Promise<boolean> {
    const result = await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
    return result.rowCount > 0;
  }

  async deleteExpiredSessions(): Promise<void> {
    const now = new Date();
    await db.delete(schema.sessions).where(eq(schema.sessions.expiresAt, now));
  }
}