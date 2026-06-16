---
description: Build the architecture hub — investigate every repo in the workspace and write arch/<repo>.md
argument-hint: "[repo-name] (optional: investigate just one repo)"
allowed-tools: Read, Glob, Grep, Agent, Write
---

You are the orchestrator. Your job is to build (or refresh) the workspace's
**architecture hub**: one compact markdown map per repository, under `arch/`.

The pattern: you do NOT read the repos yourself — each repo is large and would not
fit in this context window. Instead you DELEGATE one `repo-investigator` subagent
per repo, each working in its own context window, and collect their results.

Steps:

1. Read the workspace `CLAUDE.md` to get the list of child repos. The repos are the
   folders listed there (e.g. `saleor`, `saleor-dashboard`, `storefront`,
   `saleor-platform`). Only consider folders that actually exist on disk.

2. If `$ARGUMENTS` names a specific repo, investigate only that one. Otherwise
   investigate all of them.

3. For each repo, **use the repo-investigator subagent** to investigate that repo's
   path and return its architecture map. **Run them in parallel as separate
   subagents** — they are independent.

4. As each subagent returns its markdown, write it to `arch/<repo>.md`. Create the
   `arch/` folder if needed.

5. When all are done, print a short summary: which `arch/<repo>.md` files were
   written/updated, and one line on any repo the investigator flagged as risky or
   notable.

Do not commit. Leave the files staged for the human to review and commit to the hub.
