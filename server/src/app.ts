import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import marketsRoutes from "./routes/markets.js";
import adminRoutes from "./routes/admin.js";
import { authMiddleware } from "./middleware/auth.js";
import { adminMiddleware } from "./middleware/admin.js";

function resolvePublicDir(): string {
  const here = path.join(process.cwd(), "public", "index.html");
  if (fs.existsSync(here)) return path.join(process.cwd(), "public");
  const parent = path.join(process.cwd(), "..", "public", "index.html");
  if (fs.existsSync(parent)) return path.join(process.cwd(), "..", "public");
  return path.join(process.cwd(), "public");
}

export function createApp(): express.Express {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api", authRoutes);
  app.use("/api", usersRoutes);
  app.use("/api/markets", marketsRoutes);
  app.use("/api/admin", authMiddleware, adminMiddleware, adminRoutes);

  const publicDir = resolvePublicDir();
  app.get("*", (req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/api")) return next();
    if (req.path.startsWith("/assets")) return next();
    if (!req.accepts("html")) return next();
    const indexFile = path.join(publicDir, "index.html");
    if (!fs.existsSync(indexFile)) {
      res.status(503).type("text/plain").send("Frontend not built (missing public/index.html).");
      return;
    }
    res.type("html").send(fs.readFileSync(indexFile, "utf8"));
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "not found" });
  });

  return app;
}
