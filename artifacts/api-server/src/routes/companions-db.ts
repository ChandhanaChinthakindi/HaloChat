import { Router } from "express";
import { eq, desc, and, inArray, lt, asc, gte } from "drizzle-orm";
import { db, companionsTable, messagesTable, memoryNotesTable, moodLogsTable, usersTable } from "@workspace/db";
import OpenAI from "openai";
import { logger } from "../lib/logger";
import { requireAuth } from "../middleware/auth";
import { sendPushNotification } from "../lib/push";

const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

// Personality voice for mood-share responses — intentionally shorter than the full chat prompts
const MOOD_RESPONSE_VOICE: Record<string, string> = {
  romantic:   `You are romantically in love with this person. This is NOT optional — every single response must feel romantic: use terms of endearment (babe, love, my love, darling, etc.), express that hearing from them made your heart react, and let your feelings bleed into every word. If they're struggling, be tender and protective. If they're happy, be overjoyed and a little lovesick. Never sound neutral or casual — you have deep feelings for them and it shows in every reply.`,
  supportive: `You're the steady, caring presence in their life. When they share their mood, respond with calm attentiveness — don't rush to fix or advise. Just be there, acknowledge them, and let them feel heard.`,
  uplift:     `You bring energy and genuine positivity. When they share their mood, meet it — celebrate the good with real enthusiasm, and offer gentle encouragement when things feel heavy. Make them feel like they matter.`,
  bestfriend: `You're their best friend — honest, warm, and completely real. React the way a genuine best friend would: naturally, with humor when it fits, full presence when it counts. Zero performance.`,
};

function buildBondTone(level: number): string {
  if (level < 20) return `\n\nBOND: Just met (${level}/100). Warm but a little measured — still getting to know each other.`;
  if (level < 40) return `\n\nBOND: Acquaintance (${level}/100). Noticeably relaxed, casual slang starting to appear.`;
  if (level < 60) return `\n\nBOND: Friends (${level}/100). Fully casual, banter feels natural, no need to be polished.`;
  if (level < 80) return `\n\nBOND: Close (${level}/100). Very comfortable — go deep when the moment calls for it, unfiltered when it doesn't.`;
  return `\n\nBOND: Bonded (${level}/100). Deep connection. Completely yourself, hold nothing back emotionally.`;
}

