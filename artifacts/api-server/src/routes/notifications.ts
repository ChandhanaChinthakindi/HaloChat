import { Router } from "express";
import { Expo } from "expo-server-sdk";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

// POST /notifications/token — register or update the user's Expo push token
router.post("/notifications/token", requireAuth, async (req, res) => {
  const { token } = req.body as { token?: string };

  if (!token) {
    res.status(400).json({ error: "token is required" });
    return;
  }

  if (!Expo.isExpoPushToken(token)) {
    res.status(400).json({ error: "Invalid Expo push token" });
    return;
  }

  try {
    await db
      .update(usersTable)
      .set({ pushToken: token })
      .where(eq(usersTable.id, req.userId!));

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to save push token");
    res.status(500).json({ error: "Failed to save token" });
  }
});

// DELETE /notifications/token — unregister (user turns off notifications)
router.delete("/notifications/token", requireAuth, async (req, res) => {
  try {
    await db
      .update(usersTable)
      .set({ pushToken: null })
      .where(eq(usersTable.id, req.userId!));

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to remove push token");
    res.status(500).json({ error: "Failed to remove token" });
  }
});

export default router;
