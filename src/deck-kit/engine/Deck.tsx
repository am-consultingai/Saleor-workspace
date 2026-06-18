import { useEffect, useLayoutEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { brand } from "../theme/tokens";
import { STAGE_HEIGHT, STAGE_WIDTH, type Slide } from "./types";
import { useDeckNavigation } from "./useDeckNavigation";

/** Scales the fixed 1280×720 stage to fit the viewport while preserving 16:9. */
function useStageScale() {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const compute = () =>
      setScale(Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT));
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);
  return scale;
}

const transition = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };
// Crossfade + a hair of zoom. No horizontal translation, so a slide never
// exposes an edge against the stage mid-transition (which read as a vertical
// "seam" line when navigating). Slides always cover the full frame.
const variants = {
  enter: { opacity: 0, scale: 1.015 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.015 },
};

export function Deck({ slides }: { slides: Slide[] }) {
  const nav = useDeckNavigation(slides.length);
  const scale = useStageScale();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "?") setShowHelp((s) => !s);
      if (e.key === "Escape") setShowHelp(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-canvas-deep">
      {/* Scaled, centered 16:9 stage */}
      <div className="absolute inset-0 grid place-items-center">
        <div
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
          className="relative shrink-0 overflow-hidden bg-canvas"
        >
          <AnimatePresence initial={false} mode="sync">
            <motion.div
              key={nav.index}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className="absolute inset-0"
            >
              {slides[nav.index]}
            </motion.div>
          </AnimatePresence>

          {/* Persistent chrome (logo, progress, counter) */}
          <Chrome index={nav.index} total={nav.total} />
        </div>
      </div>

      {/* Click zones: left third = back, right two-thirds = forward */}
      <button
        aria-label="Previous slide"
        tabIndex={-1}
        onClick={(e) => {
          e.currentTarget.blur();
          nav.prev();
        }}
        className="absolute inset-y-0 left-0 w-1/4 cursor-w-resize bg-transparent outline-none focus:outline-none focus-visible:outline-none"
      />
      <button
        aria-label="Next slide"
        tabIndex={-1}
        onClick={(e) => {
          e.currentTarget.blur();
          nav.next();
        }}
        className="absolute inset-y-0 right-0 w-3/4 cursor-e-resize bg-transparent outline-none focus:outline-none focus-visible:outline-none"
      />

      <HelpHint onClick={() => setShowHelp((s) => !s)} />
      <AnimatePresence>{showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}</AnimatePresence>
    </div>
  );
}

function Chrome({ index, total }: { index: number; total: number }) {
  const progress = total > 1 ? index / (total - 1) : 1;
  return (
    <>
      {/* top progress bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-transparent">
        <motion.div
          className="brand-gradient h-full"
          animate={{ width: `${progress * 100}%` }}
          transition={transition}
        />
      </div>
      {/* logo mark, bottom-left */}
      <img
        src={brand.assets.logoLockup}
        alt={brand.identity.company}
        className="pointer-events-none absolute bottom-7 left-9 h-7 w-auto opacity-80"
      />
      {/* slide counter, bottom-right */}
      <div className="pointer-events-none absolute bottom-7 right-9 font-mono text-sm tracking-widest text-subtle">
        {String(index + 1).padStart(2, "0")}
        <span className="text-white/25"> / {String(total).padStart(2, "0")}</span>
      </div>
    </>
  );
}

function HelpHint({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/40 px-3 py-1 font-mono text-xs text-subtle backdrop-blur transition hover:text-ink"
    >
      ? keys
    </button>
  );
}

function HelpOverlay({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ["→ / Space / Click", "Next slide"],
    ["← / Click left edge", "Previous slide"],
    ["Home / End", "First / last slide"],
    ["F", "Toggle fullscreen"],
    ["?", "Toggle this help"],
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 z-20 grid place-items-center bg-black/70 backdrop-blur-sm"
    >
      <div className="rounded-2xl border border-white/10 bg-panel p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 font-display text-lg text-ink">Keyboard & navigation</h2>
        <dl className="space-y-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-8">
              <dt className="font-mono text-sm text-cyan">{k}</dt>
              <dd className="text-sm text-muted">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </motion.div>
  );
}
