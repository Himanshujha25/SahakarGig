import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

// Premium instant light/dark switch (moon ↔ sun).
// Flips state immediately (no flash) and persists via ThemeContext.
export default function ThemeToggle({ className = "" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const toggle = () => setTheme(dark ? "light" : "dark");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`group relative inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-outline-variant transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        dark
          ? "bg-surface-container-low text-tertiary hover:bg-surface-container"
          : "bg-surface-container text-tertiary hover:bg-surface-container-high"
      } ${className}`}
    >
      <Sun
        size={18}
        strokeWidth={2.4}
        className={`absolute transition-all duration-500 ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`}
      />
      <Moon
        size={18}
        strokeWidth={2.4}
        className={`absolute transition-all duration-500 ${dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
      />
    </button>
  );
}