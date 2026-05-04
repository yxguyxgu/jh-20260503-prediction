import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import marketsRoutes from "./routes/markets.js";
import adminRoutes from "./routes/admin.js";
import { authMiddleware } from "./middleware/auth.js";
import { adminMiddleware } from "./middleware/admin.js";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/", authRoutes);
app.use("/", usersRoutes);
app.use("/markets", marketsRoutes);
app.use("/admin", authMiddleware, adminMiddleware, adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "not found" });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
