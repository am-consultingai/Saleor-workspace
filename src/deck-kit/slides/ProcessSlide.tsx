import { Eyebrow, Item, SlideShell, Stagger } from "../components/primitives";

export interface ProcessStep {
  title: string;
  desc?: string;
}

export interface ProcessSlideProps {
  eyebrow?: string;
  title: string;
  steps: ProcessStep[];
}

/** Numbered, sequential steps connected by a vertical spine — for workflows
 *  and "here's the recipe" slides (e.g. a multi-step agent task). */
export function ProcessSlide({ eyebrow, title, steps }: ProcessSlideProps) {
  return (
    <SlideShell>
      <Stagger className="flex h-full flex-col">
        {eyebrow && (
          <Item className="mb-2">
            <Eyebrow>{eyebrow}</Eyebrow>
          </Item>
        )}
        <Item>
          <h2 className="mb-10 font-display text-5xl font-bold tracking-tight text-ink">{title}</h2>
        </Item>
        <div className="relative flex flex-col gap-5 pl-2">
          {steps.map((step, i) => (
            <Item key={i}>
              <div className="flex items-start gap-5">
                <div className="relative flex flex-col items-center">
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-cyan/40 bg-tile font-mono text-sm font-semibold text-cyan">
                    {i + 1}
                  </span>
                  {i < steps.length - 1 && <span className="mt-1 h-7 w-px bg-white/10" />}
                </div>
                <div className="pt-1.5">
                  <span className="text-2xl font-medium text-ink">{step.title}</span>
                  {step.desc && <p className="mt-1 text-lg font-light text-subtle">{step.desc}</p>}
                </div>
              </div>
            </Item>
          ))}
        </div>
      </Stagger>
    </SlideShell>
  );
}
