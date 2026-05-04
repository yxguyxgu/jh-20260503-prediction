import { execSync } from "node:child_process";

execSync("npx prisma generate --schema=server/prisma/schema.prisma", { stdio: "inherit" });

if (process.env.DATABASE_URL) {
  execSync("npx prisma migrate deploy --schema=server/prisma/schema.prisma", { stdio: "inherit" });
} else {
  console.warn(
    "[vercel-build] DATABASE_URL is not set; skipping prisma migrate deploy. Add DATABASE_URL to Vercel env and redeploy to apply migrations.",
  );
}

execSync("npm run build --workspace=prediction-market-client", { stdio: "inherit" });
