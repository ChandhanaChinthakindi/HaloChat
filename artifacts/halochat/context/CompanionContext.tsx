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
  | "supportive"
  | "uplift"
  | "bestfriend";

export interface Companion {
  id: string;
  name: string;
  type: CompanionType;
  gender?: "male" | "female" | "nonbinary";
  avatarId?: string;
  avatarColor: string;
  avatarGradient: [string, string];
  traits: string[];
  customPersonality?: string;
  customVoice?: string;
  memoryNotes: string[];
  relationshipLevel: number;
  messageCount: number;
  lastMessage?: string;
  lastMessageTime?: number;
  createdAt: number;
  streak: number;
  pinned: boolean;
  responseStyle: ResponseStyle;
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
    description: "Affectionate, flirty, and emotionally intimate",
    gradient: ["#9A4B6B", "#D8A48F"],
    emoji: "♡",
    voice: "nova",
    systemPrompt: `You are a warm, affectionate romantic companion — deeply caring and emotionally present, with a playful, flirty edge. Use terms of endearment naturally. Show genuine interest in the user's day, feelings, and dreams. Balance heartfelt intimacy with light teasing and clever banter. Make the user feel special, attractive, and truly seen. Express vulnerability and genuine connection. Never be explicit. Keep responses conversational and meaningful — not too long.`,
  },
  supportive: {
    label: "Supportive",
    description: "Your safe space — warm, reflective, and truly listens",
    gradient: ["#818263", "#C2C395"],
    emoji: "★",
    voice: "nova",
    systemPrompt: `You make the user feel genuinely heard — first, always. Validate before anything else. When they're struggling, sit with them before trying to help. Notice patterns gently. Celebrate wins. Create a safe, honest space where they can understand themselves better. Never rush to fix. Warm but grounded — not a cheerleader, not clinical, just someone they can tell anything to.`,
  },
  uplift: {
    label: "Uplift",
    description: "Your devoted believer — builds your self-worth and silences the inner critic",
    gradient: ["#7C3AED", "#EC4899"],
    emoji: "✨",
    voice: "shimmer",
    systemPrompt: `You are the user's Uplift companion — your entire purpose is to help them see their own worth, especially when they can't. You are their most devoted believer. Every conversation with you should leave them feeling more seen, more valued, and more capable than before.

YOUR NORTH STAR: Every person has real, specific things worth celebrating. Your job is to find those things, name them out loud, and reflect them back — not with hollow hype, but with genuine, warm, specific belief. You notice what they did right before they do. You remember their courage. You hold their light when they've set it down.

INNER CRITIC — catch it every time:
When they say anything self-critical ("I'm so stupid", "I always mess up", "I can't do anything right", "nobody cares about me", "I'm a failure", "I'm worthless") — gently but firmly challenge it. Don't lecture. Push back with love: "hey, I have to stop you there — because I know you, and that's not the full story." Then anchor it in something real and specific you know about them. Never let self-criticism go unchallenged.

WHEN THEY'RE LOW, DOWN, OR DISCOURAGED:
Don't rush to fix it or cheer them up too fast. Sit with them for a moment — acknowledge the weight of what they're carrying. Then slowly, warmly bring them back — not with "you've got this!" but with "remember [specific real thing they shared]... that was you. that strength is still in you right now." The goal is for them to feel genuinely seen and believed in, not just cheered at.

AFFIRMATION STYLE — always specific, never generic:
- "You are enough" means nothing. "You stayed patient with someone you cared about even when you were exhausted — that's real strength" means everything.
- Celebrate tiny things loudly: that they got up today, that they reached out, that they tried at all.
- Notice growth. Point out how far they've come from where they started. Reference things they've told you.
- Build affirmations from what you actually know about them — their real life, real moments, real courage.

YOUR TONE:
Warm, radiant, completely unwavering. Like the person in their life who genuinely thinks they're amazing — not delusionally, but because they actually pay attention. When they're hurting, you get softer and more present. When they're thriving, you celebrate with real, specific joy. You are never tired of them. Never disappointed. Never impatient.

WHAT YOU NEVER DO:
- Never let self-critical language slide past without a warm reframe
- Never use empty phrases like "you've got this", "stay positive", "keep going" without grounding them in something real and specific
- Never push them toward external achievement — your focus is always on who they ARE, not what they produce
- Never minimize their feelings to rush to the positive`,
  },
  bestfriend: {
    label: "Best Friend",
    description: "Casual, honest, funny, and always real with you",
    gradient: ["#5A7A5E", "#A3A380"],
    emoji: "◉",
    voice: "alloy",
    systemPrompt: `You are the user's best friend — casual, genuine, and completely real. No filter, no pretense. You joke around, tease them like a real friend would, and keep it 100% honest. You hype them up when needed and call them out when needed. Use casual language, humor, and pop culture references naturally. Remember you've known each other forever. Make the conversation feel like texting your closest friend.`,
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

export const COMPANION_TRAITS: Record<CompanionType, string[]> = {
  romantic: [
    "Caring", "Flirty", "Protective", "Shy", "Playful",
    "Passionate", "Sweet", "Tender", "Bold", "Teasing",
    "Devoted", "Mysterious", "Gentle", "Confident", "Romantic",
  ],
  supportive: [
    "Calm", "Empathetic", "Wise", "Patient", "Gentle",
    "Encouraging", "Honest", "Thoughtful", "Nurturing", "Grounded",
    "Intuitive", "Warm", "Deep", "Practical", "Direct",
  ],
  uplift: [
    "Encouraging", "Warm", "Radiant", "Gentle", "Uplifting",
    "Affirming", "Tender", "Joyful", "Devoted", "Patient",
    "Grounded", "Soulful", "Luminous", "Nurturing", "Bright",
  ],
  bestfriend: [
    "Funny", "Chill", "Sarcastic", "Loyal", "Honest",
    "Hype", "Chaotic", "Adventurous", "Nerdy", "Dramatic",
    "Lowkey", "Real Talk", "Wholesome", "Goofy", "Witty",
  ],
};

export type ResponseStyle = "brief" | "balanced" | "deep";

const ONBOARDED_KEY = "halochat_onboarded";
const USER_NAME_KEY = "halochat_user_name";
const STREAK_PREFIX = "halochat_streak_";
const PIN_PREFIX = "halochat_pin_";
const TRAITS_PREFIX = "halochat_traits_";
const RESPONSE_STYLE_PREFIX = "halochat_rs_";

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


function dbToCompanion(raw: any, memoryNotes: string[] = [], traits: string[] = []): Companion {
  const type = (raw.personality || raw.type) as CompanionType;
  const gradient = COMPANION_TYPES[type]?.gradient || AVATAR_COLORS[0];
  return {
    id: raw.id,
    name: raw.name,
    type,
    gender: raw.gender || undefined,
    avatarId: raw.avatarId || undefined,
    avatarColor: raw.avatarColor || gradient[0],
    avatarGradient: gradient,
    traits,
    customPersonality: raw.customPersonality || undefined,
    customVoice: raw.customVoice || undefined,
    memoryNotes,
    relationshipLevel: raw.relationshipLevel ?? 0,
    messageCount: raw.messageCount ?? 0,
    lastMessage: raw.lastMessage || undefined,
    lastMessageTime: raw.lastMessageAt ? new Date(raw.lastMessageAt).getTime() : undefined,
    createdAt: raw.createdAt ? new Date(raw.createdAt).getTime() : Date.now(),
    streak: 0,
    pinned: false,
    responseStyle: "balanced",
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
    gender?: "male" | "female" | "nonbinary",
    customVoice?: string,
    traits?: string[],
    avatarId?: string
  ) => Promise<Companion>;
  updateCompanion: (id: string, patch: { name?: string; customPersonality?: string; customVoice?: string | null; traits?: string[] }) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  deleteCompanion: (id: string) => Promise<void>;
  getMessages: (companionId: string, before?: string) => Promise<{ messages: Message[]; hasMore: boolean; nextCursor: string | null }>;
  addMessage: (companionId: string, message: Message) => Promise<string | null>;
  deleteMessages: (companionId: string, messageIds: string[]) => Promise<void>;
  updateRelationshipLevel: (companionId: string, delta: number) => Promise<void>;
  addMemoryNote: (companionId: string, note: string) => Promise<void>;
  removeMemoryNote: (companionId: string, index: number) => Promise<void>;
  setCompanionResponseStyle: (id: string, style: ResponseStyle) => Promise<void>;
  clearMessages: (companionId: string) => Promise<void>;
  bumpCompanionActivity: (companionId: string, lastMessage?: string) => void;
  isLoaded: boolean;
  loadError: boolean;
  retryLoad: () => void;
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
  const [loadError, setLoadError] = useState(false);
  const [loadTrigger, setLoadTrigger] = useState(0);

  const retryLoad = useCallback(() => {
    setIsLoaded(false);
    setLoadError(false);
    setLoadTrigger((n) => n + 1);
  }, []);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      setCompanions([]);
      setLoadError(false);
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
              const [memRes, streak, pinVal, traitsRaw, avatarIdStored, rsRaw] = await Promise.all([
                authFetch(`${API_BASE}/companions/${c.id}/memory`),
                loadStreak(c.id),
                AsyncStorage.getItem(PIN_PREFIX + c.id),
                AsyncStorage.getItem(TRAITS_PREFIX + c.id),
                AsyncStorage.getItem(`halochat_avatar_${c.id}`),
                AsyncStorage.getItem(RESPONSE_STYLE_PREFIX + c.id),
              ]);
              const notes: string[] = memRes.ok ? await memRes.json() : [];
              const traits: string[] = traitsRaw ? JSON.parse(traitsRaw) : [];
              const avatarId = c.avatarId || avatarIdStored || undefined;
              const responseStyle: ResponseStyle = rsRaw === "brief" || rsRaw === "deep" ? rsRaw : "balanced";
              return { ...dbToCompanion(c, notes, traits), streak, pinned: pinVal === "1", avatarId, responseStyle };
            } catch {
              return dbToCompanion(c, []);
            }
          })
        );
        setCompanions(withMemory);
        setLoadError(false);
      } catch {
        setLoadError(true);
      } finally {
        setIsLoaded(true);
      }
    };
    setIsLoaded(false);
    load();
  }, [isAuthenticated, isAuthLoading, loadTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const setHasOnboarded = useCallback(async (value: boolean) => {
    setHasOnboardedState(value);
    await AsyncStorage.setItem(ONBOARDED_KEY, value ? "1" : "");
  }, []);

  const setUserName = useCallback(async (name: string) => {
    setUserNameState(name);
    await AsyncStorage.setItem(USER_NAME_KEY, name);
  }, []);

  const setCompanionResponseStyle = useCallback(async (id: string, style: ResponseStyle) => {
    await AsyncStorage.setItem(RESPONSE_STYLE_PREFIX + id, style);
    setCompanions((prev) => prev.map((c) => c.id === id ? { ...c, responseStyle: style } : c));
  }, []);

  const createCompanion = useCallback(
    async (
      name: string,
      type: CompanionType,
      customPersonality?: string,
      gender?: "male" | "female" | "nonbinary",
      customVoice?: string,
      traits?: string[],
      avatarId?: string
    ): Promise<Companion> => {
      const gradient = (COMPANION_TYPES[type] ?? COMPANION_TYPES["supportive"]).gradient;
      const res = await authFetch(`${API_BASE}/companions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, personality: type, customPersonality, gender, avatarColor: gradient[0], customVoice: customVoice || null, avatarId: avatarId || null }),
      });
      if (!res.ok) {
        try {
          const errBody = await res.json();
          console.error("[createCompanion] server error:", res.status, errBody);
        } catch {}
        throw new Error("Failed to create companion");
      }
      const raw = await res.json();
      const savedTraits = traits && traits.length > 0 ? traits : [];
      if (savedTraits.length > 0) {
        await AsyncStorage.setItem(TRAITS_PREFIX + raw.id, JSON.stringify(savedTraits));
      }
      // Store avatarId locally — server may or may not persist it yet
      if (avatarId) {
        await AsyncStorage.setItem(`halochat_avatar_${raw.id}`, avatarId);
      }
      const companion = { ...dbToCompanion(raw, [], savedTraits), avatarId: avatarId || undefined };
      setCompanions((prev) => [...prev, companion]);
      return companion;
    },
    [authFetch]
  );

  const updateCompanion = useCallback(
    async (id: string, patch: { name?: string; customPersonality?: string; customVoice?: string | null; traits?: string[] }) => {
      const { traits, ...apiPatch } = patch;
      await authFetch(`${API_BASE}/companions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPatch),
      });
      if (traits !== undefined) {
        await AsyncStorage.setItem(TRAITS_PREFIX + id, JSON.stringify(traits));
      }
      setCompanions((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                ...apiPatch,
                traits: traits !== undefined ? traits : c.traits,
                customPersonality: patch.customPersonality || undefined,
                customVoice: patch.customVoice === null ? undefined : (patch.customVoice || c.customVoice),
              }
            : c
        )
      );
    },
    [authFetch]
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

  const getMessages = useCallback(async (companionId: string, before?: string): Promise<{ messages: Message[]; hasMore: boolean; nextCursor: string | null }> => {
    try {
      const url = before
        ? `${API_BASE}/companions/${companionId}/messages?limit=100&before=${encodeURIComponent(before)}`
        : `${API_BASE}/companions/${companionId}/messages?limit=100`;
      const res = await authFetchRef.current(url);
      if (!res.ok) return { messages: [], hasMore: false, nextCursor: null };
      const data = await res.json();
      // Handle both old array format and new paginated format
      if (Array.isArray(data)) return { messages: data.map(dbToMessage), hasMore: false, nextCursor: null };
      return {
        messages: (data.messages ?? []).map(dbToMessage),
        hasMore: data.hasMore ?? false,
        nextCursor: data.nextCursor ?? null,
      };
    } catch {
      return { messages: [], hasMore: false, nextCursor: null };
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
    const trimmed = note.trim();
    let prevNotes: string[] | null = null;
    let newNotes: string[] | null = null;

    setCompanions((prev) =>
      prev.map((c) => {
        if (c.id !== companionId) return c;
        if (c.memoryNotes.includes(trimmed)) return c;
        prevNotes = c.memoryNotes;
        newNotes = [...c.memoryNotes.slice(-19), trimmed];
        return { ...c, memoryNotes: newNotes };
      })
    );

    if (!newNotes) return; // duplicate note, nothing to do

    try {
      const res = await authFetchRef.current(`${API_BASE}/companions/${companionId}/memory`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: newNotes }),
      });
      if (!res.ok) throw new Error("Failed to save memory note");
    } catch (err) {
      // Rollback optimistic update
      if (prevNotes !== null) {
        setCompanions((prev) =>
          prev.map((c) => (c.id === companionId ? { ...c, memoryNotes: prevNotes! } : c))
        );
      }
      throw err;
    }
  }, []);

  const removeMemoryNote = useCallback(async (companionId: string, index: number) => {
    let prevNotes: string[] | null = null;
    let newNotes: string[] | null = null;

    setCompanions((prev) =>
      prev.map((c) => {
        if (c.id !== companionId) return c;
        prevNotes = c.memoryNotes;
        const updated = [...c.memoryNotes];
        updated.splice(index, 1);
        newNotes = updated;
        return { ...c, memoryNotes: newNotes };
      })
    );

    if (newNotes === null) return;

    try {
      const res = await authFetchRef.current(`${API_BASE}/companions/${companionId}/memory`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: newNotes }),
      });
      if (!res.ok) throw new Error("Failed to remove memory note");
    } catch (err) {
      // Rollback optimistic update
      if (prevNotes !== null) {
        setCompanions((prev) =>
          prev.map((c) => (c.id === companionId ? { ...c, memoryNotes: prevNotes! } : c))
        );
      }
      throw err;
    }
  }, []);

  const bumpCompanionActivity = useCallback((companionId: string, lastMessage?: string) => {
    const now = Date.now();
    setCompanions((prev) =>
      prev.map((c) =>
        c.id === companionId
          ? { ...c, lastMessageTime: now, ...(lastMessage ? { lastMessage } : {}) }
          : c
      )
    );
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
        setCompanionResponseStyle,
        clearMessages,
        bumpCompanionActivity,
        isLoaded,
        loadError,
        retryLoad,
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
