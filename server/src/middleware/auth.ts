import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth.js";
import type { JwtPayload } from "../lib/auth.js";

export type AuthedRequest = Request & { user?: JwtPayload };

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "Missing or invalid authorization" });
    return;
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
