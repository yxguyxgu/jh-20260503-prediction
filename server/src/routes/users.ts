import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

router.get("/me", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { id: true, username: true, balance: true, is_admin: true },
    });
    if (!user) {
      res.status(401).json({ error: "user not found" });
      return;
    }
    res.json({ user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed to load profile" });
  }
});

router.get("/leaderboard", async (_req, res) => {
  try {
    const rows = await prisma.user.findMany({
      orderBy: { balance: "desc" },
      take: 100,
      select: {
        id: true,
        username: true,
        balance: true,
      },
    });
    res.json({ leaderboard: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed to load leaderboard" });
  }
});

export default router;
