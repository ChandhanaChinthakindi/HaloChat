import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { API_BASE } from "@/utils/api";

// Try SecureStore on native; fall back to AsyncStorage if native module unavailable (Expo Go).
let _secureStore: any = null;
if (Platform.OS !== "web") {
  try {
    _secureStore = require("expo-secure-store");
    // Verify the native module is actually registered (throws in Expo Go)
    if (typeof _secureStore.getItemAsync !== "function") _secureStore = null;
  } catch { _secureStore = null; }
}

const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    if (_secureStore) {
      try { return await _secureStore.getItemAsync(key); } catch { /* fall through */ }
    }
    return AsyncStorage.getItem(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") { typeof localStorage !== "undefined" && localStorage.setItem(key, value); return; }
    if (_secureStore) {
      try { await _secureStore.setItemAsync(key, value); return; } catch { /* fall through */ }
    }
    await AsyncStorage.setItem(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === "web") { typeof localStorage !== "undefined" && localStorage.removeItem(key); return; }
    if (_secureStore) {
      try { await _secureStore.deleteItemAsync(key); return; } catch { /* fall through */ }
    }
    await AsyncStorage.removeItem(key);
  },
};

const KEYS = {
  access: "halochat_access_token",
  refresh: "halochat_refresh_token",
  user: "halochat_auth_user",
};

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  username: string | null;
  gender: string | null;
  dateOfBirth: string | null; // YYYY-MM-DD
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, username: string, gender: string, dateOfBirth: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUserName: (name: string) => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshTokenVal, setRefreshTokenVal] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [acc, ref, usr] = await Promise.all([
          storage.get(KEYS.access),
          storage.get(KEYS.refresh),
          storage.get(KEYS.user),
        ]);
        if (acc && ref && usr) {
          setAccessToken(acc);
          setRefreshTokenVal(ref);
          setUser(JSON.parse(usr));
        }
      } catch { /* ignore */ }
      finally { setIsAuthLoading(false); }
    })();
  }, []);

  const storeSession = useCallback(async (acc: string, ref: string, u: AuthUser) => {
    await Promise.all([
      storage.set(KEYS.access, acc),
      storage.set(KEYS.refresh, ref),
      storage.set(KEYS.user, JSON.stringify(u)),
    ]);
    setAccessToken(acc);
    setRefreshTokenVal(ref);
    setUser(u);
  }, []);

  const clearSession = useCallback(async () => {
    await Promise.all([storage.remove(KEYS.access), storage.remove(KEYS.refresh), storage.remove(KEYS.user)]);
    setAccessToken(null);
    setRefreshTokenVal(null);
    setUser(null);
  }, []);

  const tryRefresh = useCallback(async (refTok: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refTok }),
      });
      if (!res.ok) return null;
      const { accessToken: newAcc, refreshToken: newRef } = await res.json();
      await storage.set(KEYS.access, newAcc);
      await storage.set(KEYS.refresh, newRef);
      setAccessToken(newAcc);
      setRefreshTokenVal(newRef);
      return newAcc;
    } catch { return null; }
  }, []);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
    let token = accessToken;
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let res = await fetch(url, { ...options, headers });

    if (res.status === 401 && refreshTokenVal) {
      token = await tryRefresh(refreshTokenVal);
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        res = await fetch(url, { ...options, headers });
      } else {
        await clearSession();
      }
    }
    return res;
  }, [accessToken, refreshTokenVal, tryRefresh, clearSession]);

  const login = async (identifier: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    await storeSession(data.accessToken, data.refreshToken, data.user);
  };

  const signup = async (email: string, password: string, name: string, username: string, gender: string, dateOfBirth: string) => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, username, gender, dateOfBirth }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Signup failed");
    await storeSession(data.accessToken, data.refreshToken, data.user);
  };

  const logout = async () => { await clearSession(); };

  const deleteAccount = async () => {
    await authFetch(`${API_BASE}/auth/account`, { method: "DELETE" });
    await clearSession();
  };

  const updateUserName = (name: string) => {
    if (!user) return;
    const updated = { ...user, name };
    setUser(updated);
    storage.set(KEYS.user, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthLoading, isAuthenticated: !!user && !!accessToken,
      accessToken, login, signup,
      logout, deleteAccount, updateUserName, authFetch,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
