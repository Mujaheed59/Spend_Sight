import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";

const app = express();

// ✅ Middleware for JSON + URL parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ Enable CORS so frontend (5001) can access backend (5000)
app.use(
  cors({
    origin: "http://localhost:5001", // frontend dev port
    credentials: true,               // allow cookies/session
  })
);

// ✅ Mount authentication routes
setupAuth(app);

// ✅ Request logging middleware
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
  // ✅ Register all other API routes
  const server = await registerRoutes(app);

  // ✅ Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    log(`❌ Error: ${status} - ${message}`);
  });

  // ✅ Vite in dev, static files in prod
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ✅ Always listen on PORT (default 5000)
  const port = parseInt(process.env.PORT || "5000", 10);
  const listener = server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`🚀 Backend server running on http://localhost:${port}`);
    }
  );

  listener.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `❌ Port ${port} is already in use. Please stop the other process or use a different port.`
      );
      process.exit(1);
    } else {
      throw err;
    }
  });
})();
