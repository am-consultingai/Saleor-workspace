// Branded slide layouts — the building blocks for every deck.
// Author a presentation by composing these in src/presentation/slides.tsx.
export { TitleSlide } from "./TitleSlide";
export type { TitleSlideProps } from "./TitleSlide";

export { SectionDivider } from "./SectionDivider";
export type { SectionDividerProps } from "./SectionDivider";

export { AgendaSlide } from "./AgendaSlide";
export type { AgendaSlideProps } from "./AgendaSlide";

export { BulletSlide } from "./BulletSlide";
export type { BulletSlideProps, Bullet } from "./BulletSlide";

export { ProcessSlide } from "./ProcessSlide";
export type { ProcessSlideProps, ProcessStep } from "./ProcessSlide";

export { DiagramSlide } from "./DiagramSlide";
export type { DiagramSlideProps, FlowNode } from "./DiagramSlide";

export { AboutSlide } from "./AboutSlide";
export type { AboutSlideProps, ServiceColumn } from "./AboutSlide";

export { QuoteSlide } from "./QuoteSlide";
export type { QuoteSlideProps } from "./QuoteSlide";

export { ClosingSlide } from "./ClosingSlide";
export type { ClosingSlideProps } from "./ClosingSlide";

// Lower-level primitives for custom slides.
export { SlideShell, Eyebrow, GradientText, Stat, Stagger, Item } from "../components/primitives";
export { brand } from "../theme/tokens";
