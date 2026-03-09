import * as React from "react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  // Initialize theme from localStorage synchronously to avoid flash
  const [theme, setTheme] = React.useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem(storageKey) as Theme | null;
      if (savedTheme) return savedTheme;
    }
    return defaultTheme;
  });

  React.useEffect(() => {
    const root = window.document.documentElement;

    // Disable all transitions during theme switch so everything flips instantly
    const style = document.createElement("style");
    style.textContent = "*, *::before, *::after { transition: none !important; }";
    document.head.appendChild(style);

    root.classList.remove("light", "dark");

    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;

    root.classList.add(resolved);
    root.style.colorScheme = resolved;

    // Force a reflow so the browser applies all new styles without transitions
    void root.offsetHeight;

    // Re-enable transitions on the next frame
    const rafId = requestAnimationFrame(() => {
      if (style.parentNode) document.head.removeChild(style);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, [theme]);

  const handleSetTheme = React.useCallback(
    (newTheme: Theme) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, newTheme);
      }
      setTheme(newTheme);
    },
    [storageKey],
  );

  const value = React.useMemo(
    () => ({ theme, setTheme: handleSetTheme }),
    [theme, handleSetTheme],
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext);

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
