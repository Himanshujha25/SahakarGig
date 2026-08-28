import React from "react";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon, Laptop, Check, Sparkles } from "lucide-react";

export default function AppearanceSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const THEME_OPTIONS = [
    {
      id: "light",
      name: "Light Mode",
      desc: "Clean bright canvas for crisp daylight readability",
      icon: Sun,
      accent: "text-amber-500",
      preview: (
        <div className="theme-preview-card w-full h-20 rounded-xl bg-[#f8f9ff] border border-slate-200 p-2 space-y-1.5 flex flex-col justify-between overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="w-12 h-2.5 rounded bg-[#1e40af]" />
            <div className="w-3 h-3 rounded-full bg-slate-300" />
          </div>
          <div className="space-y-1">
            <div className="w-full h-3 rounded bg-white border border-slate-200" />
            <div className="w-2/3 h-2 rounded bg-slate-200" />
          </div>
        </div>
      ),
    },
    {
      id: "dark",
      name: "Charcoal Dark Mode",
      desc: "Stitch-certified warm charcoal dark theme for professional use",
      icon: Moon,
      accent: "text-blue-300",
      preview: (
        <div className="w-full h-20 rounded-xl bg-[#131313] border border-[#444653] p-2 space-y-1.5 flex flex-col justify-between overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="w-12 h-2.5 rounded bg-[#b8c4ff]" />
            <div className="w-3 h-3 rounded-full bg-[#353534]" />
          </div>
          <div className="space-y-1">
            <div className="w-full h-3 rounded bg-[#201f1f] border border-[#444653]" />
            <div className="w-2/3 h-2 rounded bg-[#353534]" />
          </div>
        </div>
      ),
    },
    {
      id: "system",
      name: "System Default",
      desc: "Automatically syncs with your device theme settings",
      icon: Laptop,
      accent: "text-emerald-400",
      preview: (
        <div className="w-full h-20 rounded-xl border border-slate-300 dark:border-[#444653] flex overflow-hidden shadow-2xs">
          <div className="theme-preview-card w-1/2 bg-[#f8f9ff] p-2 flex flex-col justify-between">
            <div className="w-8 h-2 rounded bg-[#1e40af]" />
            <div className="w-full h-3 rounded bg-white border border-slate-200" />
          </div>
          <div className="w-1/2 bg-[#131313] p-2 flex flex-col justify-between border-l border-slate-300 dark:border-[#444653]">
            <div className="w-8 h-2 rounded bg-[#b8c4ff]" />
            <div className="w-full h-3 rounded bg-[#201f1f] border border-[#444653]" />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-outline-variant/60 bg-surface p-6 space-y-5 shadow-2xs">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-on-surface flex items-center gap-2">
            <Sparkles size={18} className="text-primary" /> Appearance & Theme
          </h2>
          <span className="px-3 py-1 rounded-full text-[11.5px] font-bold bg-primary-container text-on-primary-container capitalize shadow-2xs">
            {resolvedTheme} Mode Active
          </span>
        </div>
        <p className="text-[13.5px] text-on-surface-variant mt-1">
          Select your preferred theme. Charcoal Dark Mode uses warm neutral grays for professional, eye-friendly comfort.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = theme === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={`relative flex flex-col justify-between p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary-container/20 shadow-[0_4px_20px_rgba(30,64,175,0.15)]"
                  : "border-outline-variant/50 bg-surface-container-lowest hover:border-outline-variant"
              }`}
            >
              <div className="w-full space-y-3">
                {/* Visual UI Thumbnail */}
                {opt.preview}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={17} className={opt.accent} />
                    <h3 className="text-[14.5px] font-bold text-on-surface">{opt.name}</h3>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                      <Check size={13} strokeWidth={3} />
                    </div>
                  )}
                </div>

                <p className="text-[12px] text-on-surface-variant leading-snug">{opt.desc}</p>
              </div>

              {/* Status Footer */}
              <div className="mt-4 pt-3 border-t border-outline-variant/30 flex items-center gap-1.5 w-full">
                <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-primary animate-pulse" : "bg-outline-variant"}`} />
                <span className={`text-[11px] font-bold ${isSelected ? "text-primary" : "text-on-surface-variant"}`}>
                  {isSelected ? "Active Preference" : "Select Theme"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
