import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { id: "seed-admin" },
    update: {},
    create: {
      id: "seed-admin",
      name: "Admin",
      role: "ADMIN",
      pin_code: "1234",
      is_active: true,
    },
  });
  await prisma.user.upsert({
    where: { id: "seed-employee" },
    update: {},
    create: {
      id: "seed-employee",
      name: "Jane Employee",
      role: "EMPLOYEE",
      pin_code: "5678",
      is_active: true,
    },
  });
  console.log("Seeded users: Admin (PIN 1234), Jane Employee (PIN 5678)");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
