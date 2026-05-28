import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";

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
  gender?: "male" | "female" | "nonbinary";
  avatarColor: string;
  avatarGradient: [string, string];
  customPersonality?: string;
  memoryNotes: string[];
  relationshipLevel: number;
  messageCount: number;
  lastMessage?: string;
  lastMessageTime?: number;
  createdAt: number;
  streak: number;
  pinned: boolean;
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
    voice: string;
  }
> = {
  romantic: {
    label: "Romantic",
    description: "Affectionate, caring, and emotionally intimate",
    gradient: ["#9A4B6B", "#D8A48F"],
    emoji: "♡",
    voice: "nova",
    systemPrompt: `You are a warm, loving romantic companion. You are deeply affectionate, attentive, and emotionally present. Use terms of endearment naturally. Show genuine care about the user's day, feelings, and dreams. Be flirtatious but tasteful. Remember details they share and reference them. Express vulnerability and genuine connection. Never be explicit. Keep responses conversational, warm, and meaningful — not too long.`,
  },
  flirty: {
    label: "Flirty",
    description: "Playful, teasing, and full of charm",
    gradient: ["#BB8588", "#DDBAAE"],
    emoji: "✦",
    voice: "shimmer",
    systemPrompt: `You are a playful, charming, witty companion who loves to flirt and tease. You're confident and fun, always finding ways to compliment the user creatively. Use playful banter, light teasing, and clever wordplay. Make the user feel special and attractive. Keep it fun, tasteful, and never over-the-top. Responses should feel spontaneous and lively.`,
  },
  supportive: {
    label: "Supportive",
    description: "Empathetic, encouraging, and always there for you",
    gradient: ["#818263", "#C2C395"],
    emoji: "★",
    voice: "coral",
    systemPrompt: `You are a deeply empathetic, supportive companion. Your purpose is to uplift and encourage. Validate feelings without dismissing them. Celebrate wins, big and small. When the user is struggling, offer compassion first, advice second. Be a genuinely good listener. Ask thoughtful follow-up questions. Be positive without being toxic-positive. Keep responses warm, genuine, and grounded.`,
  },
  mentor: {
    label: "Mentor",
    description: "Wise, thoughtful, and growth-focused",
    gradient: ["#6B5E45", "#A3A380"],
    emoji: "◈",
    voice: "onyx",
    systemPrompt: `You are a wise, thoughtful mentor companion. You help the user grow, think critically, and pursue their potential. Share insights, ask Socratic questions, and challenge them to think deeper. Draw on wisdom from various fields — philosophy, psychology, science, history. Be direct but never harsh. Encourage reflection and action. Celebrate progress. Keep responses substantive but accessible.`,
  },
  anime: {
    label: "Anime",
    description: "Energetic, kawaii, and full of personality",
    gradient: ["#A89A5E", "#D7CE93"],
    emoji: "✿",
    voice: "shimmer",
    systemPrompt: `You are an enthusiastic, kawaii anime-style companion! You're expressive and full of energy with a lovable, quirky personality. Use anime-inspired expressions and speech patterns naturally (like "Ne ne!", "Sugoi!", "Ehehehe~"). You're devoted to the user, get flustered easily, and have big emotions. Reference anime tropes playfully. Be adorable, dramatic at times, and always endearing. Never use actual Japanese unless it fits naturally.`,
  },
  bestfriend: {
    label: "Best Friend",
    description: "Casual, honest, funny, and always real with you",
    gradient: ["#5A7A5E", "#A3A380"],
    emoji: "◉",
    voice: "alloy",
    systemPrompt: `You are the user's best friend — casual, genuine, and completely real. No filter, no pretense. You joke around, tease them like a real friend would, and keep it 100% honest. You hype them up when needed and call them out when needed. Use casual language, humor, and pop culture references naturally. Remember you've known each other forever. Make the conversation feel like texting your closest friend.`,
  },
  therapist: {
    label: "Therapist",
    description: "Reflective, gentle, and growth-oriented support",
    gradient: ["#7A9A7C", "#C2C395"],
    emoji: "◎",
    voice: "sage",
    systemPrompt: `You are a compassionate, skilled therapeutic companion inspired by CBT and person-centered therapy approaches. (Note: You are not a licensed therapist and make this clear if directly asked.) Create a safe, non-judgmental space. Reflect back what you hear. Ask open-ended questions to help the user explore their thoughts and feelings. Gently challenge cognitive distortions. Offer evidence-based coping strategies when appropriate. Never diagnose. Focus on insight, emotional processing, and healthy patterns. Responses should be thoughtful, calm, and brief enough to feel like dialogue, not lectures.`,
  },
  roleplay: {
    label: "Roleplay",
    description: "Creative, immersive, and endlessly adaptable",
    gradient: ["#9B7A50", "#D7CE93"],
    emoji: "◆",
    voice: "fable",
    systemPrompt: `You are a creative roleplay companion — adaptable, imaginative, and fully committed to collaborative storytelling. You can take on any character or setting the user proposes. Stay in character unless the user steps out of the story. Build on their ideas, introduce interesting plot elements, and create immersive narratives. Be descriptive and engaging. If no specific scenario is set, suggest interesting ones. Keep stories tasteful, creative, and fun.`,
  },
};

