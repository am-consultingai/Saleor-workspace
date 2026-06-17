# Experiment: does the large-codebase setup actually help?

This workspace ships a built-in A/B experiment. You run the **same** coding task
twice — once **with** the cross-repo context artifacts and once **without** — and
watch the difference. It's the live proof behind the workshop's claim: on a
polyrepo, engineering the context (a `CLAUDE.md` hierarchy, a pre-computed `arch/`
map, shared `.claude/` commands + agents) produces better results, fewer wrong
turns, and less AI ping-pong than throwing the task at the bare repos.

> **The task:** add a per-product "sustainability label" feature — a merchandiser
> picks a label from a fixed set (None / Recycled / Organic / Fair Trade) and the
> storefront product page shows a matching badge. It deliberately spans all three
> code repos through the GraphQL contract (backend schema → dashboard admin →
> storefront UI) as a **typed enum**, so a partial answer is visibly wrong — and
> unlike a plain nullable scalar, an enum has no clean in-repo precedent to grep
> onto and trips the dashboard's pinned-schema codegen. The exact wording lives
> in [`prompt.txt`](./prompt.txt).

---

## The one variable: the overlay git branch

The child repos (`saleor/`, `saleor-dashboard/`, `storefront/`, `saleor-platform/`)
are git-ignored, so they survive branch switches untouched. Only the model-facing
artifacts swap when you change branch:

| Branch      | Condition   | What the model sees                                       |
|-------------|-------------|----------------------------------------------------------|
| `main`      | **WITH**    | `CLAUDE.md` (incl. the `arch/` pointer + GraphQL contract), the `arch/<repo>.md` maps, `.claude/` command + agent |
| `no-setup`  | **WITHOUT** | nothing of the above — just the bare child repos         |

Everything else — the code, the model, the prompt — is held identical. That's what
makes it a fair test.

---

## One-time setup (first run on a machine)

1. **Get the child repos in place** (they are not tracked by this overlay):
   ```bash
   ./clone-all.sh
   ```
   To actually *see* the storefront result later, bring up the stack instead:
   ```bash
   ./bootstrap.sh        # clones, builds, migrates, seeds, and starts everything
   ```

2. **Confirm the artifacts exist on `main`:**
   ```bash
   git checkout main
   ls CLAUDE.md arch/          # arch/ should contain one <repo>.md per repo
   ```
   If `arch/` is missing or stale, regenerate it (this is itself a nice thing to
   demo — it fans out one subagent per repo):
   ```bash
   claude        # then run:  /investigate
   ```

3. **Check the baseline commits** in [`children.lock`](./children.lock) match your
   checkouts. If you cloned fresh and the pins don't match, update that file to your
   current child `HEAD`s (one line per repo: `<folder> <sha> <branch>`).

---

## Running the experiment

Do the **WITHOUT** run first (let it struggle — that's the point), then **WITH**.

### Each take, in order

```bash
# 1. restore all child repos to the pinned baseline
./reset-children.sh

# 2. select the condition
git checkout no-setup      # WITHOUT      (use:  git checkout main   for WITH)

# 3. start a FRESH Claude session at the workspace root
claude
#    -> paste the entire contents of prompt.txt
```

The prompt asks the model to **state its plan before coding**. That plan is where
the difference shows up first and fastest — you don't even have to wait for the
implementation to see it.

### Hold these constant (or it isn't a fair test)
- **Same model** in both runs (set it explicitly each time).
- **Same mode** — if you use plan mode (Shift+Tab) for the planning step, use it in
  both runs.
- **Fresh session** each run — start a new one, don't `/resume` a previous take.
- **Reset the children** (`./reset-children.sh`) before every run.
- **Watch user-scope leakage:** anything in your `~/.claude/` (a global
  `CLAUDE.md`, user agents/commands) loads into **both** runs, including WITHOUT —
  move it aside so the baseline is genuinely bare.

---

## What to watch for

| | WITHOUT (`no-setup`) | WITH (`main`) |
|---|---|---|
| **The plan** | vague — no clean scalar precedent to grep, so it may model the label as free text, miss that it must be a typed enum, or skip how the new enum reaches each client | models a typed enum end to end (model choices → GraphQL `Enum` → input → dashboard select → storefront label map) and names the per-client codegen step **and its schema source** |
| **Behavior** | greps for a precedent (none clean); may hand-edit the dashboard's committed schema or regenerate against the pinned `3.23` GitHub schema; may wander into git-ignored `saleor-platform` | consults `arch/`, regenerates the dashboard client from the **live** API, honors the "check downstream before declaring done" rule |
| **End state** | backend + storefront may compile, but the dashboard codegens against a schema without the new enum → `check-types` fails / badge never renders → back-and-forth to patch | full round-trip; the badge renders on the product page |

*(Predicted divergence — AI runs are non-deterministic, so confirm against your
first real WITHOUT take rather than assuming it.)*

**Definition of done** (from the prompt): the badge actually renders on the
storefront product page, driven by a per-product label set in the admin. A
backend-only result, or one where the dashboard can't set the label, is a
*fail* — that asymmetry is the whole demonstration.

---

## Verifying the end result (optional, more convincing)

If you brought the stack up with `./bootstrap.sh`, after a run you can check the
storefront in a browser to see the badge live. Notes:
- The API host port defaults to **8001** (not 8000); browser URLs derive from it.
- See `dev/README.md` for ports and the image-URL / SSR gotchas.

---

## Resetting and fallbacks

- **Between takes:** `./reset-children.sh` (keeps `node_modules`; add `--deep` for a
  scorched-earth clean that also removes gitignored files).
- **Pre-baked safety net:** run both takes ahead of time in this directory. Both
  transcripts then appear in `/resume`, so if a live attempt goes sideways you can
  reopen the matching pre-recorded session and narrate it. (AI runs are
  non-deterministic — a single live run can get lucky or unlucky, so a recorded
  good take is worth having.)

---

## File reference

| File | Role |
|---|---|
| `prompt.txt` | The identical task pasted into both runs |
| `reset-children.sh` | Restores child repos to the pinned baseline between takes |
| `children.lock` | The pinned baseline commit per child repo |
| `CLAUDE.md` | Cross-repo overview + GraphQL contract + the `arch/` pointer (WITH only) |
| `arch/<repo>.md` | Pre-computed per-repo architecture maps (WITH only) |
| `.claude/` | Shared `/investigate` command + `repo-investigator` agent (WITH only) |
| `DEMO-RUNBOOK.md` | The condensed presenter checklist |
