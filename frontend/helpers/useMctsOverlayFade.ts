import { useEffect, useState } from "react";

export const MCTS_OVERLAY_FADE_MS = 240;

type BoardKeyed = { boardStr: string; turnStr: string };

/** Keeps the MCTS map visible while fading out on the same board position. */
export function useMctsOverlayFade<T extends BoardKeyed>(
  active: boolean,
  snapshot: T | null,
  boardKey: string,
  fadeMs = MCTS_OVERLAY_FADE_MS
) {
  const [rendered, setRendered] = useState<T | null>(null);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (active && snapshot) {
      const frame = window.requestAnimationFrame(() => {
        setRendered(snapshot);
        setOpacity(1);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const fadeFrame = window.requestAnimationFrame(() => setOpacity(0));
    const id = window.setTimeout(() => setRendered(null), fadeMs);
    return () => {
      window.cancelAnimationFrame(fadeFrame);
      window.clearTimeout(id);
    };
  }, [active, snapshot, fadeMs]);

  const renderedKey = rendered
    ? `${rendered.boardStr}:${rendered.turnStr}`
    : null;
  const onCurrentBoard = renderedKey === boardKey;
  const overlayOpacity =
    active && snapshot ? 1 : onCurrentBoard ? opacity : 0;

  return {
    renderedSnapshot: onCurrentBoard ? rendered : null,
    overlayOpacity,
  };
}
