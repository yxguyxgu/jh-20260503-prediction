import { Router } from "express";
import type { Bet } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";

const router = Router();

function extraSharesPerBet(winBets: Bet[], loseTotal: number): Map<string, number> {
  const out = new Map<string, number>();
  const winTotal = winBets.reduce((s, b) => s + b.amount, 0);
  if (winTotal === 0 || loseTotal === 0) return out;

  let allocated = 0;
  for (const b of winBets) {
    const add = Math.floor((b.amount * loseTotal) / winTotal);
    out.set(b.id, add);
    allocated += add;
  }
  let rem = loseTotal - allocated;
  const sorted = [...winBets].sort((a, b) => a.id.localeCompare(b.id));
  let i = 0;
  while (rem > 0 && sorted.length > 0) {
    const b = sorted[i % sorted.length];
    out.set(b.id, (out.get(b.id) ?? 0) + 1);
    rem--;
    i++;
  }
  return out;
}

router.get("/users", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        username: true,
        balance: true,
        is_admin: true,
        created_at: true,
      },
    });
    res.json({ users });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed to list users" });
  }
});

router.post("/users/:id/adjust-balance", async (req, res) => {
  try {
    const { delta } = req.body as { delta?: number };
    if (delta == null || !Number.isInteger(delta)) {
      res.status(400).json({ error: "integer delta required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      res.status(404).json({ error: "user not found" });
      return;
    }

    const nextBal = user.balance + delta;
    if (nextBal < 0) {
      res.status(400).json({ error: "resulting balance cannot be negative" });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { balance: nextBal },
    });
    res.json({ user: { id: updated.id, username: updated.username, balance: updated.balance } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "adjust failed" });
  }
});

router.delete("/users/:id", async (req: AuthedRequest, res) => {
  try {
    if (req.user!.sub === req.params.id) {
      res.status(400).json({ error: "cannot delete your own account" });
      return;
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e: unknown) {
    if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "P2025") {
      res.status(404).json({ error: "user not found" });
      return;
    }
    console.error(e);
    res.status(500).json({ error: "delete failed" });
  }
});

router.get("/markets", async (_req, res) => {
  try {
    const markets = await prisma.market.findMany({
      orderBy: { created_at: "desc" },
      include: {
        creator: { select: { id: true, username: true } },
        options: true,
      },
    });
    res.json({ markets });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed to list markets" });
  }
});

router.post("/markets/:id/resolve", async (req, res) => {
  try {
    const { resolutions } = req.body as {
      resolutions?: { option_id: string; outcome: string }[];
    };
    if (!Array.isArray(resolutions) || resolutions.length === 0) {
      res.status(400).json({ error: "resolutions array required" });
      return;
    }

    const marketId = req.params.id;

    await prisma.$transaction(async (tx) => {
      const market = await tx.market.findUnique({
        where: { id: marketId },
        include: { options: true },
      });
      if (!market) {
        const err = new Error("NOT_FOUND");
        (err as { code?: string }).code = "NOT_FOUND";
        throw err;
      }

      let closed = false;

      for (const r of resolutions) {
        if (!r.option_id || !r.outcome) {
          const err = new Error("BAD_BODY");
          (err as { code?: string }).code = "BAD";
          throw err;
        }
        const outcome = r.outcome.toUpperCase();
        if (outcome !== "YES" && outcome !== "NO") {
          const err = new Error("BAD_OUTCOME");
          (err as { code?: string }).code = "BAD";
          throw err;
        }

        const option = market.options.find((o) => o.id === r.option_id);
        if (!option || option.market_id !== market.id) {
          const err = new Error("BAD_OPTION");
          (err as { code?: string }).code = "BAD";
          throw err;
        }

        const fresh = await tx.marketOption.findUnique({ where: { id: option.id } });
        if (!fresh?.resolved_value) {
          const bets = await tx.bet.findMany({ where: { market_option_id: option.id } });
          const yesBets = bets.filter((b) => b.bet_on === "YES");
          const noBets = bets.filter((b) => b.bet_on === "NO");
          const yesTotal = yesBets.reduce((s, b) => s + b.amount, 0);
          const noTotal = noBets.reduce((s, b) => s + b.amount, 0);

          const winBets = outcome === "YES" ? yesBets : noBets;
          const loseTotal = outcome === "YES" ? noTotal : yesTotal;
          const winTotal = winBets.reduce((s, b) => s + b.amount, 0);

          const credit = new Map<string, number>();

          if (winTotal === 0) {
            for (const b of bets) {
              credit.set(b.user_id, (credit.get(b.user_id) ?? 0) + b.amount);
            }
          } else {
            const extraByBet = extraSharesPerBet(winBets, loseTotal);
            for (const b of winBets) {
              const pay = b.amount + (extraByBet.get(b.id) ?? 0);
              credit.set(b.user_id, (credit.get(b.user_id) ?? 0) + pay);
            }
          }

          for (const [userId, amount] of credit) {
            if (amount > 0) {
              await tx.user.update({
                where: { id: userId },
                data: { balance: { increment: amount } },
              });
            }
          }

          await tx.marketOption.update({
            where: { id: option.id },
            data: { resolved_value: outcome },
          });
          closed = true;
        }
      }

      if (closed) {
        await tx.market.update({
          where: { id: marketId },
          data: { is_open: false },
        });
      }

      const opts = await tx.marketOption.findMany({ where: { market_id: marketId } });
      const allResolved = opts.length > 0 && opts.every((o) => o.resolved_value != null);
      if (allResolved) {
        await tx.market.update({
          where: { id: marketId },
          data: { is_resolved: true },
        });
      }
    });

    const market = await prisma.market.findUnique({
      where: { id: marketId },
      include: { options: true },
    });
    res.json({ market });
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? (e as { code: string }).code : "";
    if (code === "NOT_FOUND") {
      res.status(404).json({ error: "market not found" });
      return;
    }
    if (code === "BAD") {
      res.status(400).json({ error: "invalid resolutions payload" });
      return;
    }
    console.error(e);
    res.status(500).json({ error: "resolve failed" });
  }
});

export default router;
