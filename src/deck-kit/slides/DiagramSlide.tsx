import { Eyebrow, Item, SlideShell, Stagger } from "../components/primitives";

export interface FlowNode {
  label: string;
  sub?: string;
}

export interface DiagramSlideProps {
  eyebrow?: string;
  title: string;
  /** Boxes laid out left→right, joined by gradient arrows. */
  nodes: FlowNode[];
  /** Optional caption under the flow. */
  caption?: string;
}

/** Horizontal box-and-arrow flow diagram (e.g. User → MCP Server → API). */
export function DiagramSlide({ eyebrow, title, nodes, caption }: DiagramSlideProps) {
  return (
    <SlideShell bg="grid">
      <Stagger className="flex h-full flex-col">
        {eyebrow && (
          <Item className="mb-2">
            <Eyebrow>{eyebrow}</Eyebrow>
          </Item>
        )}
        <Item>
          <h2 className="font-display text-5xl font-bold tracking-tight text-ink">{title}</h2>
        </Item>

        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-stretch gap-2">
            {nodes.map((node, i) => (
              <div key={i} className="flex items-center gap-2">
                <Item>
                  <div className="min-w-[200px] rounded-2xl border border-white/10 bg-panel px-7 py-6 text-center shadow-lg">
                    <div className="text-2xl font-semibold text-ink">{node.label}</div>
                    {node.sub && <div className="mt-1.5 font-mono text-xs uppercase tracking-widest text-subtle">{node.sub}</div>}
                  </div>
                </Item>
                {i < nodes.length - 1 && (
                  <Item>
                    <Arrow />
                  </Item>
                )}
              </div>
            ))}
          </div>
        </div>

        {caption && (
          <Item>
            <p className="text-center text-lg font-light text-subtle">{caption}</p>
          </Item>
        )}
      </Stagger>
    </SlideShell>
  );
}

function Arrow() {
  return (
    <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="shrink-0">
      <defs>
        <linearGradient id="arrowGrad" x1="0" y1="0" x2="48" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <path d="M2 12h40" stroke="url(#arrowGrad)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M36 5l8 7-8 7" stroke="url(#arrowGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
