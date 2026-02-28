import { prisma } from "@/lib/prisma";
import ClockClient from "./ClockClient";

export default async function Home() {
  const [users, activeEntries] = await Promise.all([
    prisma.user.findMany({
      where: { role: "EMPLOYEE", is_active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, pin_code: true },
    }),
    prisma.timeEntry.findMany({
      where: { clock_out_time: null },
      orderBy: { clock_in_time: "asc" },
      select: {
        clock_in_time: true,
        user: { select: { id: true, name: true, pin_code: true } },
      },
    }),
  ]);

  const employees = users.map(({ id, name, pin_code }) => ({
    id,
    name,
    pinLength: pin_code.length,
  }));

  const activeNow = activeEntries.map((e) => ({
    userId: e.user.id,
    userName: e.user.name,
    clockedInAt: e.clock_in_time.toISOString(),
    pinLength: e.user.pin_code.length,
  }));

  return <ClockClient employees={employees} activeNow={activeNow} />;
}

