import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const password = process.env.ADMIN_PASSWORD ?? "adminpass123";
  const password_hash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      is_admin: true,
      password_hash,
    },
    create: {
      username: "admin",
      password_hash,
      balance: 1_000_000,
      is_admin: true,
    },
  });

  console.log('Seeded admin user: username "admin"');
  console.log("Password from ADMIN_PASSWORD env or default: adminpass123");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
