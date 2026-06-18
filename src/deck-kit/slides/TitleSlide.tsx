import { brand } from "../theme/tokens";
import { Eyebrow, GradientText, Item, SlideShell, Stagger } from "../components/primitives";

export interface TitleSlideProps {
  /** Small mono label above the title (e.g. "WORKSHOP"). */
  eyebrow?: string;
  title: string;
  /** Optional trailing fragment of the title rendered in the brand gradient. */
  highlight?: string;
  subtitle?: string;
  presenter?: string;
  role?: string;
  date?: string;
}

/** Opening slide. Logo lockup, large headline, presenter + date footer. */
export function TitleSlide({
  eyebrow,
  title,
  highlight,
  subtitle,
  presenter = brand.identity.principal,
  role = brand.identity.role,
  date,
}: TitleSlideProps) {
  return (
    <SlideShell bg="grid" className="justify-center">
      <Stagger>
        <Item>
          <img src={brand.assets.logoLockup} alt={brand.identity.company} className="mb-12 h-16 w-auto" />
        </Item>
        {eyebrow && (
          <Item className="mb-5">
            <Eyebrow>{eyebrow}</Eyebrow>
          </Item>
        )}
        <Item>
          <h1 className="max-w-4xl font-display text-7xl font-bold leading-[1.05] tracking-tight text-ink">
            {title} {highlight && <GradientText>{highlight}</GradientText>}
          </h1>
        </Item>
        {subtitle && (
          <Item>
            <p className="mt-6 max-w-2xl text-2xl font-light text-muted">{subtitle}</p>
          </Item>
        )}
        <Item className="mt-14 flex items-center gap-4 text-base">
          <span className="font-display font-semibold text-ink">{presenter}</span>
          <span className="text-white/20">·</span>
          <span className="text-subtle">{role}</span>
          {date && (
            <>
              <span className="text-white/20">·</span>
              <span className="font-mono text-sm uppercase tracking-widest text-subtle">{date}</span>
            </>
          )}
        </Item>
      </Stagger>
    </SlideShell>
  );
}
