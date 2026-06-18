import type { ReactNode } from "react";
import { Eyebrow, Item, SlideShell, Stagger } from "../components/primitives";

export type Bullet = string | { title: string; desc?: string };

export interface BulletSlideProps {
  eyebrow?: string;
  title: string;
  /** Optional supporting line under the title. */
  lead?: string;
  bullets: Bullet[];
  /** Optional element rendered on the right half (image, chart, code, demo). */
  aside?: ReactNode;
}

/** Standard content slide: heading + progressively-revealed bullets, with an
 *  optional right-hand column for an image or interactive element. */
export function BulletSlide({ eyebrow, title, lead, bullets, aside }: BulletSlideProps) {
  return (
    <SlideShell>
      <Stagger className="flex h-full flex-col">
        {eyebrow && (
          <Item className="mb-2">
            <Eyebrow>{eyebrow}</Eyebrow>
          </Item>
        )}
        <Item>
          <h2 className="font-display text-5xl font-bold tracking-tight text-ink">{title}</h2>
        </Item>
        {lead && (
          <Item>
            <p className="mt-3 max-w-3xl text-xl font-light text-muted">{lead}</p>
          </Item>
        )}

        <div className={`mt-10 grid flex-1 gap-12 ${aside ? "grid-cols-2" : "grid-cols-1"}`}>
          <ul className="flex flex-col gap-5">
            {bullets.map((b, i) => {
              const item = typeof b === "string" ? { title: b } : b;
              return (
                <Item key={i}>
                  <li className="flex gap-4">
                    <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full brand-gradient" />
                    <div>
                      <span className="text-2xl font-medium text-ink">{item.title}</span>
                      {item.desc && <p className="mt-1 text-lg font-light text-subtle">{item.desc}</p>}
                    </div>
                  </li>
                </Item>
              );
            })}
          </ul>
          {aside && (
            <Item className="flex items-center justify-center">
              <div className="w-full">{aside}</div>
            </Item>
          )}
        </div>
      </Stagger>
    </SlideShell>
  );
}
