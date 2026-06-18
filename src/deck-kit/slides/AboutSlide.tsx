import { brand } from "../theme/tokens";
import { Eyebrow, GradientText, Item, SlideShell, Stagger, Stat } from "../components/primitives";

export interface ServiceColumn {
  heading: string;
  items: string[];
}

export interface AboutSlideProps {
  eyebrow?: string;
  /** Defaults to the brand principal + role. */
  principal?: string;
  role?: string;
  /** Short positioning line. Defaults to the brand tagline. */
  blurb?: string;
  /** Credential tiles. Defaults to the brand stats block. */
  stats?: { value: string; label: string }[];
  /** Service / offering columns (the four-quadrant "About us" pattern). */
  services?: ServiceColumn[];
}

/** "About us" bookend — principal, positioning, credential stats, and services. */
export function AboutSlide({
  eyebrow = "About",
  principal = brand.identity.principal,
  role = brand.identity.role,
  blurb = brand.identity.tagline,
  stats = brand.stats as unknown as { value: string; label: string }[],
  services,
}: AboutSlideProps) {
  return (
    <SlideShell>
      <Stagger className="flex h-full flex-col">
        <Item className="mb-2">
          <Eyebrow>{eyebrow}</Eyebrow>
        </Item>
        <Item>
          <h2 className="font-display text-5xl font-bold tracking-tight text-ink">
            {principal} <span className="text-subtle">· {role}</span>
          </h2>
        </Item>
        <Item>
          <p className="mt-4 max-w-3xl font-display text-2xl font-light leading-snug text-muted">
            <GradientText>{blurb}</GradientText>
          </p>
        </Item>

        <Item className="mt-8 grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <Stat key={s.label} value={s.value} label={s.label} />
          ))}
        </Item>

        {services && (
          <div className="mt-8 grid flex-1 grid-cols-2 gap-x-12 gap-y-5">
            {services.map((col) => (
              <Item key={col.heading}>
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">{col.heading}</div>
                <ul className="mt-2 space-y-1.5">
                  {col.items.map((it) => (
                    <li key={it} className="text-lg font-light text-muted">{it}</li>
                  ))}
                </ul>
              </Item>
            ))}
          </div>
        )}
      </Stagger>
    </SlideShell>
  );
}
