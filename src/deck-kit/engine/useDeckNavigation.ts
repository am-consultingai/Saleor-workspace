import { useCallback, useEffect, useRef, useState } from "react";

export interface DeckNav {
  index: number;
  total: number;
  /** +1 when moving forward, -1 when moving back — used to direct transitions. */
  direction: number;
  go: (index: number) => void;
  next: () => void;
  prev: () => void;
}

function readIndexFromHash(total: number): number {
  const match = window.location.hash.match(/#\/(\d+)/);
  if (!match) return 0;
  const oneBased = Number.parseInt(match[1], 10);
  if (Number.isNaN(oneBased)) return 0;
  return Math.min(Math.max(oneBased - 1, 0), Math.max(total - 1, 0));
}

/**
 * Drives slide position from the URL hash (#/<1-based>), so every slide is
 * deep-linkable and the back/forward buttons work. Binds keyboard + provides
 * go/next/prev for click and on-screen controls.
 */
export function useDeckNavigation(total: number): DeckNav {
  const [index, setIndex] = useState(() => readIndexFromHash(total));
  const [direction, setDirection] = useState(0);
  const indexRef = useRef(index);
  indexRef.current = index;

  const go = useCallback(
    (target: number) => {
      const clamped = Math.min(Math.max(target, 0), total - 1);
      // Setting the hash triggers the hashchange listener, which updates state.
      window.location.hash = `#/${clamped + 1}`;
    },
    [total],
  );

  const next = useCallback(() => go(indexRef.current + 1), [go]);
  const prev = useCallback(() => go(indexRef.current - 1), [go]);

  // Ensure the hash reflects the initial slide on first load.
  useEffect(() => {
    if (!window.location.hash) window.location.replace(`#/${index + 1}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const nextIndex = readIndexFromHash(total);
      setDirection(nextIndex >= indexRef.current ? 1 : -1);
      setIndex(nextIndex);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "Home":
          e.preventDefault();
          go(0);
          break;
        case "End":
          e.preventDefault();
          go(total - 1);
          break;
        case "f":
        case "F":
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen?.();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, go, total]);

  return { index, total, direction, go, next, prev };
}
