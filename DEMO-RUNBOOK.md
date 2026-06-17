# Demo runbook — WITH vs WITHOUT the large-codebase setup

Goal: run the **same** sustainability-label prompt twice — once with the
workspace context artifacts, once without — and show that the setup produces a
clean cross-repo result while the bare repo ping-pongs.

The only variable between the two runs is the **overlay git branch**:

| Branch      | Condition | What's present                                   |
|-------------|-----------|--------------------------------------------------|
| `main`      | **WITH**  | `CLAUDE.md`, `arch/`, `.claude/` (command+agent) |
| `no-setup`  | **WITHOUT** | none of the above — bare repos only            |

The child repos (`saleor/`, etc.) are git-ignored, so they survive branch
switches untouched. Only the model-facing artifacts swap.

## Per-take sequence

```bash
# 1. restore the code to baseline
./reset-children.sh

# 2. set the condition
git checkout main         # WITH      (or: git checkout no-setup  for WITHOUT)

# 3. fresh session, SAME model, paste prompt.txt
claude
#   -> paste the contents of prompt.txt
```

Run **WITHOUT first** (let it flail — that's the drama), then **WITH**.

## Keep these constant or it isn't a fair test
- **Same model** in both runs.
- **Same mode** — if you use plan mode (Shift+Tab) for the "give me your plan"
  step, use it in both.
- **Fresh session** each run (don't `/resume`); reset children between runs.
- Watch **leakage** into the WITHOUT run:
  - `~/.claude/CLAUDE.md` or user-scope agents/commands load in *both* — move
    them aside for the demo.
  - `.claude/settings.local.json` is gitignored, so it stays on disk on the
    `no-setup` branch too. It only holds personal permissions (no architectural
    context), so it's low-risk, but rename it to `.claude/settings.local.json.bak`
    if you want a truly bare baseline.

## Fallback: pre-baked sessions
Run both takes ahead of time in this directory; both transcripts become
available via `/resume`. If a live attempt goes sideways, `/resume` the matching
pre-baked session and narrate it. Make the first line of the prompt identifiable
so the two are easy to tell apart in the resume list.

## What "different results" looks like
- **WITHOUT:** vague plan with no clean precedent to grep; may model the label as
  free text instead of a typed enum; regenerates the dashboard client against the
  pinned `3.23` GitHub schema (which lacks the new enum) → `check-types` fails;
  may wander into git-ignored `saleor-platform`.
- **WITH:** consults `arch/`; models a typed enum across model → GraphQL type →
  input → dashboard select → storefront badge; regenerates each client from the
  live API; finishes clean.

*(AI runs vary — confirm this against your first real WITHOUT take.)*
