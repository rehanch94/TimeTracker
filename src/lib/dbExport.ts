import type { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const EXPORTS_DIR = "exports";
const SQL_FILENAME = "timetracking.sql";

function sqlValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "boolean") return v ? "1" : "0";
  if (v instanceof Date) return `'${v.toISOString().replaceAll("'", "''")}'`;
  const s = String(v);
  return `'${s.replaceAll("'", "''")}'`;
}

/** True when using Postgres (e.g. Supabase); SQL file export is skipped. */
export function isPostgres(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/**
 * Writes full database dump to exports/timetracking.sql (SQLite only).
 * No-op when using Postgres/Supabase. Safe to call from clock actions (no admin check).
 */
export async function saveDatabaseToSql(prisma: PrismaClient): Promise<void> {
  if (isPostgres()) return;

  const tables = (
    await prisma.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
    )
  )
    .map((t) => t.name)
    .filter((n) => n !== "_prisma_migrations");

  const schemaRows = await prisma.$queryRawUnsafe<{ name: string; sql: string | null }[]>(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL ORDER BY name;"
  );

  let out = "";
  out += "-- TimeTracking (SQLite)\n";
  out += `-- Updated at (UTC): ${new Date().toISOString()}\n\n`;
  out += "PRAGMA foreign_keys=OFF;\n";
  out += "BEGIN TRANSACTION;\n\n";

  for (const row of schemaRows) {
    if (row.name === "_prisma_migrations") continue;
    out += `${row.sql};\n\n`;
  }

  for (const table of tables) {
    const cols = await prisma.$queryRawUnsafe<{ name: string }[]>(
      `PRAGMA table_info(${table});`
    );
    const colNames = cols.map((c) => c.name);
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM ${table};`
    );

    for (const r of rows) {
      const values = colNames.map((c) => sqlValue(r[c]));
      out += `INSERT INTO "${table}" (${colNames.map((c) => `"${c}"`).join(", ")}) VALUES (${values.join(", ")});\n`;
    }
    if (rows.length) out += "\n";
  }

  out += "COMMIT;\n";
  out += "PRAGMA foreign_keys=ON;\n";

  const exportsDir = path.join(process.cwd(), EXPORTS_DIR);
  await mkdir(exportsDir, { recursive: true });
  const fullPath = path.join(exportsDir, SQL_FILENAME);
  await writeFile(fullPath, out, "utf8");
}

export const SQL_EXPORT_RELATIVE = `${EXPORTS_DIR}/${SQL_FILENAME}`;
