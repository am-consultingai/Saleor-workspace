/**
 * Third-party brand marks used on the intro slide, as inline SVG so they stay
 * crisp at any scale and need no network/assets. These are external brands, so
 * their official colors live here (not in the AM brand tokens).
 *
 * To swap in an official asset later, drop a PNG/SVG in public/brand/ and
 * replace the relevant component with an <img>.
 */
import { motion } from "motion/react";

/** Anthropic "Claude" clay/orange. */
export const CLAUDE_ORANGE = "#D97757";
/** Salesforce cloud blue. */
export const SALESFORCE_BLUE = "#00A1E0";

/**
 * The Claude sunburst mark, animated to echo the "thinking" indicator shown
 * while Claude works: a shimmer that travels around the star — each spoke
 * brightening and stretching in sequence, rather than a rigid spin.
 */
export function ClaudeMark({ size = 48 }: { size?: number }) {
  const N = 12;
  const cx = 50;
  const cy = 50;
  const inner = 12;
  const CYCLE = 1.6; // seconds for one shimmer to travel the full circle
  const spokes = Array.from({ length: N }, (_, i) => {
    const rad = ((i * 360) / N) * (Math.PI / 180);
    return {
      ux: Math.cos(rad),
      uy: Math.sin(rad),
      delay: (i / N) * CYCLE,
    };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-label="Claude">
      {spokes.map((s, i) => {
        // Animate the outer end between a short and long radius so the spoke
        // appears to grow, while opacity pulses — together they read as a
        // sparkle running around the ring.
        const short = 36;
        const long = 47;
        return (
          <motion.line
            key={i}
            x1={cx + inner * s.ux}
            y1={cy + inner * s.uy}
            stroke={CLAUDE_ORANGE}
            strokeWidth={7.5}
            strokeLinecap="round"
            initial={{ opacity: 0.3 }}
            animate={{
              x2: [cx + short * s.ux, cx + long * s.ux, cx + short * s.ux],
              y2: [cy + short * s.uy, cy + long * s.uy, cy + short * s.uy],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: CYCLE,
              times: [0, 0.25, 1],
              repeat: Infinity,
              ease: "easeInOut",
              delay: s.delay,
            }}
          />
        );
      })}
    </svg>
  );
}

/** GitHub Octocat mark (official silhouette path). */
export function GithubMark({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-label="GitHub">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/** Salesforce cloud mark (recognizable cloud silhouette). */
export function SalesforceMark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 38) / 56} viewBox="0 0 56 38" fill="none" aria-label="Salesforce">
      <path
        d="M23.6 8.1a9.6 9.6 0 0 1 6.9-2.9c3.6 0 6.8 2 8.4 5a8 8 0 0 1 3.3-.7 8.2 8.2 0 0 1 0 16.4c-.5 0-1-.05-1.5-.14a6 6 0 0 1-10.5 2.2 6.9 6.9 0 0 1-9.9 1.4 7.8 7.8 0 0 1-3.6.87 7.9 7.9 0 0 1-2.2-15.5A8.9 8.9 0 0 1 23.6 8.1Z"
        fill={SALESFORCE_BLUE}
      />
    </svg>
  );
}
