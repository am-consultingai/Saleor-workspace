import type { ReactNode } from "react";

/**
 * A slide is just a React node that fills the 1280×720 stage.
 * Compose them from the branded layouts in ../slides (TitleSlide, BulletSlide, …),
 * which already carry the AM Consulting theme. The Deck supplies the frame,
 * scaling, navigation, and transitions.
 */
export type Slide = ReactNode;

/** Fixed design dimensions of the stage. Layouts are authored against these. */
export const STAGE_WIDTH = 1280;
export const STAGE_HEIGHT = 720;
