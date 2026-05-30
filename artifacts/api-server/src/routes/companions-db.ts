import { Router } from "express";
import { eq, desc, and, inArray, lt, asc } from "drizzle-orm";
import { db, companionsTable, messagesTable, memoryNotesTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /companions
router.get("/companions", requireAuth, async (req, res) => {
  try {
    const companions = await db
      .select()
      .from(companionsTable)
      .where(eq(companionsTable.userId, req.userId!))
      .orderBy(desc(companionsTable.lastMessageAt), desc(companionsTable.createdAt));
    res.json(companions);
  } catch (err) {
    logger.error({ err }, "Database error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /companions
router.post("/companions", requireAuth, async (req, res) => {
  const { name, personality, customPersonality, avatarColor, gender } = req.body;
  if (!name || !personality) {
    res.status(400).json({ error: "name and personality are required" });
    return;
  }
  try {
    const [companion] = await db
      .insert(companionsTable)
      .values({ userId: req.userId!, name, personality, customPersonality, gender: gender || null, avatarColor: avatarColor || "purple" })
      .returning();
    res.json(companion);
  } catch (err) {
    logger.error({ err }, "Database error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /companions/:id
router.patch("/companions/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { relationshipLevel, messageCount, lastMessage, lastMessageAt, name, customPersonality, avatarColor } = req.body;
  try {
    const updates: Partial<typeof companionsTable.$inferInsert> = {};
    if (relationshipLevel !== undefined) updates.relationshipLevel = relationshipLevel;
    if (messageCount !== undefined) updates.messageCount = messageCount;
    if (lastMessage !== undefined) updates.lastMessage = lastMessage;
    if (lastMessageAt !== undefined) updates.lastMessageAt = new Date(lastMessageAt);
    if (name !== undefined) updates.name = name;
    if (customPersonality !== undefined) updates.customPersonality = customPersonality;
    if (avatarColor !== undefined) updates.avatarColor = avatarColor;

    const [updated] = await db
      .update(companionsTable)
      .set(updates)
      .where(and(eq(companionsTable.id, id), eq(companionsTable.userId, req.userId!)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Companion not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Database error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /companions/:id
router.delete("/companions/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await db
      .delete(companionsTable)
      .where(and(eq(companionsTable.id, id), eq(companionsTable.userId, req.userId!)));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Database error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /companions/:id/messages?limit=100&before=<createdAt ISO>
// Returns messages in ascending order. Use `before` to page backwards (load older messages).
router.get("/companions/:id/messages", requireAuth, async (req, res) => {
  const { id } = req.params;
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const before = req.query.before as string | undefined; // ISO timestamp cursor
  try {
    const [companion] = await db
      .select({ id: companionsTable.id })
      .from(companionsTable)
      .where(and(eq(companionsTable.id, id), eq(companionsTable.userId, req.userId!)));
    if (!companion) {
      res.status(404).json({ error: "Companion not found" });
      return;
    }

    const conditions = before
      ? and(eq(messagesTable.companionId, id), lt(messagesTable.createdAt, new Date(before)))
      : eq(messagesTable.companionId, id);

    // Fetch newest-first when paginating, then reverse for chronological display
    const rows = await db
      .select()
      .from(messagesTable)
      .where(conditions)
      .orderBy(desc(messagesTable.createdAt))
      .limit(limit);

    res.json({
      messages: rows.reverse(),
      hasMore: rows.length === limit,
      nextCursor: rows.length > 0 ? rows[0].createdAt.toISOString() : null,
    });
  } catch (err) {
    logger.error({ err }, "Database error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /companions/:id/messages
router.post("/companions/:id/messages", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { messages } = req.body as { messages: Array<{ role: string; content: string }> };
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array required" });
    return;
  }
  try {
    const [companion] = await db
      .select({ id: companionsTable.id })
      .from(companionsTable)
      .where(and(eq(companionsTable.id, id), eq(companionsTable.userId, req.userId!)));
    if (!companion) {
      res.status(404).json({ error: "Companion not found" });
      return;
    }
    const inserted = await db
      .insert(messagesTable)
      .values(messages.map((m) => ({ companionId: id, role: m.role, content: m.content })))
      .returning();
    res.json(inserted);
  } catch (err) {
    logger.error({ err }, "Database error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /companions/:id/messages/batch
router.delete("/companions/:id/messages/batch", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { ids } = req.body as { ids: string[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids array required" });
    return;
  }
  try {
    const [companion] = await db
      .select({ id: companionsTable.id })
      .from(companionsTable)
      .where(and(eq(companionsTable.id, id), eq(companionsTable.userId, req.userId!)));
    if (!companion) {
      res.status(404).json({ error: "Companion not found" });
      return;
    }
    await db
      .delete(messagesTable)
      .where(and(eq(messagesTable.companionId, id), inArray(messagesTable.id, ids)));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Database error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /companions/:id/messages
router.delete("/companions/:id/messages", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const [companion] = await db
      .select({ id: companionsTable.id })
      .from(companionsTable)
      .where(and(eq(companionsTable.id, id), eq(companionsTable.userId, req.userId!)));
    if (!companion) {
      res.status(404).json({ error: "Companion not found" });
      return;
    }
    await db.delete(messagesTable).where(eq(messagesTable.companionId, id));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Database error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /companions/:id/memory
router.get("/companions/:id/memory", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const [companion] = await db
      .select({ id: companionsTable.id })
      .from(companionsTable)
      .where(and(eq(companionsTable.id, id), eq(companionsTable.userId, req.userId!)));
    if (!companion) {
      res.status(404).json({ error: "Companion not found" });
      return;
    }
    const notes = await db
      .select()
      .from(memoryNotesTable)
      .where(eq(memoryNotesTable.companionId, id))
      .orderBy(memoryNotesTable.createdAt);
    res.json(notes.map((n) => n.note));
  } catch (err) {
    logger.error({ err }, "Database error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /companions/:id/memory
router.put("/companions/:id/memory", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body as { notes: string[] };
  if (!Array.isArray(notes)) {
    res.status(400).json({ error: "notes array required" });
    return;
  }
  try {
    const [companion] = await db
      .select({ id: companionsTable.id })
      .from(companionsTable)
      .where(and(eq(companionsTable.id, id), eq(companionsTable.userId, req.userId!)));
    if (!companion) {
      res.status(404).json({ error: "Companion not found" });
      return;
    }
    await db.delete(memoryNotesTable).where(eq(memoryNotesTable.companionId, id));
    if (notes.length > 0) {
      await db
        .insert(memoryNotesTable)
        .values(notes.map((note) => ({ companionId: id, note })));
    }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Database error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
