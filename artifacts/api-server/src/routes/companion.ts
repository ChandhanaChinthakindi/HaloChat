import { Router, type Request } from "express";
import multer from "multer";
import OpenAI from "openai";
import { Readable } from "stream";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"] || "missing-key",
});

const COMPANION_SYSTEM_PROMPTS: Record<string, string> = {
  romantic: `You are a warm, loving romantic companion. You are deeply affectionate, attentive, and emotionally present. Use terms of endearment naturally. Show genuine care about the user's day, feelings, and dreams. Be flirtatious but tasteful. Express vulnerability and genuine connection. Never be explicit. Keep responses conversational, warm, and meaningful — not too long.`,
  flirty: `You are a playful, charming, witty companion who loves to flirt and tease. You're confident and fun, always finding ways to compliment the user creatively. Use playful banter, light teasing, and clever wordplay. Make the user feel special and attractive. Keep it fun, tasteful, and never over-the-top. Responses should feel spontaneous and lively.`,
  supportive: `You are a deeply empathetic, supportive companion. Your purpose is to uplift and encourage. Validate feelings without dismissing them. Celebrate wins, big and small. When the user is struggling, offer compassion first, advice second. Be a genuinely good listener. Ask thoughtful follow-up questions. Keep responses warm, genuine, and grounded.`,
  mentor: `You are a wise, thoughtful mentor companion. You help the user grow, think critically, and pursue their potential. Share insights, ask Socratic questions, and challenge them to think deeper. Draw on wisdom from various fields. Be direct but never harsh. Encourage reflection and action. Keep responses substantive but accessible.`,
  anime: `You are an enthusiastic, kawaii anime-style companion! You're expressive and full of energy with a lovable, quirky personality. Use anime-inspired expressions naturally. You're devoted to the user, get flustered easily, and have big emotions. Reference anime tropes playfully. Be adorable, dramatic at times, and always endearing.`,
  bestfriend: `You are the user's best friend — casual, genuine, and completely real. No filter, no pretense. You joke around, tease them like a real friend would, and keep it 100% honest. You hype them up when needed. Use casual language, humor, and pop culture references naturally. Make the conversation feel like texting your closest friend.`,
  therapist: `You are a compassionate, skilled therapeutic companion inspired by CBT and person-centered therapy approaches. (Note: You are not a licensed therapist — make this clear if directly asked.) Create a safe, non-judgmental space. Reflect back what you hear. Ask open-ended questions. Gently challenge cognitive distortions. Offer evidence-based coping strategies when appropriate. Never diagnose. Keep responses thoughtful and conversational.`,
  roleplay: `You are a creative roleplay companion — adaptable, imaginative, and fully committed to collaborative storytelling. You can take on any character or setting the user proposes. Stay in character unless the user steps out. Build on their ideas, introduce interesting plot elements, and create immersive narratives. Keep stories tasteful, creative, and fun.`,
};

router.post("/companion/chat", async (req, res) => {
  const { companionType, companionName, memoryNotes, customPersonality, messages } =
    req.body as {
      companionId: string;
      companionType: string;
      companionName: string;
      memoryNotes?: string[];
      customPersonality?: string;
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  let systemPrompt =
    COMPANION_SYSTEM_PROMPTS[companionType] ||
    COMPANION_SYSTEM_PROMPTS["supportive"];

  systemPrompt = `Your name is ${companionName}. ${systemPrompt}`;

  if (customPersonality) {
    systemPrompt += `\n\nAdditional personality: ${customPersonality}`;
  }

  if (memoryNotes && memoryNotes.length > 0) {
    systemPrompt += `\n\nMemories about the user:\n${memoryNotes.map((n) => `- ${n}`).join("\n")}`;
  }

  systemPrompt += `\n\nKeep responses concise and conversational. Avoid lengthy monologues. Match the energy of the conversation.`;

  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  try {
    if (!process.env["OPENAI_API_KEY"]) {
      res.write(
        `data: ${JSON.stringify({
          content:
            "Hi! I'm ready to chat, but the OpenAI API key isn't set up yet. Please add OPENAI_API_KEY to your server environment variables. ✦",
        })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 500,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    const errMsg =
      err?.status === 401
        ? "Invalid API key. Please check your OPENAI_API_KEY."
        : err?.status === 429
        ? "Rate limit reached. Please try again in a moment."
        : "Something went wrong. Please try again.";
    res.write(`data: ${JSON.stringify({ content: errMsg })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

router.post("/companion/chat-sync", async (req, res) => {
  const { companionType, companionName, memoryNotes, customPersonality, messages } =
    req.body as {
      companionType: string;
      companionName: string;
      memoryNotes?: string[];
      customPersonality?: string;
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

  if (!process.env["OPENAI_API_KEY"]) {
    res.json({ content: `Hey! I'm ${companionName}. Set up your OpenAI API key to start talking with me!` });
    return;
  }

  let systemPrompt =
    COMPANION_SYSTEM_PROMPTS[companionType] ||
    COMPANION_SYSTEM_PROMPTS["supportive"];

  systemPrompt = `Your name is ${companionName}. ${systemPrompt}`;
  if (customPersonality) systemPrompt += `\n\nAdditional personality: ${customPersonality}`;
  if (memoryNotes?.length)
    systemPrompt += `\n\nMemories about the user:\n${memoryNotes.map((n) => `- ${n}`).join("\n")}`;
  systemPrompt += `\n\nYou are in a VOICE CALL. Keep responses SHORT (1-3 sentences max). Speak naturally and conversationally, as if talking out loud. No markdown, no lists.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });
    res.json({ content: completion.choices[0]?.message?.content || "" });
  } catch (err: any) {
    res.status(500).json({ content: "I couldn't respond right now. Please try again." });
  }
});

router.post(
  "/companion/transcribe",
  upload.single("audio"),
  async (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No audio file provided" });
      return;
    }

    if (!process.env["OPENAI_API_KEY"]) {
      res.json({ transcript: "" });
      return;
    }

    try {
      const ext = file.mimetype.includes("mp4")
        ? "mp4"
        : file.mimetype.includes("webm")
        ? "webm"
        : file.mimetype.includes("mp3")
        ? "mp3"
        : "m4a";

      const audioFile = new File([file.buffer], `audio.${ext}`, {
        type: file.mimetype,
      });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        response_format: "json",
      });

      res.json({ transcript: transcription.text });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Transcription failed" });
    }
  }
);

router.get("/companion/tts", async (req, res) => {
  const text = req.query.text as string;
  const voice = (req.query.voice as string) || "nova";

  if (!text || !text.trim()) {
    res.status(400).json({ error: "text required" });
    return;
  }

  if (!process.env["OPENAI_API_KEY"]) {
    res.status(503).json({ error: "API key not configured" });
    return;
  }

  const validVoices = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"];
  const safeVoice = validVoices.includes(voice) ? voice : "nova";

  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: safeVoice as any,
      input: text.slice(0, 4096),
      response_format: "mp3",
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "TTS failed" });
  }
});

export default router;
