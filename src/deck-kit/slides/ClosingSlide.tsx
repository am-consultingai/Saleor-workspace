import { brand } from "../theme/tokens";
import { GradientText, Item, SlideShell, Stagger } from "../components/primitives";

export interface ClosingSlideProps {
  headline?: string;
  highlight?: string;
  email?: string;
  website?: string;
  linkedin?: string;
}

/** Closing bookend — thank-you headline + contact details over the logo. */
export function ClosingSlide({
  headline = "Let's build",
  highlight = "AI-fueled systems.",
  email = brand.identity.email,
  website = brand.identity.websiteLabel,
  linkedin = brand.identity.linkedin,
}: ClosingSlideProps) {
  return (
    <SlideShell bg="deep" className="justify-center">
      <Stagger>
        <Item>
          <h2 className="font-display text-7xl font-bold tracking-tight text-ink">
            {headline} <GradientText>{highlight}</GradientText>
          </h2>
        </Item>
        <Item className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-3 font-mono text-base text-muted">
          <a href={`mailto:${email}`} className="transition hover:text-cyan">{email}</a>
          <a href={brand.identity.website} className="transition hover:text-cyan">{website}</a>
          <a href={linkedin} className="transition hover:text-cyan">/in/avishay-meron</a>
        </Item>
        <Item>
          <img src={brand.assets.logoLockup} alt={brand.identity.company} className="mt-16 h-14 w-auto opacity-90" />
        </Item>
      </Stagger>
    </SlideShell>
  );
}
