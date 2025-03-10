import { config } from 'dotenv';
// Load env variables first
config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { connectDB, syncIndexes } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Check required environment variables
    if (!process.env.SESSION_SECRET) {
      throw new Error('SESSION_SECRET environment variable is required');
    }

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    log('Starting server...');
    log(`Using MongoDB URI: ${process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@')}`);

    // Connect to MongoDB first
    log('Connecting to MongoDB...');
    await connectDB();
    log('MongoDB connected successfully');

    // Then set up routes and server
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Add detailed error logging for development
      console.error('Server error:', {
        status,
        message,
        stack: err.stack,
        details: err.details || err
      });

      res.status(status).json({ message, ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}) });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, async () => {
      log(`Server is running on port ${port}`);

      // Sync indexes after server has started
      await syncIndexes().catch(error => {
        log('Warning: Index synchronization failed:', error);
      });
    });
  } catch (error) {
    console.error('Failed to start the server:', error);
    process.exit(1);
  }
})();