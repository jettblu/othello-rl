"use client";

import { useRef, useState } from "react";
import * as m from "motion/react-m";

const WIDTH = 200;
const HEIGHT = 72;

function pathFrom(values: number[], invert: boolean) {
  const last = values.length - 1;
  return values
    .map((value, index) => {
      const x = last === 0 ? 0 : (index / last) * WIDTH;
      const y = (invert ? value : 1 - value) * HEIGHT;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join("");
}

function DualSpark({
  values,
  cursor,
  onCursor,
}: {
  values: number[];
  cursor: number | null;
  onCursor: (index: number | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const last = Math.max(values.length - 1, 0);
  const pNow = values[values.length - 1] ?? 0.5;
  const pAt = cursor == null ? pNow : values[cursor];
  const xNow = last === 0 ? WIDTH : WIDTH;
  const xAt = last === 0 ? WIDTH : ((cursor ?? last) / last) * WIDTH;

  function indexFromClientX(clientX: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || values.length === 0) return null;
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(t * last);
  }

  return (
    <div className="relative h-14 sm:h-16 w-full min-w-0">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="absolute inset-0 h-full w-full touch-none"
        preserveAspectRatio="none"
        role="img"
        aria-hidden
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          onCursor(indexFromClientX(event.clientX));
        }}
        onPointerMove={(event) => onCursor(indexFromClientX(event.clientX))}
        onPointerUp={() => onCursor(null)}
        onPointerCancel={() => onCursor(null)}
        onPointerLeave={() => onCursor(null)}
      >
        <path
          d={`M0,${HEIGHT / 2} H${WIDTH}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          className="text-zinc-600"
        />
        {values.length > 0 && (
          <>
            <path
              d={
                values.length === 1
                  ? `M0,${((1 - pNow) * HEIGHT).toFixed(2)} H${WIDTH}`
                  : pathFrom(values, false)
              }
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="text-zinc-400"
            />
            <path
              d={
                values.length === 1
                  ? `M0,${(pNow * HEIGHT).toFixed(2)} H${WIDTH}`
                  : pathFrom(values, true)
              }
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="text-zinc-100"
            />
          </>
        )}
        {cursor != null && (
          <path
            d={`M${xAt.toFixed(2)},0 V${HEIGHT}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            className="text-zinc-200"
          />
        )}
      </svg>
      {values.length > 0 && (
        <>
          <span
            className="absolute size-2 rounded-full bg-zinc-400 ring-1 ring-zinc-800 pointer-events-none"
            style={{
              left: `${(xNow / WIDTH) * 100}%`,
              top: `${(1 - pNow) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
          <span
            className="absolute size-2 rounded-full bg-zinc-100 ring-1 ring-zinc-800 pointer-events-none"
            style={{
              left: `${(xNow / WIDTH) * 100}%`,
              top: `${pNow * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
          {cursor != null && (
            <>
              <span
                className="absolute size-1.5 rounded-full bg-zinc-400 ring-1 ring-zinc-800 pointer-events-none"
                style={{
                  left: `${(xAt / WIDTH) * 100}%`,
                  top: `${(1 - pAt) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
              <span
                className="absolute size-1.5 rounded-full bg-zinc-100 ring-1 ring-zinc-800 pointer-events-none"
                style={{
                  left: `${(xAt / WIDTH) * 100}%`,
                  top: `${pAt * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function Odds({ value }: { value: number | null }) {
  return (
    <m.span
      key={value ?? "pending"}
      className="tabular-nums"
      initial={{ opacity: 0.65 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
    >
      {value == null ? "…" : `${value}%`}
    </m.span>
  );
}

export default function WinProbability({ history }: { history: number[] }) {
  const [cursor, setCursor] = useState<number | null>(null);
  const pA = cursor == null ? history.at(-1) : history[cursor];
  const pctA = pA == null ? null : Math.round(pA * 100);
  const pctB = pctA == null ? null : 100 - pctA;

  return (
    <div
      className="flex flex-col gap-1 min-w-0 px-0.5 py-1 text-sm sm:text-lg text-zinc-300"
      role="status"
      aria-live="polite"
      aria-label={
        pctA == null
          ? "Win probability loading"
          : `Black win chance ${pctA} percent, white ${pctB} percent`
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="size-2.5 rounded-full bg-black ring-1 ring-zinc-500 shrink-0" />
          <Odds value={pctA} />
        </div>
        <div className="tabular-nums text-zinc-400 text-xs sm:text-base shrink-0">
          {pctA == null ? "…" : `${pctA}% – ${pctB}%`}
        </div>
        <div className="flex items-center justify-end gap-1.5 min-w-0">
          <Odds value={pctB} />
          <span className="size-2.5 rounded-full bg-white ring-1 ring-zinc-500 shrink-0" />
        </div>
      </div>
      <DualSpark values={history} cursor={cursor} onCursor={setCursor} />
    </div>
  );
}
