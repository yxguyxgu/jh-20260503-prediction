import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const clientDir = path.join(root, "client");

execSync("npx prisma generate --schema=server/prisma/schema.prisma", { stdio: "inherit", cwd: root });

if (process.env.DATABASE_URL) {
  execSync("npx prisma migrate deploy --schema=server/prisma/schema.prisma", { stdio: "inherit", cwd: root });
} else {
  console.warn(
    "[vercel-build] DATABASE_URL is not set; skipping prisma migrate deploy. Add DATABASE_URL to Vercel env and redeploy to apply migrations.",
  );
}

// Install inside client/ so Rollup/Vite optional native deps match the build OS (fixes workspace hoisting on Vercel).
execSync("npm install", { stdio: "inherit", cwd: clientDir, env: process.env });
execSync("npm run build", { stdio: "inherit", cwd: clientDir, env: process.env });
