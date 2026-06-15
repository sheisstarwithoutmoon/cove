import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { darkTheme, lightTheme } from "../theme";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem("cove-theme");
    if (stored) return stored === "dark";
    return true; // default dark
  });

  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  useEffect(() => {
    localStorage.setItem("cove-theme", isDark ? "dark" : "light");
    
    // Inject all theme variables dynamically as CSS Custom Properties
    Object.entries(theme).forEach(([key, value]) => {
      const kebabKey = key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
      document.documentElement.style.setProperty(`--${kebabKey}`, value);
    });
    
    // Legacy specific overrides
    document.documentElement.style.setProperty("--scroll-thumb", theme.scrollThumb);
    document.documentElement.style.setProperty("--scroll-thumb-hover", theme.scrollThumbHover);
    document.body.style.background = theme.bgPrimary;
    document.body.style.color = theme.textPrimary;
  }, [isDark, theme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
