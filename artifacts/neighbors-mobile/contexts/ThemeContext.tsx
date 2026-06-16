import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import colors from "../constants/colors";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => Promise<void>;
  isDark: boolean;
  colors: typeof colors.light & { radius: number };
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>("system");

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("user_theme");
        if (saved === "light" || saved === "dark" || saved === "system") {
          setThemeState(saved);
        }
      } catch {}
    })();
  }, []);

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem("user_theme", newTheme);
    } catch {}
  };

  const isDark = theme === "system" ? systemScheme === "dark" : theme === "dark";
  const activeColors = isDark ? colors.dark : colors.light;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, colors: { ...activeColors, radius: colors.radius } }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
