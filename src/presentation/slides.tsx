/**
 * THE DECK CONTENT — this is the only file you edit to create a presentation.
 *
 * Built from PRESENTATION-FLOW.md: "Working with Polyrepos using Claude + GitHub."
 * Spine: prompting → context engineering — give the model all the context it
 * needs and no more. Polyrepos are where that stops being optional.
 *
 * Compose branded layouts from "../deck-kit/slides". Each array entry is one
 * slide. Run `npm run dev` and use → / click to advance.
 */
import { Fragment, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Slide } from "../deck-kit/engine/types";
import {
  AgendaSlide,
  brand,
  BulletSlide,
  ClosingSlide,
  DiagramSlide,
  Eyebrow,
  GradientText,
  Item,
  ProcessSlide,
  SectionDivider,
  SlideShell,
  Stagger,
} from "../deck-kit/slides";
import { ClaudeMark, CLAUDE_ORANGE, GithubMark, SalesforceMark } from "./Logos";

/**
 * Slide 4 — "So… what do we do with large codebases?" One repo box spawns into
 * many, accelerating, while a live counter climbs 1 → 4 → 10 → 42 → 300+. The
 * field overflows on purpose: a polyrepo doesn't fit in one view.
 */
const REPO_STAGES = [
  { count: "1", boxes: 1, size: 104 },
  { count: "4", boxes: 4, size: 80 },
  { count: "10", boxes: 10, size: 58 },
  { count: "42", boxes: 42, size: 32 },
  { count: "300+", boxes: 78, size: 21 },
];

