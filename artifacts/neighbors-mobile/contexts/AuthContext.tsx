import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const AUTH_TOKEN_KEY = "cn_auth_token";

interface AuthUser {
  id: number;
  replitId: string;
  name: string;
  username: string;
  bio?: string | null;
  apartment?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  isVerified: boolean;
  joinedAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  token: null,
  login: async () => {},
  logout: async () => {},
  refetchUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

async function fetchMe(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(
      `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/auth/me`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const applyToken = useCallback(async (t: string) => {
    setAuthTokenGetter(() => t);
    const userData = await fetchMe(t);
    if (mountedRef.current) {
      if (userData) {
        setToken(t);
        setUser(userData);
      } else {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        setAuthTokenGetter(null);
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (stored) await applyToken(stored);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    })();
  }, [applyToken]);

  const login = useCallback(async () => {
    const redirectUrl = Linking.createURL("auth-callback");
    const loginUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/login?mobile_redirect=${encodeURIComponent(redirectUrl)}`;

    const result = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUrl);
    if (result.type !== "success") return;

    const parsed = new URL(result.url);
    const t = parsed.searchParams.get("token");
    if (!t) return;

    await AsyncStorage.setItem(AUTH_TOKEN_KEY, t);
    await applyToken(t);
  }, [applyToken]);

  const logout = useCallback(async () => {
    const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (storedToken) {
      try {
        await fetch(
          `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/mobile-auth/logout`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${storedToken}` },
          }
        );
      } catch {}
    }
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthTokenGetter(null);
    setToken(null);
    setUser(null);
  }, []);

  const refetchUser = useCallback(async () => {
    const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (!storedToken) return;
    const userData = await fetchMe(storedToken);
    if (userData && mountedRef.current) setUser(userData);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        token,
        login,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
