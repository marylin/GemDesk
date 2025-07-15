import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs-extra";
import path from "path";
import { storage } from "./storage";
import { authService } from "./services/auth";
import { fileService } from "./services/files";
import { geminiService } from "./services/gemini";
import { insertChatMessageSchema, insertFileSchema, type User } from "@shared/schema";
import { z } from "zod";

// Load environment variables
dotenv.config();

interface AuthenticatedRequest extends Request {
  user?: User;
}

interface SocketData {
  userId?: number;
  username?: string;
}

interface WebSocketMessage {
  type: 'chat_message' | 'ai_response' | 'typing' | 'ping' | 'pong' | 'connected' | 'error';
  content?: string;
  metadata?: any;
  error?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Socket.IO server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Multer configuration for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allow common text file types
      const allowedMimes = [
        'text/plain',
        'text/javascript',
        'text/typescript',
        'application/javascript',
        'application/json',
        'text/html',
        'text/css',
        'text/markdown'
      ];
      
      if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(txt|js|ts|jsx|tsx|json|html|css|md|py|java|cpp|c|h|hpp|sql|xml|yaml|yml)$/)) {
        cb(null, true);
      } else {
        cb(new Error('File type not supported'), false);
      }
    }
  });

  // Middleware to extract user from session
  const authenticateUser = async (req: AuthenticatedRequest, res: any, next: any) => {
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    // Try to get token from cookie if not in header
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'session_token') {
          token = value;
          break;
        }
      }
    }
    
    if (token) {
      try {
        const user = await authService.validateSession(token);
        if (user) {
          req.user = user;
        }
      } catch (error) {
        console.error('Session validation error:', error);
      }
    }
    next();
  };

  app.use(authenticateUser);

  // Auth routes
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { googleId, email, username, avatar } = req.body;
      
      if (!googleId || !email || !username) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const result = await authService.authenticateWithGoogle(googleId, email, username, avatar);
      
      console.log('Authentication successful for user:', username, 'with token:', result.token.substring(0, 10) + '...');
      
      res.cookie('session_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.json({ user: result.user, token: result.token });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      let token = req.headers.authorization?.replace('Bearer ', '');
      
      // Try to get token from cookie if not in header
      if (!token && req.headers.cookie) {
        const cookies = req.headers.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'session_token') {
            token = value;
            break;
          }
        }
      }
      
      if (token) {
        await authService.logout(token);
      }

      res.clearCookie('session_token');
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Logout failed' });
    }
  });

  app.get('/api/auth/me', async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    res.json({ user: req.user });
  });

  // File routes
  app.get('/api/files', async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      const parentId = req.query.parentId ? parseInt(req.query.parentId as string) : undefined;
      const files = await fileService.getFiles(req.user.id, parentId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch files' });
    }
  });

  app.get('/api/files/:id', async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      const file = await fileService.getFile(parseInt(req.params.id), req.user.id);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch file' });
    }
  });

  app.post('/api/files', async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      const { name, type, content, parentPath } = req.body;
      
      if (!name || !type) {
        return res.status(400).json({ message: 'Name and type are required' });
      }

      const file = await fileService.createFile(
        req.user.id,
        name,
        parentPath || "",
        type,
        content || ""
      );

      res.status(201).json(file);
    } catch (error) {
      console.error('File creation error:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to create file' });
    }
  });

  app.put('/api/files/:id', async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      const { name, content } = req.body;
      const file = await fileService.updateFile(parseInt(req.params.id), req.user.id, { name, content });
      
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }

      res.json(file);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update file' });
    }
  });

  app.delete('/api/files/:id', async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      const success = await fileService.deleteFile(parseInt(req.params.id), req.user.id);
      
      if (!success) {
        return res.status(404).json({ message: 'File not found' });
      }

      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete file' });
    }
  });

  // File upload endpoint using multer
  app.post('/api/files/upload', upload.single('file'), async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { parentPath = "" } = req.body;
      const content = req.file.buffer.toString('utf-8');
      
      // Use fs-extra to potentially write to temp directory if needed
      const tempPath = path.join(process.cwd(), 'tmp', req.file.originalname);
      await fs.ensureDir(path.dirname(tempPath));
      
      const file = await fileService.createFile(
        req.user.id,
        req.file.originalname,
        parentPath,
        'file',
        content
      );

      res.status(201).json(file);
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to upload file' });
    }
  });

  // Multiple file upload endpoint
  app.post('/api/files/upload-multiple', upload.array('files', 10), async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const { parentPath = "" } = req.body;
      const uploadedFiles = [];

      for (const file of files) {
        const content = file.buffer.toString('utf-8');
        
        // Use fs-extra to ensure temp directory exists
        const tempDir = path.join(process.cwd(), 'tmp');
        await fs.ensureDir(tempDir);
        
        const uploadedFile = await fileService.createFile(
          req.user.id,
          file.originalname,
          parentPath,
          'file',
          content
        );
        uploadedFiles.push(uploadedFile);
      }

      res.status(201).json({ files: uploadedFiles });
    } catch (error) {
      console.error('Multiple file upload error:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to upload files' });
    }
  });

  // Chat routes
  app.get('/api/chat/messages', async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getChatMessages(req.user.id, limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.post('/api/chat/messages', async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      const { content, metadata } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: 'Content is required' });
      }

      const message = await storage.createChatMessage({
        content,
        sender: 'user',
        userId: req.user.id,
        metadata
      });

      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create message' });
    }
  });

  // Gemini routes
  app.post('/api/gemini/chat', async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      const { message, context } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: 'Message is required' });
      }

      // Save user message first
      await storage.createChatMessage({
        content: message,
        sender: 'user',
        userId: req.user.id,
        metadata: context
      });

      // Get AI response
      const response = await geminiService.sendMessage(message, context);

      // Save AI response
      await storage.createChatMessage({
        content: response.message,
        sender: 'ai',
        userId: req.user.id,
        metadata: response.metadata
      });

      res.json(response);
    } catch (error) {
      console.error('Gemini chat error:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to get AI response' });
    }
  });

  app.post('/api/gemini/analyze-code', async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      const { code, language } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ message: 'Code and language are required' });
      }

      const response = await geminiService.analyzeCode(code, language);
      res.json(response);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to analyze code' });
    }
  });

  app.post('/api/gemini/generate-code', async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      const { description, language } = req.body;
      
      if (!description) {
        return res.status(400).json({ message: 'Description is required' });
      }

      const response = await geminiService.generateCode(description, language);
      res.json(response);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to generate code' });
    }
  });

  // Socket.IO handling
  io.on('connection', async (socket) => {
    console.log('Socket.IO client connected');

    // Handle authentication
    const token = socket.handshake.auth.token;

    if (token) {
      try {
        const user = await authService.validateSession(token);
        if (user) {
          socket.data.userId = user.id;
          socket.data.username = user.username;
          console.log(`Socket.IO authenticated for user: ${user.username} (ID: ${user.id})`);
          
          // Send welcome message
          socket.emit('connected', { message: 'Socket.IO connection established' });
        } else {
          console.log('Socket.IO authentication failed: Invalid token');
          socket.emit('error', { error: 'Authentication failed' });
          socket.disconnect();
          return;
        }
      } catch (error) {
        console.error('Socket.IO authentication error:', error);
        socket.emit('error', { error: 'Authentication failed' });
        socket.disconnect();
        return;
      }
    } else {
      console.log('Socket.IO connection without token');
      socket.emit('error', { error: 'No authentication token provided' });
      socket.disconnect();
      return;
    }

    socket.on('chat_message', async (data) => {
      try {
        const { content, metadata } = data;
        
        if (content && socket.data.userId) {
          // Save user message
          await storage.createChatMessage({
            content,
            sender: 'user',
            userId: socket.data.userId,
            metadata
          });

          // Get AI response
          try {
            const response = await geminiService.sendMessage(content, metadata);
            
            // Save AI response
            await storage.createChatMessage({
              content: response.message,
              sender: 'ai',
              userId: socket.data.userId,
              metadata: response.metadata
            });

            // Send AI response back
            socket.emit('ai_response', {
              content: response.message,
              metadata: response.metadata
            });
          } catch (error) {
            console.error('AI response error:', error);
            socket.emit('error', { error: 'Failed to get AI response' });
          }
        }
      } catch (error) {
        console.error('Socket.IO message error:', error);
        socket.emit('error', { error: 'Message processing failed' });
      }
    });

    socket.on('typing', (data) => {
      // Echo typing indicator to other users (if needed)
      socket.broadcast.emit('typing', data);
    });

    socket.on('ping', () => {
      socket.emit('pong');
    });

    socket.on('disconnect', () => {
      console.log(`Socket.IO client disconnected: ${socket.data.username || 'unknown'}`);
    });

    socket.on('error', (error) => {
      console.error('Socket.IO error:', error);
    });
  });

  return httpServer;
}
