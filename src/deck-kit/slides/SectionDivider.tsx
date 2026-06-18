import { Eyebrow, GradientText, Item, SlideShell, Stagger } from "../components/primitives";

export interface SectionDividerProps {
  /** Section number shown oversized behind the title (e.g. "02"). */
  number?: string;
  eyebrow?: string;
  title: string;
  highlight?: string;
  subtitle?: string;
}

/** Full-bleed transition slide between major sections. */
export function SectionDivider({ number, eyebrow, title, highlight, subtitle }: SectionDividerProps) {
  return (
    <SlideShell bg="deep" className="justify-center">
      {number && (
        <span className="pointer-events-none absolute right-16 top-6 select-none font-display text-[280px] font-bold leading-none text-white/[0.04]">
          {number}
        </span>
      )}
      <Stagger>
        {eyebrow && (
          <Item className="mb-5">
            <Eyebrow>{eyebrow}</Eyebrow>
          </Item>
        )}
        <Item>
          <h2 className="max-w-4xl font-display text-6xl font-bold leading-tight tracking-tight text-ink">
            {title} {highlight && <GradientText>{highlight}</GradientText>}
          </h2>
        </Item>
        {subtitle && (
          <Item>
            <p className="mt-6 max-w-2xl text-xl font-light text-muted">{subtitle}</p>
          </Item>
        )}
      </Stagger>
    </SlideShell>
  );
}
