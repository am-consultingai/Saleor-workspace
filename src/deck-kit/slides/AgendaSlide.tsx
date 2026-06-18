import { Eyebrow, Item, SlideShell, Stagger } from "../components/primitives";

export interface AgendaSlideProps {
  eyebrow?: string;
  title?: string;
  items: string[];
}

/** Numbered agenda / table-of-contents list. */
export function AgendaSlide({ eyebrow = "Agenda", title = "What we'll cover", items }: AgendaSlideProps) {
  return (
    <SlideShell>
      <Stagger className="flex h-full flex-col">
        <Item className="mb-2">
          <Eyebrow>{eyebrow}</Eyebrow>
        </Item>
        <Item>
          <h2 className="mb-10 font-display text-5xl font-bold tracking-tight text-ink">{title}</h2>
        </Item>
        <div className="flex flex-col gap-4">
          {items.map((item, i) => (
            <Item key={item}>
              <div className="flex items-center gap-6 border-b border-white/5 pb-4">
                <span className="font-mono text-lg font-medium text-cyan">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-2xl font-light text-muted">{item}</span>
              </div>
            </Item>
          ))}
        </div>
      </Stagger>
    </SlideShell>
  );
}
