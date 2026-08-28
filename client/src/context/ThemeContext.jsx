import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "light",
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem("sg_theme") || "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState("light");

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem("sg_theme", newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      let activeTheme = theme;
      if (theme === "system") {
        activeTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }

      setResolvedTheme(activeTheme);

      if (activeTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e) => {
      if (theme === "system") {
        const activeTheme = e.matches ? "dark" : "light";
        setResolvedTheme(activeTheme);
        if (activeTheme === "dark") root.classList.add("dark");
        else root.classList.remove("dark");
      }
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