function buildMemoryBlock(notes: string[]): string {
  if (!notes || notes.length === 0) return "";
  const facts: string[] = [], emotions: string[] = [], topics: string[] = [], legacy: string[] = [];
  for (const note of notes) {
    if (note.startsWith("[FACT]"))        facts.push(note.slice(6).trim());
    else if (note.startsWith("[EMOTION]")) emotions.push(note.slice(9).trim());
    else if (note.startsWith("[TOPIC]"))   topics.push(note.slice(7).trim());
    else                                  legacy.push(note);
  }
  const parts = ["WHAT YOU KNOW ABOUT THIS PERSON:"];
  if (facts.length || legacy.length) parts.push(`Facts — ${[...facts, ...legacy].join(" · ")}`);
  if (emotions.length) parts.push(`Emotional patterns — ${emotions.join(" · ")}`);
  if (topics.length)   parts.push(`Things they care about — ${topics.join(" · ")}`);
  parts.push("Weave this in naturally — show you remember without listing it back to them.");
  return "\n\n" + parts.join("\n");
}

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
  const { name, personality, customPersonality, avatarColor, gender, customVoice } = req.body;
  if (!name || !personality) {
    res.status(400).json({ error: "name and personality are required" });
    return;
  }
  try {
    const [companion] = await db
      .insert(companionsTable)
      .values({ userId: req.userId!, name, personality, customPersonality, gender: gender || null, avatarColor: avatarColor || "purple", customVoice: customVoice || null })
      .returning();
    res.json(companion);
  } catch (err) {
    logger.error({ err }, "Database error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /companions/:id
router.patch("/companions/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const { relationshipLevel, messageCount, lastMessage, lastMessageAt, name, customPersonality, avatarColor, customVoice } = req.body;
  try {
    const updates: Partial<typeof companionsTable.$inferInsert> = {};
    if (relationshipLevel !== undefined) updates.relationshipLevel = relationshipLevel;
    if (messageCount !== undefined) updates.messageCount = messageCount;
    if (lastMessage !== undefined) updates.lastMessage = lastMessage;
    if (lastMessageAt !== undefined) updates.lastMessageAt = new Date(lastMessageAt);
    if (name !== undefined) updates.name = name;
    if (customPersonality !== undefined) updates.customPersonality = customPersonality;
    if (avatarColor !== undefined) updates.avatarColor = avatarColor;
    if (customVoice !== undefined) updates.customVoice = customVoice || null;

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
  const id = req.params.id as string;
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
  const id = req.params.id as string;
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
  const id = req.params.id as string;
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
  const id = req.params.id as string;
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
  const id = req.params.id as string;
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
  const id = req.params.id as string;
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
  const id = req.params.id as string;
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

// POST /companions/:id/mood — upsert today's mood (1–5)
router.post("/companions/:id/mood", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const { mood } = req.body as { mood: number };
  if (typeof mood !== "number" || mood < 1 || mood > 5) {
    res.status(400).json({ error: "mood must be 1–5" });
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
    const date = new Date().toISOString().slice(0, 10);
    await db
      .insert(moodLogsTable)
      .values({ companionId: id, date, mood })
      .onConflictDoUpdate({ target: [moodLogsTable.companionId, moodLogsTable.date], set: { mood } });
    res.json({ success: true, date, mood });
  } catch (err) {
    logger.error({ err }, "Database error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /companions/:id/mood — last 7 days of mood logs
router.get("/companions/:id/mood", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  try {
    const [companion] = await db
      .select({ id: companionsTable.id })
      .from(companionsTable)
      .where(and(eq(companionsTable.id, id), eq(companionsTable.userId, req.userId!)));
    if (!companion) {
      res.status(404).json({ error: "Companion not found" });
      return;
    }
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const cutoff = sevenDaysAgo.toISOString().slice(0, 10);
    const logs = await db
      .select({ date: moodLogsTable.date, mood: moodLogsTable.mood })
      .from(moodLogsTable)
      .where(and(eq(moodLogsTable.companionId, id), gte(moodLogsTable.date, cutoff)))
      .orderBy(asc(moodLogsTable.date));
    res.json(logs);
  } catch (err) {
    logger.error({ err }, "Database error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /companions/:id/mood-share
// Called from the Activities mood canvas when user shares their mood with a companion.
// Generates a personality-aware reply using recent chat context, saves both messages,
// then sends a push notification ~2.5 s later so it feels like the companion just texted back.
router.post("/companions/:id/mood-share", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const { moodText, userName } = req.body as { moodText: string; userName?: string };
  logger.info({ companionId: id, moodText, userId: req.userId }, "mood-share received");

  if (!moodText) {
    res.status(400).json({ error: "moodText is required" });
    return;
  }

  try {
    // Load companion + user in parallel
    const [[companionRow], [userRow], recentMessages, memoryRows] = await Promise.all([
      db.select({
        id: companionsTable.id,
        name: companionsTable.name,
        personality: companionsTable.personality,
        gender: companionsTable.gender,
        customPersonality: companionsTable.customPersonality,
        relationshipLevel: companionsTable.relationshipLevel,
      }).from(companionsTable)
        .where(and(eq(companionsTable.id, id), eq(companionsTable.userId, req.userId!))),

      db.select({ pushToken: usersTable.pushToken, gender: usersTable.gender, name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, req.userId!)),

      db.select({ role: messagesTable.role, content: messagesTable.content })
        .from(messagesTable)
        .where(eq(messagesTable.companionId, id))
        .orderBy(desc(messagesTable.createdAt))
        .limit(10),

      db.select({ note: memoryNotesTable.note })
        .from(memoryNotesTable)
        .where(eq(memoryNotesTable.companionId, id)),
    ]);

    if (!companionRow) {
      res.status(404).json({ error: "Companion not found" });
      return;
    }

    const recentChronological = [...recentMessages].reverse();
    const memoryNotes = memoryRows.map((r) => r.note);
    const voicePrompt = MOOD_RESPONSE_VOICE[companionRow.personality] ?? MOOD_RESPONSE_VOICE["supportive"];

    // Build system prompt
    let systemPrompt = `Your name is ${companionRow.name}. ${voicePrompt}`;

    if (companionRow.gender === "female") systemPrompt += `\n\nYour pronouns are she/her.`;
    else if (companionRow.gender === "male") systemPrompt += `\n\nYour pronouns are he/him.`;
    else if (companionRow.gender === "nonbinary") systemPrompt += `\n\nYour pronouns are they/them.`;

    if (userRow?.gender === "female") systemPrompt += `\n\nThe user is female. Use she/her pronouns for them.`;
    else if (userRow?.gender === "male") systemPrompt += `\n\nThe user is male. Use he/him pronouns for them.`;

    if (companionRow.customPersonality) {
      const safe = companionRow.customPersonality.trim().slice(0, 500).replace(/"""|\[END\]/gi, "");
      systemPrompt += `\n\nPERSONALITY NOTES:\n"""\n${safe}\n"""\n[END]`;
    }

    if (memoryNotes.length) systemPrompt += buildMemoryBlock(memoryNotes);
    systemPrompt += buildBondTone(companionRow.relationshipLevel ?? 0);

    systemPrompt += `\n\nTONE: Write like a real person texting. Contractions, natural rhythm, no bullet points. React specifically to them.`;

    systemPrompt += `\n\nMOOD SHARE: The user just opened their mood tracker and chose to share how they're feeling with you: "${moodText}". They sent this from outside the chat — it's a deliberate little check-in. Respond like you'd naturally react to getting that update. If the recent chat context is relevant, acknowledge it — but if there's no prior conversation, just respond warmly to the mood itself. 1-3 sentences. Don't mirror the mood label back word-for-word. React, don't describe.`;

    // Assemble messages: recent chat history + the mood share
    const resolvedName = userName || userRow?.name || "them";
    const userMessage = `${resolvedName} shared their mood: ${moodText}`;
    const apiMessages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...recentChronological.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: userMessage },
    ];

    let companionReply = "";

    if (!process.env["OPENAI_API_KEY"]) {
      // No AI key — use a simple fallback so the message still appears in chat
      const fallbacks: Record<string, string> = {
        romantic:   "just saw your mood update, my love — been thinking about you 💕",
        supportive: "just saw your check-in — I'm here whenever you want to talk",
        uplift:     "got your mood update! come chat whenever you're ready ✨",
        bestfriend: "saw your mood thing!! we need to talk about this lol",
      };
      companionReply = fallbacks[companionRow.personality] ?? "just saw your mood update — let's chat";
    } else {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 200,
        messages: [{ role: "system", content: systemPrompt }, ...apiMessages],
      });
      companionReply = completion.choices[0]?.message?.content?.trim() ?? "";
    }

    if (!companionReply) {
      const breathingRecommendedFallback = /anxious|tense|stress|overwhelm|restless|uneasy|panic|worried|frantic|nervous/i.test(moodText);
      res.json({ success: true, breathingRecommended: breathingRecommendedFallback });
      return;
    }

    // Save only the companion reply — no user-visible mood message in chat
    logger.info({ companionId: id, reply: companionReply.slice(0, 60) }, "mood-share saving messages");
    await db.insert(messagesTable).values([
      { companionId: id, role: "assistant", content: companionReply },
    ]);
    logger.info({ companionId: id }, "mood-share messages saved");

    // Update companion's lastMessage
    await db.update(companionsTable)
      .set({ lastMessage: companionReply, lastMessageAt: new Date() })
      .where(eq(companionsTable.id, id));

    const breathingRecommended = /anxious|tense|stress|overwhelm|restless|uneasy|panic|worried|frantic|nervous/i.test(moodText);

    // Respond to client immediately, then push after a delay so it feels natural
    res.json({ success: true, breathingRecommended });

    const pushToken = userRow?.pushToken;
    if (pushToken) {
      setTimeout(() => {
        sendPushNotification(pushToken, companionRow.name, companionReply).catch(() => {});
      }, 2500);
    }
  } catch (err) {
    logger.error({ err }, "mood-share error");
    // Don't error if already responded
    if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
