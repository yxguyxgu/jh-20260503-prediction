import type { Response, NextFunction } from "express";
import type { AuthedRequest } from "./auth.js";

export function adminMiddleware(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user?.is_admin) {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  next();
}
