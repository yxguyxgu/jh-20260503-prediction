import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

function impliedYesProbability(yesTotal: number, noTotal: number): number {
  const t = yesTotal + noTotal;
  if (t === 0) return 0.5;
  return yesTotal / t;
}

router.get("/", async (_req, res) => {
  try {
    const markets = await prisma.market.findMany({
      orderBy: { created_at: "desc" },
      include: {
        creator: { select: { id: true, username: true } },
        options: {
          include: {
            bets: { select: { amount: true, bet_on: true } },
          },
        },
      },
    });

    const payload = markets.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      creator: m.creator,
      is_open: m.is_open,
      is_resolved: m.is_resolved,
      created_at: m.created_at,
      options: m.options.map((o) => {
        const yesTotal = o.bets.filter((b) => b.bet_on === "YES").reduce((s, b) => s + b.amount, 0);
        const noTotal = o.bets.filter((b) => b.bet_on === "NO").reduce((s, b) => s + b.amount, 0);
        return {
          id: o.id,
          question_text: o.question_text,
          resolved_value: o.resolved_value,
          yes_stake_total: yesTotal,
          no_stake_total: noTotal,
          implied_yes_probability: impliedYesProbability(yesTotal, noTotal),
        };
      }),
    }));

    res.json({ markets: payload });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed to list markets" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const market = await prisma.market.findUnique({
      where: { id: req.params.id },
      include: {
        creator: { select: { id: true, username: true } },
        options: {
          include: {
            bets: {
              include: { user: { select: { id: true, username: true } } },
              orderBy: { created_at: "desc" },
            },
          },
        },
        comments: {
          orderBy: { created_at: "desc" },
          include: { user: { select: { id: true, username: true } } },
        },
      },
    });

    if (!market) {
      res.status(404).json({ error: "market not found" });
      return;
    }

    const options = market.options.map((o) => {
      const yesTotal = o.bets.filter((b) => b.bet_on === "YES").reduce((s, b) => s + b.amount, 0);
      const noTotal = o.bets.filter((b) => b.bet_on === "NO").reduce((s, b) => s + b.amount, 0);
      return {
        id: o.id,
        question_text: o.question_text,
        resolved_value: o.resolved_value,
        yes_stake_total: yesTotal,
        no_stake_total: noTotal,
        implied_yes_probability: impliedYesProbability(yesTotal, noTotal),
        bets: o.bets.map((b) => ({
          id: b.id,
          amount: b.amount,
          bet_on: b.bet_on,
          created_at: b.created_at,
          user: b.user,
        })),
      };
    });

    res.json({
      market: {
        id: market.id,
        title: market.title,
        description: market.description,
        creator: market.creator,
        is_open: market.is_open,
        is_resolved: market.is_resolved,
        created_at: market.created_at,
        options,
        comments: market.comments.map((c) => ({
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          user: c.user,
        })),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed to load market" });
  }
});

router.post("/", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { title, description, options } = req.body as {
      title?: string;
      description?: string;
      options?: string[];
    };
    if (!title?.trim() || !description?.trim()) {
      res.status(400).json({ error: "title and description required" });
      return;
    }
    if (!Array.isArray(options) || options.length < 1) {
      res.status(400).json({ error: "at least one option question required" });
      return;
    }
    const cleaned = options.map((q) => String(q).trim()).filter(Boolean);
    if (cleaned.length < 1) {
      res.status(400).json({ error: "invalid options" });
      return;
    }

    const market = await prisma.market.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        creator_id: req.user!.sub,
        options: {
          create: cleaned.map((question_text) => ({ question_text })),
        },
      },
      include: {
        options: true,
        creator: { select: { id: true, username: true } },
      },
    });

    res.status(201).json({ market });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed to create market" });
  }
});

router.post("/:id/bet", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { option_id, amount, side } = req.body as {
      option_id?: string;
      amount?: number;
      side?: string;
    };
    if (!option_id || amount == null || !side) {
      res.status(400).json({ error: "option_id, amount, and side required" });
      return;
    }
    const betOn = side.toUpperCase();
    if (betOn !== "YES" && betOn !== "NO") {
      res.status(400).json({ error: "side must be YES or NO" });
      return;
    }
    if (!Number.isInteger(amount) || amount < 1) {
      res.status(400).json({ error: "amount must be a positive integer (SC)" });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const market = await tx.market.findUnique({
        where: { id: req.params.id },
        include: { options: true },
      });
      if (!market) return { error: "market not found" as const };
      if (!market.is_open || market.is_resolved) {
        return { error: "market is not accepting bets" as const };
      }

      const option = market.options.find((o) => o.id === option_id);
      if (!option) return { error: "option not found on this market" as const };
      if (option.resolved_value) return { error: "this option is already resolved" as const };

      const user = await tx.user.findUnique({ where: { id: req.user!.sub } });
      if (!user) return { error: "user not found" as const };
      if (user.balance < amount) return { error: "insufficient balance" as const };

      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: amount } },
      });

      const bet = await tx.bet.create({
        data: {
          user_id: user.id,
          market_option_id: option.id,
          amount,
          bet_on: betOn,
        },
      });

      const updated = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      return { bet, balance: updated.balance };
    });

    if ("error" in result) {
      const code = result.error === "market not found" ? 404 : 400;
      res.status(code).json({ error: result.error });
      return;
    }

    res.status(201).json({ bet: result.bet, balance: result.balance });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "bet failed" });
  }
});

router.post("/:id/comment", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { content } = req.body as { content?: string };
    if (!content?.trim()) {
      res.status(400).json({ error: "content required" });
      return;
    }
    const text = content.trim();
    if (text.length > 2000) {
      res.status(400).json({ error: "content too long" });
      return;
    }

    const market = await prisma.market.findUnique({ where: { id: req.params.id } });
    if (!market) {
      res.status(404).json({ error: "market not found" });
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        user_id: req.user!.sub,
        market_id: market.id,
        content: text,
      },
      include: { user: { select: { id: true, username: true } } },
    });

    res.status(201).json({ comment });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed to post comment" });
  }
});

export default router;
