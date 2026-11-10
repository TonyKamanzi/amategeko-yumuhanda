"use client";

import { Moon, Sun, Volume2, VolumeX } from "lucide-react";

type ControlBarProps = {
  dark: boolean;
  onToggleTheme: () => void;
  muted: boolean;
  onToggleSound: () => void;
};

export default function ControlBar({
  dark,
  onToggleTheme,
  muted,
  onToggleSound,
}: ControlBarProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggleSound}
        aria-pressed={!muted}
        aria-label={muted ? "Fungura amajwi (Unmute)" : "Funga amajwi (Mute)"}
        title={muted ? "Fungura amajwi" : "Funga amajwi"}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-border-soft bg-surface text-muted shadow-sm transition-all duration-200 hover:scale-105 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rwanda-blue active:scale-95"
      >
        {muted ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}
        <span className="sr-only">
          {muted ? "Fungura amajwi ya quiz" : "Funga amajwi ya quiz"}
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleTheme}
        aria-pressed={dark}
        aria-label={dark ? "Hindura mu mucyo (Light mode)" : "Hindura mu mwijima (Dark mode)"}
        title={dark ? "Hindura mu mucyo" : "Hindura mu mwijima"}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-border-soft bg-surface text-muted shadow-sm transition-all duration-200 hover:scale-105 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rwanda-blue active:scale-95"
      >
        {dark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
        <span className="sr-only">
          {dark ? "Hindura uburyo bw'ijoro" : "Hindura uburyo bw'amanywa"}
        </span>
      </button>
    </div>
  );
}
