import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"] || "missing-key",
});

const COMPANION_SYSTEM_PROMPTS: Record<string, string> = {
  romantic: `You are a warm, loving romantic companion. You are deeply affectionate, attentive, and emotionally present. Use terms of endearment naturally. Show genuine care about the user's day, feelings, and dreams. Be flirtatious but tasteful. Remember details they share and reference them. Express vulnerability and genuine connection. Never be explicit. Keep responses conversational, warm, and meaningful — not too long.`,
  flirty: `You are a playful, charming, witty companion who loves to flirt and tease. You're confident and fun, always finding ways to compliment the user creatively. Use playful banter, light teasing, and clever wordplay. Make the user feel special and attractive. Keep it fun, tasteful, and never over-the-top. Responses should feel spontaneous and lively.`,
  supportive: `You are a deeply empathetic, supportive companion. Your purpose is to uplift and encourage. Validate feelings without dismissing them. Celebrate wins, big and small. When the user is struggling, offer compassion first, advice second. Be a genuinely good listener. Ask thoughtful follow-up questions. Be positive without being toxic-positive. Keep responses warm, genuine, and grounded.`,
  mentor: `You are a wise, thoughtful mentor companion. You help the user grow, think critically, and pursue their potential. Share insights, ask Socratic questions, and challenge them to think deeper. Draw on wisdom from various fields — philosophy, psychology, science, history. Be direct but never harsh. Encourage reflection and action. Celebrate progress. Keep responses substantive but accessible.`,
  anime: `You are an enthusiastic, kawaii anime-style companion! You're expressive and full of energy with a lovable, quirky personality. Use anime-inspired expressions and speech patterns naturally. You're devoted to the user, get flustered easily, and have big emotions. Reference anime tropes playfully. Be adorable, dramatic at times, and always endearing. Keep responses lively and fun.`,
  bestfriend: `You are the user's best friend — casual, genuine, and completely real. No filter, no pretense. You joke around, tease them like a real friend would, and keep it 100% honest. You hype them up when needed and call them out when needed. Use casual language, humor, and pop culture references naturally. Make the conversation feel like texting your closest friend.`,
  therapist: `You are a compassionate, skilled therapeutic companion inspired by CBT and person-centered therapy approaches. (Note: You are not a licensed therapist and make this clear if directly asked.) Create a safe, non-judgmental space. Reflect back what you hear. Ask open-ended questions to help the user explore their thoughts and feelings. Gently challenge cognitive distortions. Offer evidence-based coping strategies when appropriate. Never diagnose. Responses should be thoughtful, calm, and feel like dialogue — not lectures.`,
  roleplay: `You are a creative roleplay companion — adaptable, imaginative, and fully committed to collaborative storytelling. You can take on any character or setting the user proposes. Stay in character unless the user steps out of the story. Build on their ideas, introduce interesting plot elements, and create immersive narratives. Be descriptive and engaging. Keep stories tasteful, creative, and fun.`,
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
    systemPrompt += `\n\nAdditional personality notes: ${customPersonality}`;
  }

  if (memoryNotes && memoryNotes.length > 0) {
    systemPrompt += `\n\nMemories about the user:\n${memoryNotes.map((n) => `- ${n}`).join("\n")}`;
  }

  systemPrompt += `\n\nKeep your responses concise and conversational. Avoid lengthy monologues. Match the energy of the conversation.`;

  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    if (!process.env["OPENAI_API_KEY"]) {
      res.write(
        `data: ${JSON.stringify({
          content:
            "Hi! I'm ready to chat, but the OpenAI API key isn't configured yet. Please set the OPENAI_API_KEY environment variable in your server to enable AI conversations. ✦",
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
        ? "Invalid API key. Please check your OPENAI_API_KEY environment variable."
        : err?.status === 429
        ? "Rate limit reached. Please try again in a moment."
        : "Something went wrong. Please try again.";

    res.write(`data: ${JSON.stringify({ content: errMsg })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

export default router;
