import type { Request, Response, NextFunction } from "express";
import { sql, eq, and } from "drizzle-orm";
import { db, dailyUsageTable } from "@workspace/db";

const DAILY_LIMIT = parseInt(process.env["DAILY_COMPANION_LIMIT"] ?? "200", 10);

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function dailyLimit(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return next();

  // companionId comes from POST body or GET query string
  const companionId: string | undefined =
    req.body?.companionId ?? (req.query.companionId as string | undefined);

  if (!companionId) return next(); // no companion context — skip tracking

  const date = todayUTC();

  try {
    const [row] = await db
      .select({ requests: dailyUsageTable.requests })
      .from(dailyUsageTable)
      .where(
        and(
          eq(dailyUsageTable.userId, userId),
          eq(dailyUsageTable.companionId, companionId),
          eq(dailyUsageTable.date, date)
        )
      );

    const current = row?.requests ?? 0;

    if (current >= DAILY_LIMIT) {
      res.setHeader("X-Daily-Requests-Limit", DAILY_LIMIT);
      res.setHeader("X-Daily-Requests-Remaining", 0);
      res.status(429).json({ error: "DAILY_LIMIT_REACHED" });
      return;
    }

    // Atomic upsert increment
    await db
      .insert(dailyUsageTable)
      .values({ userId, companionId, date, requests: 1 })
      .onConflictDoUpdate({
        target: [dailyUsageTable.userId, dailyUsageTable.companionId, dailyUsageTable.date],
        set: { requests: sql`${dailyUsageTable.requests} + 1` },
      });

    res.setHeader("X-Daily-Requests-Limit", DAILY_LIMIT);
    res.setHeader("X-Daily-Requests-Remaining", Math.max(0, DAILY_LIMIT - current - 1));
    next();
  } catch {
    next(); // fail open — never block on DB errors
  }
}
