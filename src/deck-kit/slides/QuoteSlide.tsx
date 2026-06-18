import { GradientText, Item, SlideShell, Stagger } from "../components/primitives";

export interface QuoteSlideProps {
  quote: string;
  /** Optional fragment of the quote painted in the brand gradient. */
  highlight?: string;
  attribution?: string;
}

/** A single large statement — ideal for a brand tagline or key takeaway. */
export function QuoteSlide({ quote, highlight, attribution }: QuoteSlideProps) {
  return (
    <SlideShell bg="deep" className="justify-center">
      <Stagger>
        <Item>
          <span className="font-display text-8xl leading-none text-cyan/30">“</span>
        </Item>
        <Item>
          <blockquote className="-mt-6 max-w-5xl font-display text-5xl font-medium leading-[1.2] tracking-tight text-ink">
            {quote} {highlight && <GradientText>{highlight}</GradientText>}
          </blockquote>
        </Item>
        {attribution && (
          <Item>
            <p className="mt-8 font-mono text-sm uppercase tracking-[0.25em] text-subtle">— {attribution}</p>
          </Item>
        )}
      </Stagger>
    </SlideShell>
  );
}