function LargeCodebasesSlide() {
  const [i, setI] = useState(0);

  useEffect(() => {
    // Accelerating cadence, then a long hold on "300+" before it loops.
    const delays = [950, 800, 650, 520, 2600];
    let idx = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      timer = setTimeout(() => {
        idx = (idx + 1) % REPO_STAGES.length;
        setI(idx);
        tick();
      }, delays[idx]);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  const stage = REPO_STAGES[i];

  return (
    <SlideShell bg="deep">
      <Stagger className="flex h-full flex-col">
        <Item className="mb-2">
          <Eyebrow>The question</Eyebrow>
        </Item>
        <Item>
          <h2 className="max-w-4xl font-display text-6xl font-bold leading-tight tracking-tight text-ink">
            So… what do we do with <GradientText>large codebases?</GradientText>
          </h2>
        </Item>

        <Item className="mt-8 grid flex-1 grid-cols-[260px_1fr] items-center gap-12">
          {/* Live counter */}
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-subtle">repos in scope</div>
            <div className="relative mt-2 h-24">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={stage.count}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -16, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className="absolute font-display text-8xl font-bold leading-none"
                >
                  <GradientText>{stage.count}</GradientText>
                </motion.div>
              </AnimatePresence>
            </div>
            <p className="mt-4 max-w-[220px] text-base font-light text-subtle">
              Too much to hold in one window — that's the whole problem.
            </p>
          </div>

          {/* Spawning repo field */}
          <div className="flex h-[360px] flex-wrap content-center items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-panel/40 p-6">
            <AnimatePresence mode="popLayout">
              {Array.from({ length: stage.boxes }, (_, b) => (
                <motion.div
                  key={b}
                  layout
                  initial={{ width: 0, height: 0, opacity: 0 }}
                  animate={{ width: stage.size, height: stage.size, opacity: 1 }}
                  exit={{ width: 0, height: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-cyan/30 bg-tile"
                >
                  {stage.size >= 58 && (
                    <span className="font-mono text-[11px] tracking-wide text-cyan/80">repo</span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Item>
      </Stagger>
    </SlideShell>
  );
}

/** Opening slide: AM lockup, headline with the Claude mark + brand orange, and
 *  the Claude · GitHub · Salesforce stack row. */
function IntroSlide() {
  return (
    <SlideShell bg="grid" className="justify-center">
      <Stagger>
        <Item className="mb-5 flex items-center gap-4">
          <img src={brand.assets.logoLockup} alt={brand.identity.company} className="h-9 w-auto" />
          <span className="h-5 w-px bg-white/15" />
          <Eyebrow>Workshop</Eyebrow>
        </Item>
        <Item>
          <h1 className="flex max-w-4xl flex-wrap items-center font-display text-7xl font-bold leading-[1.05] tracking-tight text-ink">
            <span>Working with polyrepos using</span>
            <span className="mt-3 flex w-full items-center gap-4">
              <ClaudeMark size={64} />
              <span style={{ color: CLAUDE_ORANGE }}>Claude</span>
              <span className="text-subtle">+</span>
              <GradientText>GitHub</GradientText>
            </span>
          </h1>
        </Item>
        <Item>
          <p className="mt-6 max-w-2xl text-2xl font-light text-muted">
            Prompting got us here. The next level is context engineering — all the context the model
            needs, and no more.
          </p>
        </Item>

        <Item className="mt-10">
          <div className="flex items-center gap-7 rounded-2xl border border-white/10 bg-panel/60 px-7 py-4">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-subtle">The stack</span>
            <span className="h-6 w-px bg-white/10" />
            <span className="flex items-center gap-2.5" style={{ color: CLAUDE_ORANGE }}>
              <ClaudeMark size={30} />
              <span className="font-display text-lg font-medium">Claude</span>
            </span>
            <span className="flex items-center gap-2.5 text-ink">
              <GithubMark size={26} />
              <span className="font-display text-lg font-medium">GitHub</span>
            </span>
            <span className="flex items-center gap-2.5 text-ink">
              <SalesforceMark size={40} />
              <span className="font-display text-lg font-medium">Salesforce</span>
            </span>
          </div>
        </Item>

        <Item className="mt-12 flex items-center gap-4 text-base">
          <span className="font-display font-semibold text-ink">{brand.identity.principal}</span>
          <span className="text-white/20">·</span>
          <span className="text-subtle">{brand.identity.role}</span>
          <span className="text-white/20">·</span>
          <span className="font-mono text-sm uppercase tracking-widest text-subtle">Jun 2026</span>
        </Item>
      </Stagger>
    </SlideShell>
  );
}

/** Custom two-column comparison table (Command vs Agent). */
function ComparisonSlide() {
  const rows: [string, string][] = [
    ["Saved prompt, runs in your context", "Worker with its own context"],
    ["The workflow (the recipe)", "The capability (the worker)"],
    ["You type it", "The orchestrator delegates to it"],
  ];
  return (
    <SlideShell>
      <Stagger className="flex h-full flex-col">
        <Item className="mb-2">
          <Eyebrow>Settle the confusion</Eyebrow>
        </Item>
        <Item>
          <h2 className="mb-10 font-display text-5xl font-bold tracking-tight text-ink">
            Command vs Agent
          </h2>
        </Item>

        <Item>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-panel">
            <div className="grid grid-cols-2">
              <div className="border-b border-r border-white/10 px-8 py-5 font-display text-2xl font-semibold text-cyan">
                Command
              </div>
              <div className="border-b border-white/10 px-8 py-5 font-display text-2xl font-semibold text-indigo">
                Agent
              </div>
              {rows.map(([cmd, agent], i) => (
                <Fragment key={i}>
                  <div
                    className={`border-r border-white/10 px-8 py-5 text-xl font-light text-muted ${i < rows.length - 1 ? "border-b" : ""}`}
                  >
                    {cmd}
                  </div>
                  <div
                    className={`px-8 py-5 text-xl font-light text-muted ${i < rows.length - 1 ? "border-b border-white/10" : ""}`}
                  >
                    {agent}
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </Item>

        <Item>
          <p className="mt-8 text-xl font-light text-subtle">
            Rule:{" "}
            <GradientText>
              define the capability as an agent; define the workflow as a command.
            </GradientText>
          </p>
        </Item>
      </Stagger>
    </SlideShell>
  );
}

/** "We're all experts at prompting" — quote paired with a coding-meme GIF. */
function PromptingExpertSlide() {
  const gif = `${import.meta.env.BASE_URL}prompting-expert.gif`;
  return (
    <SlideShell bg="deep">
      <Stagger className="flex h-full items-center gap-16">
        <div className="flex-1">
          <Item>
            <span className="font-display text-7xl leading-none text-cyan/30">“</span>
          </Item>
          <Item>
            <blockquote className="-mt-5 font-display text-5xl font-medium leading-[1.18] tracking-tight text-ink">
              A great prompt → a great answer.{" "}
              <GradientText>We're all experts at this now.</GradientText>
            </blockquote>
          </Item>
          <Item>
            <p className="mt-8 font-mono text-sm uppercase tracking-[0.25em] text-subtle">
              — A year ago, the skill was prompting
            </p>
          </Item>
        </div>
        <Item className="shrink-0">
          <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <img src={gif} alt="Confidently typing at a keyboard" className="block w-[420px]" />
          </div>
        </Item>
      </Stagger>
    </SlideShell>
  );
}

export const slides: Slide[] = [
  // ─── Title ──────────────────────────────────────────────────────────────
  <IntroSlide />,

  // ─── Part 0 — Framing ───────────────────────────────────────────────────
  <PromptingExpertSlide />,

  <BulletSlide
    eyebrow="The shift"
    title="Prompting → context engineering"
    lead="Give the model all the context it needs — and not one token more."
    bullets={[
      { title: "The model only knows what's in its context window", desc: "Your job shifts from “ask well” to “curate what it sees.”" },
      { title: "A Goldilocks dial", desc: "Too little → it guesses and hallucinates. Too much → it gets lost, slow, expensive, and pollutes the window." },
      { title: "Both failure modes are real", desc: "Starvation and flooding." },
    ]}
  />,

  <LargeCodebasesSlide />,

  <BulletSlide
    eyebrow="Polyrepos"
    title="You can't just throw the code at the AI"
    bullets={[
      { title: "A polyrepo won't fit in any context window", desc: "Many repos; no model holds 5–10 (let alone 300) at once." },
      { title: "Dumping all the code in ≠ good answers", desc: "The answer isn't a bigger model." },
      { title: "Engineer what the model sees, and when", desc: "Deliberately, with Claude + GitHub tools. That's today." },
    ]}
  />,

  <AgendaSlide
    items={[
      "Claude commands — a partial tour, through the context lens",
      "Agents — subagents & why they're the scale mechanism",
      "The workspace trick in git — one folder over many repos",
      "Git structure at the team level — share config, zero setup",
      "Bonus — skills, plugins & marketplaces",
    ]}
  />,

  // ─── Part 1 — Claude commands ───────────────────────────────────────────
  <SectionDivider
    number="01"
    eyebrow="Part 1"
    title="Claude commands"
    highlight="through the context lens"
    subtitle="Each command earns its place by managing context."
  />,

  <BulletSlide
    eyebrow="The rule"
    title="Does it help context?"
    bullets={[
      { title: "Every command earns its place by managing context", desc: "It either adds the right context or clears the wrong context." },
      "Don't memorize commands",
      "Sort them: “feeds context” vs “protects context”",
    ]}
  />,

  <BulletSlide
    eyebrow="Feed the right context"
    title="/init · /add-dir · /model"
    bullets={[
      { title: "/init", desc: "Generates a CLAUDE.md — a map of the repo, so Claude doesn't re-read the whole tree every session. Commit it. Keep it living." },
      { title: "/add-dir", desc: "Bring another folder into scope (file access)." },
      { title: "/model", desc: "Bigger = smarter but burns context faster; Sonnet/Opus expose a 1M window. Default lean, escalate when stuck." },
    ]}
  />,

  <BulletSlide
    eyebrow="Protect the context"
    title="/clear · /compact · /resume · plan mode"
    bullets={[
      { title: "One session = one task", desc: "Throw it away when done (/clear — it's saved)." },
      { title: "/compact when it fills · /resume to reopen", desc: "Keep the window lean." },
      { title: "Plan mode", desc: "Scope a task before executing; produce a testable plan." },
    ]}
  />,

  <BulletSlide
    eyebrow="Custom commands"
    title="A command is just a file"
    bullets={[
      { title: ".claude/commands/<name>.md → /name", desc: "The file body is the prompt." },
      { title: "Project scope lives in the repo; user scope in ~/.claude", desc: "Now also called “skills” — same thing." },
      { title: "The built-ins aren't special", desc: "Save your own repeatable workflow as a command — and share it. We'll build /investigate." },
    ]}
  />,

  // ─── Part 2 — Agents ────────────────────────────────────────────────────
  <SectionDivider
    number="02"
    eyebrow="Part 2"
    title="Agents"
    highlight="the scale mechanism"
    subtitle="One window can't hold the polyrepo. N windows can."
  />,

  <BulletSlide
    eyebrow="Subagents"
    title="What a subagent is"
    bullets={[
      { title: "A worker with its own context window", desc: "Plus its own system prompt and restricted tools. /agents to create." },
      { title: "Does heavy work in isolation, returns only the result", desc: "" },
      { title: "The point isn't speed", desc: "The reading/grep noise stays in its window, not yours." },
    ]}
  />,

  <BulletSlide
    eyebrow="At scale"
    title="Why agents are the answer"
    bullets={[
      { title: "4 repos that never have to fit in one window", desc: "Each gets its own." },
      { title: "Decomposition isn't a nice-to-have", desc: "It's the only way the work fits." },
      { title: "One window can't hold the polyrepo; N windows can", desc: "This is the large-codebase point." },
    ]}
  />,

  <BulletSlide
    eyebrow="Both are yours to create"
    title="You make your own"
    bullets={[
      { title: "Custom command — just a file", desc: ".claude/commands/<name>.md → /name. The body is the prompt; commit it to share." },
      { title: "Custom agent — /agents", desc: "Define a worker with its own system prompt and tools; it gets its own context window." },
      { title: "So which do you reach for?", desc: "They look similar but do different jobs — let's settle it." },
    ]}
  />,

  <ComparisonSlide />,

  <DiagramSlide
    eyebrow="The pattern"
    title="Investigate → a map, not the code"
    nodes={[
      { label: "/investigate", sub: "orchestrator" },
      { label: "repo-investigator", sub: "one per repo" },
      { label: "arch/<repo>.md", sub: "checklist output" },
      { label: "Architecture hub", sub: "query this" },
    ]}
    caption="Pre-compute a fresh markdown map; query the map, not the code."
  />,

  <BulletSlide
    eyebrow="The payoff"
    title="Query the map"
    bullets={[
      { title: "A fresh, clean session scoped to arch/ only", desc: "Cross-repo questions answered in seconds — zero source code in context." },
      { title: "“Add loyaltyPoints to Product in saleor — what breaks in dashboard and storefront?”", desc: "The map answers instantly." },
      { title: "The GraphQL schema is the contract", desc: "It trickles down across repos." },
    ]}
  />,

  // ─── Part 3 — The workspace trick ───────────────────────────────────────
  <SectionDivider
    number="03"
    eyebrow="Part 3"
    title="The workspace trick"
    highlight="in git"
    subtitle="One folder over many repos — the shared brain."
  />,

  <BulletSlide
    eyebrow="The gap"
    title="The polyrepo gap"
    bullets={[
      { title: "N independent repos = N separate gits, N origins", desc: "No single place for cross-repo context, shared rules, or team tooling." },
      { title: "Each repo knows itself", desc: "Nothing knows the organization. That's the gap." },
    ]}
  />,

  <BulletSlide
    eyebrow="The trick"
    title="A workspace overlay"
    bullets={[
      { title: "One parent folder over the repos", desc: "Its own git tracks only shared context; the children are git-excluded." },
      { title: "clone-all.sh populates · .gitignore excludes saleor/, saleor-dashboard/, …", desc: "Children stay autonomous: own history, PRs, origin." },
      { title: "The overlay is the shared brain", desc: "CLAUDE.md, commands, agents, settings — for the whole solution." },
    ]}
  />,

  <BulletSlide
    eyebrow="Hierarchy"
    title="CLAUDE.md = a map of maps"
    bullets={[
      { title: "Workspace CLAUDE.md", desc: "The cross-repo overview + the GraphQL contract." },
      { title: "One CLAUDE.md per child repo", desc: "Claude resolves from where it's launched, walking up." },
      { title: "Grow the hierarchy over time", desc: "The overview names the contract; each repo map names its own internals." },
    ]}
  />,

  // ─── Part 4 — Team-level git structure ──────────────────────────────────
  <SectionDivider
    number="04"
    eyebrow="Part 4"
    title="Team-level"
    highlight="git structure"
    subtitle="Commit .claude/ → the team gets it on a clone."
  />,

  <BulletSlide
    eyebrow="What travels"
    title="What lives in .claude/"
    bullets={[
      { title: ".claude/commands/ + .claude/agents/ → committed → shared ✓", desc: "" },
      { title: ".claude/settings.json → shared team permissions ✓", desc: "" },
      { title: ".claude/settings.local.json → personal, gitignored ✗", desc: "The #1 “works for me, not my teammate” bug: shared perms in settings.local.json. Shared = settings.json." },
    ]}
  />,

  <ProcessSlide
    eyebrow="Tier 1 reuse"
    title="Clone-and-go, zero setup"
    steps={[
      { title: "gh repo clone <workspace>" },
      { title: "./clone-all.sh", desc: "Populate the child repos." },
      { title: "claude", desc: "Launch in the workspace." },
      { title: "It just works", desc: "/investigate is in the menu, repo-investigator is in /agents — no prompts, no flags, no config. Walk-up discovery finds it from any child folder too." },
    ]}
  />,

  <BulletSlide
    eyebrow="Awareness"
    title="Precedence & the bigger tiers"
    bullets={[
      { title: "When names collide", desc: "managed settings > CLI --agents > project .claude > user ~/.claude > plugin." },
      { title: "Sharing tiers", desc: "workspace (this team) → plugin + marketplace (the org) → managed settings (forced rollout by IT)." },
      { title: "Same idea, wider blast radius", desc: "Today is Tier 1. 300 repos → plugins. Enterprise → IT pushes managed config." },
    ]}
  />,

  // ─── Part 5 — Bonus ─────────────────────────────────────────────────────
  <SectionDivider
    number="05"
    eyebrow="Bonus"
    title="New Claude commands"
    highlight="worth knowing"
  />,

  <BulletSlide
    eyebrow="Pointers, not a deep dive"
    title="What's new"
    bullets={[
      { title: "Skills", desc: "Custom commands merged into skills (.claude/skills/<name>/SKILL.md); your .claude/commands/*.md still work." },
      { title: "Plugins + marketplaces", desc: "Bundle commands+agents+hooks: /plugin marketplace add <org/repo> → /plugin install <name>; auto-namespaced. A marketplace can be a private git repo." },
      { title: "Nested / forked subagents", desc: "Agents can spawn agents." },
    ]}
  />,

  // ─── Close ──────────────────────────────────────────────────────────────
  <BulletSlide
    eyebrow="Recap"
    title="The spine, earned"
    bullets={[
      { title: "Prompting → context engineering", desc: "All the context needed, none of the noise." },
      { title: "Polyrepos don't fit → agents make the work fit", desc: "A markdown map beats raw code." },
      { title: "The workspace overlay is the shared brain", desc: "Commit .claude/ → the team gets it on a clone." },
    ]}
  />,

  <BulletSlide
    eyebrow="Takeaways / handout"
    title="What to take home"
    bullets={[
      "Repo: am-consultingai/Saleor-workspace",
      "/investigate + repo-investigator + shared settings.json (already committed)",
      "The settings.json vs .local rule",
      "CLAUDE.md template + clone-and-go steps",
    ]}
  />,

  <ClosingSlide headline="Engineer the context," highlight="and it fits." />,
];
