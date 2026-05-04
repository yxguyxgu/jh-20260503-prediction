import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword, signToken } from "../lib/auth.js";

const router = Router();

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function applyDailyBonus(userId: string): Promise<{ granted: boolean; balance: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { granted: false, balance: 0 };

  const today = utcDateString(new Date());
  const last = user.last_daily_bonus ? utcDateString(user.last_daily_bonus) : null;

  if (last === today) {
    return { granted: false, balance: user.balance };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      balance: { increment: 100 },
      last_daily_bonus: new Date(),
    },
  });
  return { granted: true, balance: updated.balance };
}

router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ error: "username and password required" });
      return;
    }
    const u = username.trim();
    if (u.length < 3 || u.length > 32) {
      res.status(400).json({ error: "username must be 3–32 characters" });
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(u)) {
      res.status(400).json({ error: "username may only contain letters, numbers, and underscores" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "password must be at least 6 characters" });
      return;
    }

    const password_hash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username: u,
        password_hash,
        balance: 1000,
      },
    });

    const token = signToken({
      sub: user.id,
      username: user.username,
      is_admin: user.is_admin,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance,
        is_admin: user.is_admin,
      },
    });
  } catch (e: unknown) {
    if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "P2002") {
      res.status(409).json({ error: "username already taken" });
      return;
    }
    console.error(e);
    res.status(500).json({ error: "signup failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ error: "username and password required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      res.status(401).json({ error: "invalid credentials" });
      return;
    }

    const bonus = await applyDailyBonus(user.id);
    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    const token = signToken({
      sub: fresh.id,
      username: fresh.username,
      is_admin: fresh.is_admin,
    });

    res.json({
      token,
      daily_bonus_granted: bonus.granted,
      user: {
        id: fresh.id,
        username: fresh.username,
        balance: fresh.balance,
        is_admin: fresh.is_admin,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "login failed" });
  }
});

export default router;
