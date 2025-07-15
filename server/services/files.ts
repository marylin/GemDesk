import { storage } from "../storage";
import { InsertFile, File } from "@shared/schema";
import path from "path";

export class FileService {
  async getFiles(userId: number, parentId?: number): Promise<File[]> {
    return await storage.getFiles(userId, parentId);
  }

  async getFile(id: number, userId: number): Promise<File | undefined> {
    const file = await storage.getFile(id);
    if (file && file.userId !== userId) {
      return undefined; // Ensure user can only access their own files
    }
    return file;
  }

  async createFile(userId: number, name: string, parentPath: string = "", type: "file" | "folder" = "file", content: string = ""): Promise<File> {
    const fullPath = path.join(parentPath, name).replace(/\\/g, '/');
    
    // Check if file already exists
    const existingFile = await storage.getFileByPath(userId, fullPath);
    if (existingFile) {
      throw new Error(`${type} already exists at path: ${fullPath}`);
    }

    // Find parent folder if parentPath is provided
    let parentId: number | null = null;
    if (parentPath && parentPath !== "/") {
      const parentFile = await storage.getFileByPath(userId, parentPath);
      if (parentFile && parentFile.type === "folder") {
        parentId = parentFile.id;
      }
    }

    const fileData: InsertFile = {
      name,
      path: fullPath,
      content: type === "file" ? content : null,
      type,
      parentId,
      userId
    };

    return await storage.createFile(fileData);
  }

  async updateFile(id: number, userId: number, updates: Partial<{ name: string; content: string }>): Promise<File | undefined> {
    const file = await storage.getFile(id);
    if (!file || file.userId !== userId) {
      return undefined;
    }

    const updateData: Partial<InsertFile> = {};
    
    if (updates.name && updates.name !== file.name) {
      // Update path when name changes
      const newPath = file.path.replace(file.name, updates.name);
      updateData.name = updates.name;
      updateData.path = newPath;
    }

    if (updates.content !== undefined) {
      updateData.content = updates.content;
    }

    return await storage.updateFile(id, updateData);
  }

  async deleteFile(id: number, userId: number): Promise<boolean> {
    const file = await storage.getFile(id);
    if (!file || file.userId !== userId) {
      return false;
    }

    // If it's a folder, delete all children first
    if (file.type === "folder") {
      const children = await this.getFiles(userId, id);
      for (const child of children) {
        await this.deleteFile(child.id, userId);
      }
    }

    return await storage.deleteFile(id);
  }

  async uploadFile(userId: number, fileName: string, content: string, parentPath: string = ""): Promise<File> {
    return await this.createFile(userId, fileName, parentPath, "file", content);
  }

  async getFileContent(id: number, userId: number): Promise<string | null> {
    const file = await this.getFile(id, userId);
    if (!file || file.type !== "file") {
      return null;
    }
    return file.content || "";
  }

  async searchFiles(userId: number, query: string): Promise<File[]> {
    const allFiles = await this.getAllUserFiles(userId);
    return allFiles.filter(file => 
      file.name.toLowerCase().includes(query.toLowerCase()) ||
      (file.content && file.content.toLowerCase().includes(query.toLowerCase()))
    );
  }

  private async getAllUserFiles(userId: number): Promise<File[]> {
    // This is a simple implementation - in a real app you'd want to optimize this
    const rootFiles = await storage.getFiles(userId);
    const allFiles: File[] = [...rootFiles];

    for (const file of rootFiles) {
      if (file.type === "folder") {
        const children = await this.getFilesRecursively(userId, file.id);
        allFiles.push(...children);
      }
    }

    return allFiles;
  }

  private async getFilesRecursively(userId: number, parentId: number): Promise<File[]> {
    const files = await storage.getFiles(userId, parentId);
    const allFiles: File[] = [...files];

    for (const file of files) {
      if (file.type === "folder") {
        const children = await this.getFilesRecursively(userId, file.id);
        allFiles.push(...children);
      }
    }

    return allFiles;
  }
}

export const fileService = new FileService();
