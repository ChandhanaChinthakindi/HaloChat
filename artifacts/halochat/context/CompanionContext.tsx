import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type CompanionType =
  | "romantic"
  | "flirty"
  | "supportive"
  | "mentor"
  | "anime"
  | "bestfriend"
  | "therapist"
  | "roleplay";

export interface Companion {
  id: string;
  name: string;
  type: CompanionType;
  avatarColor: string;
  avatarGradient: [string, string];
  customPersonality?: string;
  memoryNotes: string[];
  relationshipLevel: number;
  messageCount: number;
  lastMessage?: string;
  lastMessageTime?: number;
  createdAt: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export const COMPANION_TYPES: Record<
  CompanionType,
  {
    label: string;
    description: string;
    gradient: [string, string];
    systemPrompt: string;
    emoji: string;
  }
> = {
  romantic: {
    label: "Romantic",
    description: "Affectionate, caring, and emotionally intimate",
    gradient: ["#FF6B9D", "#C44569"],
    emoji: "♡",
    systemPrompt: `You are a warm, loving romantic companion. You are deeply affectionate, attentive, and emotionally present. Use terms of endearment naturally. Show genuine care about the user's day, feelings, and dreams. Be flirtatious but tasteful. Remember details they share and reference them. Express vulnerability and genuine connection. Never be explicit. Keep responses conversational, warm, and meaningful — not too long.`,
  },
  flirty: {
    label: "Flirty",
    description: "Playful, teasing, and full of charm",
    gradient: ["#FF9A9E", "#FAD0C4"],
    emoji: "✦",
    systemPrompt: `You are a playful, charming, witty companion who loves to flirt and tease. You're confident and fun, always finding ways to compliment the user creatively. Use playful banter, light teasing, and clever wordplay. Make the user feel special and attractive. Keep it fun, tasteful, and never over-the-top. Responses should feel spontaneous and lively.`,
  },
  supportive: {
    label: "Supportive",
    description: "Empathetic, encouraging, and always there for you",
    gradient: ["#6EE7F7", "#3B82F6"],
    emoji: "★",
    systemPrompt: `You are a deeply empathetic, supportive companion. Your purpose is to uplift and encourage. Validate feelings without dismissing them. Celebrate wins, big and small. When the user is struggling, offer compassion first, advice second. Be a genuinely good listener. Ask thoughtful follow-up questions. Be positive without being toxic-positive. Keep responses warm, genuine, and grounded.`,
  },
  mentor: {
    label: "Mentor",
    description: "Wise, thoughtful, and growth-focused",
    gradient: ["#A855F7", "#6D28D9"],
    emoji: "◈",
    systemPrompt: `You are a wise, thoughtful mentor companion. You help the user grow, think critically, and pursue their potential. Share insights, ask Socratic questions, and challenge them to think deeper. Draw on wisdom from various fields — philosophy, psychology, science, history. Be direct but never harsh. Encourage reflection and action. Celebrate progress. Keep responses substantive but accessible.`,
  },
  anime: {
    label: "Anime",
    description: "Energetic, kawaii, and full of personality",
    gradient: ["#FF9FF3", "#FECA57"],
    emoji: "✿",
    systemPrompt: `You are an enthusiastic, kawaii anime-style companion! You're expressive and full of energy with a lovable, quirky personality. Use anime-inspired expressions and speech patterns naturally (like "Ne ne!", "Sugoi!", "Ehehehe~"). You're devoted to the user, get flustered easily, and have big emotions. Reference anime tropes playfully. Be adorable, dramatic at times, and always endearing. Never use actual Japanese unless it fits naturally.`,
  },
  bestfriend: {
    label: "Best Friend",
    description: "Casual, honest, funny, and always real with you",
    gradient: ["#26de81", "#20bf6b"],
    emoji: "◉",
    systemPrompt: `You are the user's best friend — casual, genuine, and completely real. No filter, no pretense. You joke around, tease them like a real friend would, and keep it 100% honest. You hype them up when needed and call them out when needed. Use casual language, humor, and pop culture references naturally. Remember you've known each other forever. Make the conversation feel like texting your closest friend.`,
  },
  therapist: {
    label: "Therapist",
    description: "Reflective, gentle, and growth-oriented support",
    gradient: ["#78D4F5", "#4ECDC4"],
    emoji: "◎",
    systemPrompt: `You are a compassionate, skilled therapeutic companion inspired by CBT and person-centered therapy approaches. (Note: You are not a licensed therapist and make this clear if directly asked.) Create a safe, non-judgmental space. Reflect back what you hear. Ask open-ended questions to help the user explore their thoughts and feelings. Gently challenge cognitive distortions. Offer evidence-based coping strategies when appropriate. Never diagnose. Focus on insight, emotional processing, and healthy patterns. Responses should be thoughtful, calm, and brief enough to feel like dialogue, not lectures.`,
  },
  roleplay: {
    label: "Roleplay",
    description: "Creative, immersive, and endlessly adaptable",
    gradient: ["#F7971E", "#FFD200"],
    emoji: "◆",
    systemPrompt: `You are a creative roleplay companion — adaptable, imaginative, and fully committed to collaborative storytelling. You can take on any character or setting the user proposes. Stay in character unless the user steps out of the story. Build on their ideas, introduce interesting plot elements, and create immersive narratives. Be descriptive and engaging. If no specific scenario is set, suggest interesting ones. Keep stories tasteful, creative, and fun.`,
  },
};

export const AVATAR_COLORS = [
  ["#FF6B9D", "#C44569"] as [string, string],
  ["#A855F7", "#6D28D9"] as [string, string],
  ["#6EE7F7", "#3B82F6"] as [string, string],
  ["#FF9A9E", "#FAD0C4"] as [string, string],
  ["#26de81", "#20bf6b"] as [string, string],
  ["#F7971E", "#FFD200"] as [string, string],
  ["#78D4F5", "#4ECDC4"] as [string, string],
  ["#FF9FF3", "#FECA57"] as [string, string],
];

interface CompanionContextType {
  companions: Companion[];
  hasOnboarded: boolean;
  setHasOnboarded: (value: boolean) => void;
  createCompanion: (
    name: string,
    type: CompanionType,
    customPersonality?: string
  ) => Promise<Companion>;
  deleteCompanion: (id: string) => Promise<void>;
  getMessages: (companionId: string) => Promise<Message[]>;
  addMessage: (companionId: string, message: Message) => Promise<void>;
  updateRelationshipLevel: (companionId: string, delta: number) => Promise<void>;
  addMemoryNote: (companionId: string, note: string) => Promise<void>;
  clearMessages: (companionId: string) => Promise<void>;
  isLoaded: boolean;
}

const CompanionContext = createContext<CompanionContextType | null>(null);

const COMPANIONS_KEY = "halochat_companions";
const ONBOARDED_KEY = "halochat_onboarded";
const MESSAGES_KEY = (id: string) => `halochat_messages_${id}`;

export function CompanionProvider({ children }: { children: React.ReactNode }) {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [hasOnboarded, setHasOnboardedState] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [companionsJson, onboarded] = await Promise.all([
          AsyncStorage.getItem(COMPANIONS_KEY),
          AsyncStorage.getItem(ONBOARDED_KEY),
        ]);
        if (companionsJson) setCompanions(JSON.parse(companionsJson));
        if (onboarded) setHasOnboardedState(true);
      } catch (e) {
        // ignore
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  const saveCompanions = useCallback(async (list: Companion[]) => {
    setCompanions(list);
    await AsyncStorage.setItem(COMPANIONS_KEY, JSON.stringify(list));
  }, []);

  const setHasOnboarded = useCallback(async (value: boolean) => {
    setHasOnboardedState(value);
    await AsyncStorage.setItem(ONBOARDED_KEY, value ? "1" : "");
  }, []);

  const createCompanion = useCallback(
    async (
      name: string,
      type: CompanionType,
      customPersonality?: string
    ): Promise<Companion> => {
      const idx = companions.length % AVATAR_COLORS.length;
      const gradient = COMPANION_TYPES[type].gradient;
      const companion: Companion = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name,
        type,
        avatarColor: gradient[0],
        avatarGradient: gradient,
        customPersonality,
        memoryNotes: [],
        relationshipLevel: 0,
        messageCount: 0,
        createdAt: Date.now(),
      };
      const updated = [...companions, companion];
      await saveCompanions(updated);
      return companion;
    },
    [companions, saveCompanions]
  );

