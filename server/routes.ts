import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { authService } from "./services/auth";
import { fileService } from "./services/files";
import { geminiService } from "./services/gemini";
import { insertChatMessageSchema, insertFileSchema, type User } from "@shared/schema";
import { z } from "zod";

interface AuthenticatedRequest extends Request {
  user?: User;
}

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  username?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server on /ws path
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Middleware to extract user from session
  const authenticateUser = async (req: AuthenticatedRequest, res: any, next: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.headers.cookie?.split('session_token=')[1]?.split(';')[0];
    
    if (token) {
      const user = await authService.validateSession(token);
      if (user) {
        req.user = user;
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
      const token = req.headers.authorization?.replace('Bearer ', '') || req.headers.cookie?.split('session_token=')[1]?.split(';')[0];
      
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

      const response = await geminiService.sendMessage(message, context);

      // Save both user message and AI response
      await storage.createChatMessage({
        content: message,
        sender: 'user',
        userId: req.user.id,
        metadata: context
      });

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

  // WebSocket handling
  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    console.log('WebSocket client connected');

    // Handle authentication via query params or headers
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (token) {
      authService.validateSession(token).then(user => {
        if (user) {
          ws.userId = user.id;
          ws.username = user.username;
          console.log(`WebSocket authenticated for user: ${user.username}`);
        }
      });
    }

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (!ws.userId) {
          ws.send(JSON.stringify({ error: 'Not authenticated' }));
          return;
        }

        switch (message.type) {
          case 'chat_message':
            // Handle real-time chat
            const response = await geminiService.sendMessage(message.content, message.context);
            
            // Save messages to storage
            await storage.createChatMessage({
              content: message.content,
              sender: 'user',
              userId: ws.userId,
              metadata: message.context
            });

            await storage.createChatMessage({
              content: response.message,
              sender: 'ai',
              userId: ws.userId,
              metadata: response.metadata
            });

            // Send response back to client
            ws.send(JSON.stringify({
              type: 'ai_response',
              content: response.message,
              metadata: response.metadata
            }));
            break;

          case 'typing':
            // Broadcast typing indicator to other clients (if needed)
            ws.send(JSON.stringify({ type: 'typing_ack' }));
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;

          default:
            ws.send(JSON.stringify({ error: 'Unknown message type' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ error: 'Message processing failed' }));
      }
    });

    ws.on('close', () => {
      console.log(`WebSocket client disconnected: ${ws.username || 'unknown'}`);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connection established' }));
  });

  return httpServer;
}
