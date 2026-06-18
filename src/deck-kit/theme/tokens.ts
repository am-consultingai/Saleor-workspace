/**
 * AM Consulting brand tokens — SINGLE SOURCE OF TRUTH (programmatic).
 *
 * Mirrors references/brand/brand-tokens.json (the authoritative brand guide).
 * The same values are declared as CSS variables / Tailwind utilities in
 * src/index.css (@theme). Use Tailwind classes for styling; use this object
 * when you need a brand value in JS (e.g. Motion animations, inline SVG fills).
 *
 * DO NOT hardcode hex values or font names in slides. Always reference brand.
 */
export const brand = {
  colors: {
    bg: { base: "#0b0f19", deep: "#070b13", card: "#0d1321", tile: "#0b101c" },
    text: { primary: "#f3f4f6", muted: "#cbd5e1", subtle: "#94a3b8" },
    accent: { cyan: "#22d3ee", sky: "#38bdf8", indigo: "#818cf8" },
    status: { good: "#10b981", bad: "#ef4444" },
  },
  gradient: "linear-gradient(to right, #22d3ee, #38bdf8, #818cf8)",
  fonts: {
    display: '"Space Grotesk", system-ui, sans-serif',
    sans: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  identity: {
    company: "AM Consulting",
    principal: "Avishay Meron",
    role: "CEO & Founder",
    website: "https://www.amconsultingai.com",
    websiteLabel: "amconsultingai.com",
    email: "office@amconsultingai.com",
    linkedin: "https://www.linkedin.com/in/avishay-meron/",
    tagline: "The model is rarely the hard part — the system around it is.",
  },
  taglines: [
    "The model is rarely the hard part — the system around it is.",
    "Stop reaching for GenAI by default. Start designing AI-fueled systems.",
    "From 'which model?' to 'which system?'",
  ],
  stats: [
    { value: "10+", label: "AI Patents" },
    { value: "10+", label: 'Years "taming AI"' },
    { value: "CEO & Founder", label: "AM Consulting" },
  ],
  assets: {
    // Resolved against Vite's BASE_URL so they work at any deploy path.
    logoLockup: `${import.meta.env.BASE_URL}brand/logo-lockup.png`,
    logoMark: `${import.meta.env.BASE_URL}brand/logo-mark.png`,
  },
} as const;

export type Brand = typeof brand;
