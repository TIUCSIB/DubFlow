"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Toast } from "@heroui/react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isReady: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  isReady: false,
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("dubflow-theme") as Theme | null;

    if (!saved) {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial = systemPrefersDark ? "dark" : "light";
      setTheme(initial);
      document.documentElement.classList.toggle("dark", initial === "dark");
    } else {
      setTheme(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
    }
    document.documentElement.setAttribute("data-theme-ready", "true");
    setIsReady(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("dubflow-theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isReady }}>
      {children}
      <Toast.Provider
        placement="top end"
        className="top-16 right-4"
        width="min(420px, calc(100vw - 2rem))"
      />
    </ThemeContext.Provider>
  );
}