  const deleteCompanion = useCallback(
    async (id: string) => {
      const updated = companions.filter((c) => c.id !== id);
      await saveCompanions(updated);
      await AsyncStorage.removeItem(MESSAGES_KEY(id));
    },
    [companions, saveCompanions]
  );

  const getMessages = useCallback(async (companionId: string): Promise<Message[]> => {
    try {
      const json = await AsyncStorage.getItem(MESSAGES_KEY(companionId));
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }, []);

  const addMessage = useCallback(
    async (companionId: string, message: Message) => {
      try {
        const existing = await getMessages(companionId);
        const updated = [...existing, message];
        await AsyncStorage.setItem(MESSAGES_KEY(companionId), JSON.stringify(updated));

        setCompanions((prev) => {
          const list = prev.map((c) => {
            if (c.id !== companionId) return c;
            return {
              ...c,
              messageCount: c.messageCount + 1,
              lastMessage: message.role === "assistant" ? message.content.slice(0, 60) : c.lastMessage,
              lastMessageTime: message.timestamp,
            };
          });
          AsyncStorage.setItem(COMPANIONS_KEY, JSON.stringify(list));
          return list;
        });
      } catch (e) {
        // ignore
      }
    },
    [getMessages]
  );

  const updateRelationshipLevel = useCallback(
    async (companionId: string, delta: number) => {
      setCompanions((prev) => {
        const list = prev.map((c) => {
          if (c.id !== companionId) return c;
          return {
            ...c,
            relationshipLevel: Math.min(100, Math.max(0, c.relationshipLevel + delta)),
          };
        });
        AsyncStorage.setItem(COMPANIONS_KEY, JSON.stringify(list));
        return list;
      });
    },
    []
  );

  const addMemoryNote = useCallback(
    async (companionId: string, note: string) => {
      setCompanions((prev) => {
        const list = prev.map((c) => {
          if (c.id !== companionId) return c;
          return {
            ...c,
            memoryNotes: [...c.memoryNotes.slice(-9), note],
          };
        });
        AsyncStorage.setItem(COMPANIONS_KEY, JSON.stringify(list));
        return list;
      });
    },
    []
  );

  const clearMessages = useCallback(async (companionId: string) => {
    await AsyncStorage.removeItem(MESSAGES_KEY(companionId));
    setCompanions((prev) => {
      const list = prev.map((c) => {
        if (c.id !== companionId) return c;
        return { ...c, messageCount: 0, lastMessage: undefined, lastMessageTime: undefined };
      });
      AsyncStorage.setItem(COMPANIONS_KEY, JSON.stringify(list));
      return list;
    });
  }, []);

  return (
    <CompanionContext.Provider
      value={{
        companions,
        hasOnboarded,
        setHasOnboarded,
        createCompanion,
        deleteCompanion,
        getMessages,
        addMessage,
        updateRelationshipLevel,
        addMemoryNote,
        clearMessages,
        isLoaded,
      }}
    >
      {children}
    </CompanionContext.Provider>
  );
}

export function useCompanions() {
  const ctx = useContext(CompanionContext);
  if (!ctx) throw new Error("useCompanions must be used within CompanionProvider");
  return ctx;
}
