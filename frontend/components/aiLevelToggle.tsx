"use client";

import type { AiDifficulty } from "@/constants/ai";

export default function AiLevelToggle({
  value,
  onChange,
  side,
  disabled,
}: {
  value: AiDifficulty;
  onChange: (level: AiDifficulty) => void;
  side: "grn" | "amb";
  disabled?: boolean;
}) {
  const accent = side === "grn" ? "text-p1" : "text-p2";
  const activeRing =
    side === "grn"
      ? "bg-p1/20 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--phosphor)_55%,transparent)]"
      : "bg-p2/20 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--amber)_55%,transparent)]";

  return (
    <div
      className={`inline-flex shrink-0 rounded-sm border border-crt-line/80 bg-ink/40 p-0.5 font-mono text-[9px] sm:text-[10px] tabular-nums ${accent} ${
        disabled ? "opacity-40 pointer-events-none" : ""
      }`}
      role="group"
      aria-label={`${side} AI level`}
    >
      {(["easy", "hard"] as const).map((level) => {
        const on = value === level;
        return (
          <button
            key={level}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            className={`min-h-8 sm:min-h-7 px-2 rounded-[2px] transition-colors ${
              on
                ? `${activeRing} text-crt-phosphor`
                : "text-crt-dim hover:text-crt-phosphor/90"
            }`}
            onClick={() => onChange(level)}
          >
            {level}
          </button>
        );
      })}
    </div>
  );
}