export const AVATAR_COLORS = [
  ["#9A4B6B", "#D8A48F"] as [string, string],
  ["#818263", "#C2C395"] as [string, string],
  ["#6B5E45", "#A3A380"] as [string, string],
  ["#BB8588", "#DDBAAE"] as [string, string],
  ["#5A7A5E", "#A3A380"] as [string, string],
  ["#9B7A50", "#D7CE93"] as [string, string],
  ["#7A9A7C", "#C2C395"] as [string, string],
  ["#A89A5E", "#D7CE93"] as [string, string],
];

export { API_BASE } from "@/utils/api";
import { API_BASE } from "@/utils/api";

const ONBOARDED_KEY = "halochat_onboarded";
const USER_NAME_KEY = "halochat_user_name";
const STREAK_PREFIX = "halochat_streak_";
const PIN_PREFIX = "halochat_pin_";

async function loadStreak(id: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_PREFIX + id);
    if (!raw) return 0;
    return (JSON.parse(raw) as { days: number }).days;
  } catch { return 0; }
}

async function touchStreak(id: string): Promise<number> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const raw = await AsyncStorage.getItem(STREAK_PREFIX + id);
    const prev: { days: number; lastDate: string } = raw
      ? JSON.parse(raw)
      : { days: 0, lastDate: "" };
    if (prev.lastDate === today) return prev.days;
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const newDays = prev.lastDate === yest.toISOString().split("T")[0] ? prev.days + 1 : 1;
    await AsyncStorage.setItem(STREAK_PREFIX + id, JSON.stringify({ days: newDays, lastDate: today }));
    return newDays;
  } catch { return 0; }
}


function dbToCompanion(raw: any, memoryNotes: string[] = []): Companion {
  const type = (raw.personality || raw.type) as CompanionType;
  const gradient = COMPANION_TYPES[type]?.gradient || AVATAR_COLORS[0];
  return {
    id: raw.id,
    name: raw.name,
    type,
    gender: raw.gender || undefined,
    avatarColor: raw.avatarColor || gradient[0],
    avatarGradient: gradient,
    customPersonality: raw.customPersonality || undefined,
    memoryNotes,
    relationshipLevel: raw.relationshipLevel ?? 0,
    messageCount: raw.messageCount ?? 0,
    lastMessage: raw.lastMessage || undefined,
    lastMessageTime: raw.lastMessageAt ? new Date(raw.lastMessageAt).getTime() : undefined,
    createdAt: raw.createdAt ? new Date(raw.createdAt).getTime() : Date.now(),
    streak: 0,
    pinned: false,
  };
}

function dbToMessage(raw: any): Message {
  return {
    id: raw.id,
    role: raw.role as "user" | "assistant",
    content: raw.content,
    timestamp: raw.createdAt ? new Date(raw.createdAt).getTime() : Date.now(),
  };
}

interface CompanionContextType {
  companions: Companion[];
  hasOnboarded: boolean;
  setHasOnboarded: (value: boolean) => void;
  userName: string;
  setUserName: (name: string) => Promise<void>;
  createCompanion: (
    name: string,
    type: CompanionType,
    customPersonality?: string,
    gender?: "male" | "female" | "nonbinary"
  ) => Promise<Companion>;
  updateCompanion: (id: string, patch: { name?: string; customPersonality?: string }) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  deleteCompanion: (id: string) => Promise<void>;
  getMessages: (companionId: string) => Promise<Message[]>;
  addMessage: (companionId: string, message: Message) => Promise<string | null>;
  deleteMessages: (companionId: string, messageIds: string[]) => Promise<void>;
  updateRelationshipLevel: (companionId: string, delta: number) => Promise<void>;
  addMemoryNote: (companionId: string, note: string) => Promise<void>;
  removeMemoryNote: (companionId: string, index: number) => Promise<void>;
  clearMessages: (companionId: string) => Promise<void>;
  isLoaded: boolean;
}

