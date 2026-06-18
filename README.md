# AM Consulting — Interactive Presentation Template

A template for building modern, interactive, web-based presentations on the
AM Consulting brand. Built with Vite + React + TypeScript, Tailwind CSS, and
Motion. Deploys to GitHub Pages.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

Navigate: **→ / Space / click** next · **←** back · **F** fullscreen · **?** help.

## Make a new presentation

Clone the template, then initialize it as a new deck:

```bash
git clone <template-url> my-talk      # or "Use this template" → clone
cd my-talk
./scripts/init-presentation.sh -n my-talk
```

`init-presentation.sh` renames the folder, detaches from the template remote,
creates a new public GitHub repo, pushes, and enables GitHub Pages — without
touching the template. Then:

1. `npm install && npm run dev`
2. Edit **`src/presentation/slides.tsx`** — the only file you need to touch.
3. Push to `main` → deploys automatically to `https://<owner>.github.io/my-talk/`.

See [`CLAUDE.md`](./CLAUDE.md) for the full authoring guide and layout reference
— it's also the brief an AI agent reads to build a deck for you.

## Structure

```
src/
  deck-kit/            reusable, branded toolkit (don't edit per-deck)
    theme/tokens.ts    brand colors, fonts, identity
    engine/Deck.tsx    navigation + scaling + transitions
    slides/            branded layouts (Title, Bullet, Diagram, …)
  presentation/
    slides.tsx         ← YOUR deck content
references/brand/      source brand guide, tokens, and logo assets
```

## Build

```bash
npm run build    # → dist/
npm run preview  # preview the production build
```
