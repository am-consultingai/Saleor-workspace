# Agent instructions

This is a **base template** for generating AM Consulting web presentations.

👉 **Read [`CLAUDE.md`](./CLAUDE.md)** — it is the authoritative guide for
duplicating this template and authoring a deck.

TL;DR for creating a presentation from custom content:

1. Duplicate this repo (see CLAUDE.md → "Create a new presentation").
2. `npm install`.
3. Edit **only** `src/presentation/slides.tsx` — compose branded layouts from
   `src/deck-kit/slides` into the `slides` array.
4. Never hardcode colors or fonts; the brand lives in `src/deck-kit/theme`.
5. `npm run build` to type-check, `npm run dev` to preview, then deploy via
   GitHub Pages (push to `main`).
