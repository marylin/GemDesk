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
import { geminiCLIService } from "./services/geminiCLI";
import { googleOAuthService } from "./services/googleOAuth";
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
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
  });
  
  console.log('Socket.IO server initialized and listening on port', httpServer.address() || 5000);
  
  // Test endpoint to verify Socket.IO server is working
  app.get('/socket.io/test', (req, res) => {
    res.json({ status: 'Socket.IO server is running', clients: io.engine.clientsCount });
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

  // Standardized authentication middleware - adds user to request if authenticated
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
    
    // For development, set a default user if no authenticated user
    if (process.env.NODE_ENV === 'development' && !req.user) {
      req.user = {
        id: 5,
        username: 'John Doe',
        email: 'john@example.com',
        googleId: 'google123',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    next();
  };

  // Authentication guard middleware - requires authentication
  const requireAuth = (req: AuthenticatedRequest, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    next();
  };

  app.use(authenticateUser);

  // Auth routes
  app.get('/api/auth/google', (req, res) => {
    const authUrl = googleOAuthService.getAuthUrl();
    res.redirect(authUrl);
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ message: 'Authorization code missing' });
    }

    try {
      const tokens = await googleOAuthService.exchangeCodeForTokens(code as string);
      const userInfo = await googleOAuthService.getUserInfo(tokens.access_token);
      
      const result = await authService.authenticateWithGoogle(
        userInfo.id,
        userInfo.email,
        userInfo.name,
        userInfo.picture
      );
      
      console.log('Authentication successful for user:', userInfo.name, 'with token:', result.token.substring(0, 10) + '...');
      
      res.cookie('session_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      // Redirect to frontend with success
      res.redirect(`/?auth=success&token=${result.token}`);
    } catch (error) {
      console.error('Google auth error:', error);
      res.redirect('/?auth=error');
    }
  });

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

  // File routes - all require authentication
  app.get('/api/files', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const parentId = req.query.parentId ? parseInt(req.query.parentId as string) : undefined;
      const files = await fileService.getFiles(req.user!.id, parentId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch files' });
    }
  });

  app.get('/api/files/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const file = await fileService.getFile(parseInt(req.params.id), req.user!.id);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch file' });
    }
  });

  app.post('/api/files', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, type, content, parentPath } = req.body;
      
      if (!name || !type) {
        return res.status(400).json({ message: 'Name and type are required' });
      }

      const file = await fileService.createFile(
        req.user!.id,
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

  app.put('/api/files/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, content } = req.body;
      const file = await fileService.updateFile(parseInt(req.params.id), req.user!.id, { name, content });
      
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }

      res.json(file);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update file' });
    }
  });

  app.delete('/api/files/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const success = await fileService.deleteFile(parseInt(req.params.id), req.user!.id);
      
      if (!success) {
        return res.status(404).json({ message: 'File not found' });
      }

      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete file' });
    }
  });

  // File upload endpoint using multer
  app.post('/api/files/upload', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res) => {
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
        req.user!.id,
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
  app.post('/api/files/upload-multiple', requireAuth, upload.array('files', 10), async (req: AuthenticatedRequest, res) => {

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
          req.user!.id,
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
  app.get('/api/chat/messages', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getChatMessages(req.user!.id, limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.post('/api/chat/messages', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { content, metadata } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: 'Content is required' });
      }

      const message = await storage.createChatMessage({
        content,
        sender: 'user',
        userId: req.user!.id,
        metadata
      });

      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create message' });
    }
  });

  // Gemini routes
  app.post('/api/gemini/chat', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { message, context } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: 'Message is required' });
      }

      // Save user message first
      await storage.createChatMessage({
        content: message,
        sender: 'user',
        userId: req.user!.id,
        metadata: context
      });

      // Get AI response
      const response = await geminiCLIService.sendMessage(message, context);

      // Save AI response
      await storage.createChatMessage({
        content: response.message,
        sender: 'ai',
        userId: req.user!.id,
        metadata: response.metadata
      });

      res.json(response);
    } catch (error) {
      console.error('Gemini chat error:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to get AI response' });
    }
  });

  app.post('/api/gemini/analyze-code', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, language, context } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ message: 'Code and language are required' });
      }

      const response = await geminiCLIService.analyzeCode(code, language, context);
      
      // Save analysis result
      await storage.createChatMessage({
        content: `Code Analysis: ${language} code analyzed`,
        sender: 'ai',
        userId: req.user!.id,
        metadata: { type: 'code_analysis', language, ...response.metadata }
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to analyze code' });
    }
  });

  app.post('/api/gemini/generate-code', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { description, language, context } = req.body;
      
      if (!description) {
        return res.status(400).json({ message: 'Description is required' });
      }

      const response = await geminiCLIService.generateCode(description, language, context);
      
      // Save generation result
      await storage.createChatMessage({
        content: `Code Generated: ${description}`,
        sender: 'ai',
        userId: req.user!.id,
        metadata: { type: 'code_generation', language, description, ...response.metadata }
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to generate code' });
    }
  });

  // Advanced AI Features
  app.post('/api/gemini/suggest-improvements', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, language, context } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ message: 'Code and language are required' });
      }

      const response = await geminiCLIService.suggestCodeImprovements(code, language, context);
      
      await storage.createChatMessage({
        content: `Code Suggestions: ${language} improvements suggested`,
        sender: 'ai',
        userId: req.user!.id,
        metadata: { type: 'code_suggestions', language, ...response.metadata }
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to suggest improvements' });
    }
  });

  app.post('/api/gemini/explain-code', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, language, complexity = 'intermediate' } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ message: 'Code and language are required' });
      }

      const response = await geminiCLIService.explainCode(code, language, complexity);
      
      await storage.createChatMessage({
        content: `Code Explanation: ${language} code explained (${complexity} level)`,
        sender: 'ai',
        userId: req.user!.id,
        metadata: { type: 'code_explanation', language, complexity, ...response.metadata }
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to explain code' });
    }
  });

  app.post('/api/gemini/generate-tests', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, language, testFramework } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ message: 'Code and language are required' });
      }

      const response = await geminiCLIService.generateTests(code, language, testFramework);
      
      await storage.createChatMessage({
        content: `Tests Generated: ${language} unit tests created`,
        sender: 'ai',
        userId: req.user!.id,
        metadata: { type: 'test_generation', language, testFramework, ...response.metadata }
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to generate tests' });
    }
  });

  app.post('/api/gemini/optimize-code', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, language, optimizationType = 'all' } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ message: 'Code and language are required' });
      }

      const response = await geminiCLIService.optimizeCode(code, language, optimizationType);
      
      await storage.createChatMessage({
        content: `Code Optimized: ${language} code optimized for ${optimizationType}`,
        sender: 'ai',
        userId: req.user!.id,
        metadata: { type: 'code_optimization', language, optimizationType, ...response.metadata }
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to optimize code' });
    }
  });

  app.post('/api/gemini/generate-docs', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, language, docType = 'api' } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ message: 'Code and language are required' });
      }

      const response = await geminiCLIService.generateDocumentation(code, language, docType);
      
      await storage.createChatMessage({
        content: `Documentation Generated: ${docType} docs for ${language} code`,
        sender: 'ai',
        userId: req.user!.id,
        metadata: { type: 'documentation_generation', language, docType, ...response.metadata }
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to generate documentation' });
    }
  });

  app.post('/api/gemini/convert-code', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, fromLanguage, toLanguage, context } = req.body;
      
      if (!code || !fromLanguage || !toLanguage) {
        return res.status(400).json({ message: 'Code, fromLanguage, and toLanguage are required' });
      }

      const response = await geminiCLIService.convertCode(code, fromLanguage, toLanguage, context);
      
      await storage.createChatMessage({
        content: `Code Converted: ${fromLanguage} to ${toLanguage}`,
        sender: 'ai',
        userId: req.user!.id,
        metadata: { type: 'code_conversion', fromLanguage, toLanguage, ...response.metadata }
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to convert code' });
    }
  });

  // Conversation History Management
  app.get('/api/gemini/history', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { type, limit = 50 } = req.query;
      
      let messages = await storage.getChatMessages(req.user!.id, parseInt(limit as string));
      
      // Filter by AI interaction type if specified
      if (type) {
        messages = messages.filter(msg => 
          msg.sender === 'ai' && 
          msg.metadata && 
          msg.metadata.type === type
        );
      }
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch AI history' });
    }
  });

  app.delete('/api/gemini/history', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Clear conversation history (only AI messages)
      const messages = await storage.getChatMessages(req.user!.id, 1000);
      
      for (const message of messages) {
        if (message.sender === 'ai') {
          await storage.deleteChatMessage(message.id);
        }
      }
      
      res.json({ message: 'AI conversation history cleared' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to clear AI history' });
    }
  });

  // Message queue to prevent concurrent requests per user
  const messageQueues = new Map<number, Array<{ content: string, metadata: any, socket: any }>>();
  const processingUsers = new Set<number>();

  const processMessageQueue = async (userId: number) => {
    if (processingUsers.has(userId)) {
      return; // Already processing for this user
    }

    const queue = messageQueues.get(userId) || [];
    if (queue.length === 0) {
      return;
    }

    processingUsers.add(userId);
    
    try {
      const { content, metadata, socket } = queue.shift()!;
      
      console.log(`Processing message for user ${userId}: ${content.substring(0, 50)}...`);
      
      // First, save the user message
      await storage.createChatMessage({
        content: content,
        sender: 'user',
        userId: userId,
        metadata: metadata
      });
      
      // Get AI response from Gemini CLI
      const response = await geminiCLIService.sendMessage(content, metadata);
      console.log('Received from Gemini CLI:', response.message.substring(0, 50) + '...');
      
      // Save AI response
      await storage.createChatMessage({
        content: response.message,
        sender: 'ai',
        userId: userId,
        metadata: response.metadata
      });

      // Send AI response back to client
      socket.emit('ai_response', {
        content: response.message,
        metadata: response.metadata
      });
      
      console.log('ai_response emitted successfully');
    } catch (error) {
      console.error('AI response error:', error);
      const queue = messageQueues.get(userId) || [];
      if (queue.length > 0) {
        const { socket } = queue[0];
        socket.emit('error', { error: 'Failed to get AI response: ' + (error as Error).message });
      }
    } finally {
      processingUsers.delete(userId);
      
      // Process next message in queue if any
      const remainingQueue = messageQueues.get(userId) || [];
      if (remainingQueue.length > 0) {
        setImmediate(() => processMessageQueue(userId));
      }
    }
  };

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('Socket.IO client connected:', socket.id);
    
    // Set default user data for development
    socket.data.userId = 5;
    socket.data.username = 'John Doe';
    
    // Send welcome message
    socket.emit('connected', { 
      message: 'Socket.IO connection established',
      userId: socket.data.userId,
      username: socket.data.username
    });

    socket.on('chat_message', async (data) => {
      try {
        console.log('Received chat message from user:', socket.data.username);
        const { content, metadata } = data;
        
        if (!content) {
          socket.emit('error', { error: 'Message content is required' });
          return;
        }

        const userId = socket.data.userId;
        
        // Add message to queue
        if (!messageQueues.has(userId)) {
          messageQueues.set(userId, []);
        }
        
        const queue = messageQueues.get(userId)!;
        queue.push({ content, metadata, socket });
        
        console.log(`Added message to queue for user ${userId}. Queue length: ${queue.length}`);
        
        // Process queue if not already processing
        processMessageQueue(userId);
        
      } catch (error) {
        console.error('Socket message error:', error);
        socket.emit('error', { error: 'Message processing failed: ' + (error as Error).message });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket.IO client disconnected: ${socket.data.username} (${socket.id}) - ${reason}`);
      
      // Clean up queue for disconnected user
      const userId = socket.data.userId;
      if (messageQueues.has(userId)) {
        const queue = messageQueues.get(userId)!;
        const filteredQueue = queue.filter(item => item.socket.id !== socket.id);
        if (filteredQueue.length === 0) {
          messageQueues.delete(userId);
        } else {
          messageQueues.set(userId, filteredQueue);
        }
      }
    });
  });

  return httpServer;
}
