import type { ReactNode } from "react";
import { motion } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

type BgVariant = "base" | "deep" | "grid";

/**
 * Full-bleed 1280×720 slide background + standard padding. Every branded layout
 * builds on this; use it directly for one-off custom slides.
 */
export function SlideShell({
  children,
  bg = "base",
  className = "",
  glow = true,
}: {
  children: ReactNode;
  bg?: BgVariant;
  className?: string;
  glow?: boolean;
}) {
  const bgClass = bg === "deep" ? "bg-canvas-deep" : "bg-canvas";
  return (
    <section className={`relative h-full w-full overflow-hidden ${bgClass}`}>
      {bg === "grid" && <GridTexture />}
      {glow && <CornerGlow />}
      <div className={`relative z-10 flex h-full w-full flex-col px-20 py-16 ${className}`}>{children}</div>
    </section>
  );
}

/** Soft brand-colored radial glow in the top-right — the signature ambient light. */
function CornerGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-25 blur-3xl"
      style={{ background: "radial-gradient(circle, #38bdf8 0%, #818cf8 45%, transparent 70%)" }}
    />
  );
}

function GridTexture() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.06]"
      style={{
        backgroundImage:
          "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    />
  );
}

/** Uppercase, letter-spaced JetBrains Mono label — the brand "eyebrow" convention. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-sm font-medium uppercase tracking-[0.25em] text-cyan">{children}</span>
  );
}

/** Inline text painted with the cyan→sky→indigo brand gradient. */
export function GradientText({ children }: { children: ReactNode }) {
  return <span className="brand-gradient-text">{children}</span>;
}

/** A single credential/metric tile (e.g. "10+  AI Patents"). */
export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-tile px-6 py-5">
      <div className="font-display text-3xl font-semibold text-ink">{value}</div>
      <div className="mt-1 font-mono text-xs uppercase tracking-widest text-subtle">{label}</div>
    </div>
  );
}

// ---- Animation helpers --------------------------------------------------

const revealVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

/** Container that reveals its <Item> children in sequence when the slide enters. */
export function Stagger({
  children,
  className = "",
  gap = 0.09,
  delay = 0.12,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

/** A single staggered element. Must be rendered inside <Stagger>. */
export function Item({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={revealVariants}>
      {children}
    </motion.div>
  );
}