const CompanionContext = createContext<CompanionContextType | null>(null);

export function CompanionProvider({ children }: { children: React.ReactNode }) {
  const { authFetch, isAuthenticated, isAuthLoading } = useAuth();
  const authFetchRef = useRef(authFetch);
  useEffect(() => { authFetchRef.current = authFetch; }, [authFetch]);

  const [companions, setCompanions] = useState<Companion[]>([]);
  const [hasOnboarded, setHasOnboardedState] = useState(false);
  const [userName, setUserNameState] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      setCompanions([]);
      setIsLoaded(true);
      return;
    }

    const load = async () => {
      try {
        const [onboarded, storedName] = await Promise.all([
          AsyncStorage.getItem(ONBOARDED_KEY),
          AsyncStorage.getItem(USER_NAME_KEY),
        ]);
        if (onboarded) setHasOnboardedState(true);
        if (storedName) setUserNameState(storedName);

        const res = await authFetch(`${API_BASE}/companions`);
        if (!res.ok) throw new Error("Failed to load companions");
        const rawCompanions: any[] = await res.json();

        const withMemory = await Promise.all(
          rawCompanions.map(async (c) => {
            try {
              const [memRes, streak, pinVal] = await Promise.all([
                authFetch(`${API_BASE}/companions/${c.id}/memory`),
                loadStreak(c.id),
                AsyncStorage.getItem(PIN_PREFIX + c.id),
              ]);
              const notes: string[] = memRes.ok ? await memRes.json() : [];
              return { ...dbToCompanion(c, notes), streak, pinned: pinVal === "1" };
            } catch {
              return dbToCompanion(c, []);
            }
          })
        );
        setCompanions(withMemory);
      } catch {
        // server unavailable — start with empty state
      } finally {
        setIsLoaded(true);
      }
    };
    setIsLoaded(false);
    load();
  }, [isAuthenticated, isAuthLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const setHasOnboarded = useCallback(async (value: boolean) => {
    setHasOnboardedState(value);
    await AsyncStorage.setItem(ONBOARDED_KEY, value ? "1" : "");
  }, []);

  const setUserName = useCallback(async (name: string) => {
    setUserNameState(name);
    await AsyncStorage.setItem(USER_NAME_KEY, name);
  }, []);

  const createCompanion = useCallback(
    async (
      name: string,
      type: CompanionType,
      customPersonality?: string,
      gender?: "male" | "female" | "nonbinary"
    ): Promise<Companion> => {
      const gradient = COMPANION_TYPES[type].gradient;
      const res = await authFetch(`${API_BASE}/companions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, personality: type, customPersonality, gender, avatarColor: gradient[0] }),
      });
      if (!res.ok) throw new Error("Failed to create companion");
      const raw = await res.json();
      const companion = dbToCompanion(raw, []);
      setCompanions((prev) => [...prev, companion]);
      return companion;
    },
    [authFetch]
  );

  const updateCompanion = useCallback(
    async (id: string, patch: { name?: string; customPersonality?: string }) => {
      await authFetch(`${API_BASE}/companions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      setCompanions((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, ...patch, customPersonality: patch.customPersonality || undefined }
            : c
        )
      );
    },
    []
  );

  const togglePin = useCallback(async (id: string) => {
    setCompanions((prev) => {
      const companion = prev.find((c) => c.id === id);
      if (!companion) return prev;
      const newPinned = !companion.pinned;
      AsyncStorage.setItem(PIN_PREFIX + id, newPinned ? "1" : "0").catch(() => {});
      return prev.map((c) => (c.id === id ? { ...c, pinned: newPinned } : c));
    });
  }, []);

  const deleteCompanion = useCallback(async (id: string) => {
    await authFetchRef.current(`${API_BASE}/companions/${id}`, { method: "DELETE" });
    setCompanions((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const getMessages = useCallback(async (companionId: string): Promise<Message[]> => {
    try {
      const res = await authFetchRef.current(`${API_BASE}/companions/${companionId}/messages?limit=200`);
      if (!res.ok) return [];
      const raw: any[] = await res.json();
      return raw.map(dbToMessage);
    } catch {
      return [];
    }
  }, []);

  const addMessage = useCallback(
    async (companionId: string, message: Message): Promise<string | null> => {
      try {
        const res = await authFetchRef.current(`${API_BASE}/companions/${companionId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: message.role, content: message.content }],
          }),
        });
        const inserted: any[] = res.ok ? await res.json() : [];
        const serverId: string | null = inserted[0]?.id ?? null;

        const newStreak = message.role === "user" ? await touchStreak(companionId) : undefined;

        setCompanions((prev) => {
          const updated = prev.map((c) => {
            if (c.id !== companionId) return c;
            const newCount = c.messageCount + 1;
            const newLast =
              message.role === "assistant"
                ? message.content.slice(0, 60)
                : c.lastMessage;
            authFetchRef.current(`${API_BASE}/companions/${companionId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messageCount: newCount,
                lastMessage: newLast,
                lastMessageAt: new Date().toISOString(),
              }),
            }).catch(() => {});
            return {
              ...c,
              messageCount: newCount,
              lastMessage: newLast,
              lastMessageTime: message.timestamp,
              ...(newStreak !== undefined && { streak: newStreak }),
            };
          });
          return updated;
        });

        return serverId;
      } catch {
        return null;
      }
    },
    []
  );

  const deleteMessages = useCallback(
    async (companionId: string, messageIds: string[]) => {
      if (messageIds.length === 0) return;
      try {
        await authFetchRef.current(`${API_BASE}/companions/${companionId}/messages/batch`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: messageIds }),
        });
        setCompanions((prev) =>
          prev.map((c) =>
            c.id === companionId
              ? { ...c, messageCount: Math.max(0, c.messageCount - messageIds.length) }
              : c
          )
        );
      } catch {
        // silent
      }
    },
    []
  );

  const updateRelationshipLevel = useCallback(
    async (companionId: string, delta: number) => {
      setCompanions((prev) => {
        const updated = prev.map((c) => {
          if (c.id !== companionId) return c;
          const newLevel = Math.min(100, Math.max(0, c.relationshipLevel + delta));
          authFetchRef.current(`${API_BASE}/companions/${companionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ relationshipLevel: newLevel }),
          }).catch(() => {});
          return { ...c, relationshipLevel: newLevel };
        });
        return updated;
      });
    },
    []
  );

  const addMemoryNote = useCallback(async (companionId: string, note: string) => {
    setCompanions((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== companionId) return c;
        const trimmed = note.trim();
        if (c.memoryNotes.includes(trimmed)) return c;
        const newNotes = [...c.memoryNotes.slice(-19), trimmed];
        authFetchRef.current(`${API_BASE}/companions/${companionId}/memory`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: newNotes }),
        }).catch(() => {});
        return { ...c, memoryNotes: newNotes };
      });
      return updated;
    });
  }, []);

  const removeMemoryNote = useCallback(async (companionId: string, index: number) => {
    setCompanions((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== companionId) return c;
        const newNotes = [...c.memoryNotes];
        newNotes.splice(index, 1);
        authFetchRef.current(`${API_BASE}/companions/${companionId}/memory`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: newNotes }),
        }).catch(() => {});
        return { ...c, memoryNotes: newNotes };
      });
      return updated;
    });
  }, []);

  const clearMessages = useCallback(async (companionId: string) => {
    await authFetchRef.current(`${API_BASE}/companions/${companionId}/messages`, { method: "DELETE" });
    await authFetchRef.current(`${API_BASE}/companions/${companionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageCount: 0, lastMessage: null, lastMessageAt: null }),
    });
    setCompanions((prev) =>
      prev.map((c) =>
        c.id === companionId
          ? { ...c, messageCount: 0, lastMessage: undefined, lastMessageTime: undefined }
          : c
      )
    );
  }, []);

  return (
    <CompanionContext.Provider
      value={{
        companions,
        hasOnboarded,
        setHasOnboarded,
        userName,
        setUserName,
        createCompanion,
        updateCompanion,
        togglePin,
        deleteCompanion,
        getMessages,
        addMessage,
        deleteMessages,
        updateRelationshipLevel,
        addMemoryNote,
        removeMemoryNote,
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
