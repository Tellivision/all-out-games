# Port the `clone-website` skill from `JCodesMore/ai-website-cloner-template` to Codebuff

## Context

I'm starting a **new, clean project** that uses the `/clone-website` skill from
[`JCodesMore/ai-website-cloner-template`](https://github.com/JCodesMore/ai-website-cloner-template)
— but I want to run the skill inside **Codebuff**, not in Claude Code.

This document is the brief. Drop it into a brand-new repo so a future Codebuff
session can read it cold (no conversation history) and pick up where this
research and planning left off.

---

## Source repository

| Item | Value |
|---|---|
| Repo | https://github.com/JCodesMore/ai-website-cloner-template |
| Default branch | **`master`** — not `main`. Initial fetches on `main` will 404. Use `master`. |
| Skill source-of-truth | `.claude/skills/clone-website/SKILL.md` (~30 KB, 30 312 bytes at last check) |
| Other key files | `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `scripts/sync-agent-rules.sh`, `scripts/sync-skills.mjs` |
| License | MIT |
| Author | JCodesMore |

---

## What the skill does

Reverse-engineers one or more websites as **pixel-perfect Next.js clones**.
Slash-command form: `/clone-website <url1> [<url2> ...]`. Frontmatter from the source SKILL.md:

```yaml
---
name: clone-website
description: Reverse-engineer and clone one or more websites in one shot — extracts assets, CSS, and content section-by-section and proactively dispatches parallel builder agents in worktrees as it goes. Use this whenever the user wants to clone, replicate, rebuild, reverse-engineer, or copy any website. Also triggers on phrases like "make a copy of this site", "rebuild this page", "pixel-perfect clone". Provide one or more target URLs as arguments.
argument-hint: "<url1> [<url2> ...]"
user-invocable: true
---
```

Phase pipeline (from the skill body):

1. **Pre-Flight** — verify browser MCP tool, parse URLs, verify `npm run build`, scaffold `docs/research/` etc.
2. **Phase 1 — Reconnaissance** — full-page screenshots at desktop (1440 px) + mobile (390 px) viewports; extract fonts, colors, favicons, meta; mandatory scroll + click + hover + responsive interaction sweep; write `docs/research/BEHAVIORS.md` + `PAGE_TOPOLOGY.md`.
3. **Phase 2 — Foundation** — fonts → `layout.tsx`, design tokens → `globals.css`, TS interfaces → `src/types/`, extracted SVGs → `src/components/icons.tsx`, run `scripts/download-assets.mjs` to populate `public/`.
4. **Phase 3 — Component Spec & Dispatch** — for each section: extract → write `docs/research/components/<name>.spec.md` → dispatch 1+ builder agents in git worktrees with the spec inline → merge.
5. **Phase 4 — Page Assembly** — wire all sections into `src/app/page.tsx`, page-level layout, page-level behaviors (scroll snap, dark-to-light transitions, Lenis, etc.).

Key guiding principles from the body (preserve when porting):

- **Completeness beats speed** — builders receive full extracted CSS, verbatim text, asset paths, behavior specs. No guessing.
- **Small tasks, perfect results** — split complex sections into smaller builders if a spec exceeds ~150 lines.
- **Real content, real assets** — extract verbatim from live site. Layered images (background + overlay PNG + foreground UI mockup) must all be enumerated.
- **Foundation first** — fonts/globals/types/icons/assets are sequential and non-negotiable.
- **Extract appearance AND behavior** — every element gets both `getComputedStyle()` snapshot AND diffed before/after states for scroll/click/hover.
- **Identify the interaction model before building** — click vs scroll vs hover vs time. Getting this wrong = complete rewrite.
- **Extract every state** — click every tab, capture every before/after.
- **Spec files are the source of truth** — every builder gets its spec inline + the file persists.
- **Build must always compile** — every builder runs `npx tsc --noEmit`; assembly runs `npm run build`.

---

## Target stack (what the skill produces)

The skill outputs a **Next.js 16 / React 19** project. Defaults:

- Next.js 16 — App Router
- React 19
- TypeScript strict mode
- shadcn/ui — Radix primitives + Tailwind CSS v4
- Tailwind CSS v4 — oklch design tokens
- Lucide React — default icons, replaced by extracted SVGs during cloning

**To start a project:** `gh repo create my-website-clone --template JCodesMore/ai-website-cloner-template --public --clone` → `npm install` → ready.

---

## Prerequisites — status

| Requirement | Source skill says | This environment |
|---|---|---|
| Node.js 24+ | Required | ✅ v24.15.0 |
| npm | Required | ✅ 11.3.0 |
| git | Required | ✅ 2.49.0 |
| `chrome` (browser binary) | Required for browser MCP | ✅ "Chrome: installed" |
| Next.js project scaffold | Implicit (`npm run build` baseline) | ❌ not present here — start a fresh project for this skill |
| Chrome MCP / Playwright MCP / Browserbase MCP / Puppeteer MCP | **Required** per Pre-Flight Step 1 | ❌ **Codebuff has no MCP server in its tool registry** |
| Git worktree orchestration | Builder agents dispatched in parallel worktrees | ⚠️ Codebuff has `basher` + `spawn_agents` — workable but not native |

---

## Codebuff capabilities needed for the port

| Capability | Codebuff tool |
|---|---|
| Browser navigation + screenshot + interaction sweep | `browser-use` sub-agent |
| Run shell commands (`git`, `npm`, `npx tsc`, `ls`) | `basher` |
| Parallel sub-agent dispatch (one per builder) | `spawn_agents` |
| File reading + targeted edits | direct file tools |
| Hashing (for `skills-lock.json` `computedHash`) | use a basher call: `node -e "require('crypto').createHash('sha256').update(fs.readFileSync('.agents/skills/clone-website/SKILL.md')).digest('hex')"` |
| Search/grep across the codebase | `code-searcher` |
| File discovery | `file-picker` or `list_directory` |
| Validate changes (review) | `code-reviewer-minimax-m3` |
| Deep reflection / option evaluation | `thinker-with-files-gemini` |

---

## What needs porting

### A. Chrome MCP calls → `browser-use` sub-agent invocations

The original skill body invokes Chrome MCP tools directly (e.g., `mcp__chrome__*`).
Codebuff has no Chrome MCP server but has a `browser-use` sub-agent that does
equivalent things via Chrome DevTools Protocol.

When porting, replace Chrome-MCP-style invocations like:

```
# ORIGINAL (Claude Code)
mcp__chrome__navigate url=...
mcp__chrome__screenshot
mcp__chrome__evaluate script=...
mcp__chrome__click selector=...
```

with conversational invocations to the `browser-use` sub-agent. The browser-use
agent returns a capture path (JPG/PNG screenshots) and `consoleErrors` array
per interaction. Read those capture files to verify visual state.

The skill body's Pre-Flight Step 1 ("check for available browser MCP tools")
needs to be replaced with: **"Use Codebuff's `browser-use` sub-agent for all
browser interactions."** Drop the user-asks-if-no-MCP fallback — `browser-use`
is always available.

### B. Worktree-based parallel builder dispatch → `spawn_agents` + `basher`

Original: dispatch parallel builder agents in git worktrees, one per section.

Port pattern:

1. `basher` to create worktrees per builder slot: `git worktree add ../worktree-builder-hero -b builder/hero`
2. `spawn_agents` to dispatch each builder with the spec inline, the worktree CWD, the screenshot capture file path, and the target component file path.
3. Each builder verifies via `basher` running `npx tsc --noEmit` before returning.
4. `basher` to merge each branch back: `git checkout main && git merge --no-ff builder/hero`.
5. `basher` to clean up: `git worktree remove ../worktree-builder-hero`.

### C. Per-step command invocations → `basher` shell wrappers

Things like `npx tsc --noEmit`, `npm run build`, `git worktree add`,
`node scripts/download-assets.mjs`, even `mkdir -p docs/research/...`
all run via `basher`. Don't try to invoke them from `spawn_agents` — have
the orchestrator (this Codebuff session) call `basher` or instruct the
spawned builder agents to use `basher`.

### D. Preserve every other principle

Don't touch the 9 Guiding Principles or the Phase 1-4 structure. Only
swap mechanism (MCP → sub-agent, worktrees → basher).

---

## File layout after porting

```
new-project/
├── .github/                     # from template
├── .claude/                     # keep — authored by upstream
├── AGENTS.md                    # keep
├── CLAUDE.md                    # keep
├── GEMINI.md                    # keep
├── src/                         # Next.js app (target of the skill)
│   ├── app/
│   ├── components/
│   ├── ui/
│   ├── types/
│   └── ...
├── docs/
│   ├── research/                # where specs live (writing target)
│   └── design-references/       # where screenshots live
├── scripts/
│   ├── sync-agent-rules.sh
│   ├── sync-skills.mjs          # may need a Codebuff sync target added
│   └── download-assets.mjs      # runs during Phase 2 of the skill
├── .agents/
│   └── skills/
│       └── clone-website/
│           └── SKILL.md         # ← the PORTED skill
└── skills-lock.json             # ← add entry
```

Plus an entry in `skills-lock.json` (after computing the hash):

```json
{
  "clone-website": {
    "source": "JCodesMore/ai-website-cloner-template",
    "sourceType": "github",
    "skillPath": ".claude/skills/clone-website/SKILL.md",
    "computedHash": "<sha256 of the local .agents/skills/clone-website/SKILL.md>"
  }
}
```

Note: matching the source path (`.claude/skills/clone-website/SKILL.md`) rather
than the install path (`.agents/skills/clone-website/SKILL.md`) keeps the lock
file consistent with how the existing entries reference GitHub source paths.

---

## Implementation plan

### Phase 1 — Scaffold

1. `gh repo create my-website-clone --template JCodesMore/ai-website-cloner-template --public --clone`
2. `cd my-website-clone`
3. `npm install`
4. Verify `npm run build` passes.
5. Read the local `AGENTS.md` to understand the project's agent-instruction posture.

### Phase 2 — Port the skill

1. Fetch the source SKILL.md from `master` branch:
   - `curl https://raw.githubusercontent.com/JCodesMore/ai-website-cloner-template/master/.claude/skills/clone-website/SKILL.md -o .agents/skills/clone-website/SKILL.md`
2. Compute the SHA-256:
   - `node -e "console.log(require('crypto').createHash('sha256').update(require('fs').readFileSync('.agents/skills/clone-website/SKILL.md','utf8')).digest('hex'))"`
3. Rewrite Chrome-MCP references → `browser-use` sub-agent invocations.
4. Rewrite "dispatch parallel builder agents in git worktrees" to use `spawn_agents` + `basher`.
5. Replace `npx tsc --noEmit`, `npm run build`, `git worktree add` references with explicit `basher` calls.
6. Drop the "ask user which browser MCP you have" branch; replace with "use Codebuff `browser-use`".
7. Add the `clone-website` entry to `skills-lock.json`.
8. Recompute `computedHash` if the body changed.

### Phase 3 — Test the skill in Codebuff

1. Spawn a `code-reviewer-minimax-m3` over the ported SKILL.md to verify the rewrite preserves all the Guiding Principles and the 4-phase structure.
2. Load the skill (`/clone-website` invocation or whatever Codebuff's skill invocation form is).
3. Smoke test with a small target: `/clone-website https://example.com`.
4. Verify Pre-Flight passes: browser-use available, `npm run build` clean, output dirs created.
5. Verify Recon phase: browser-use gets screenshots, BEHAVIORS.md + PAGE_TOPOLOGY.md get written.
6. Verify Spec phase: per-section spec files in `docs/research/components/`.
7. Verify Build phase: `spawn_agents` dispatches parallel builders, each in their own git worktree, each verifying `npx tsc --noEmit`.
8. Verify Assembly phase: basher merges, full `npm run build` still passes.

### Phase 4 — Iterate

- If `browser-use` is too slow for a 100-frame extraction sweep, narrow with `--start` / `--end` style arguments or chunk the page into sections.
- If git worktree + spawn_agents fight over file ownership, have each builder return the diff inline instead of touching the filesystem — orchestrator writes the merge.
- If Chrome MCP integration becomes available later in Codebuff, optionally swap back and remove the `browser-use` indirection.

---

## Risk areas

- **Skill is 30 KB** — port is non-trivial. Use Plan-aware editing, break the rewrite into ~6 chunks (Pre-Flight, Phase 1, Phase 2, Phase 3, Phase 4, Asset script).
- **Sub-agent orchestration differs from Claude Code** — Claude Code sub-agents share session context; Codebuff `spawn_agents` invocations are independent. The orchestrator must pass all required inline context in each `spawn_agents` prompt.
- **`browser-use` may be slower than native Chrome MCP** — automation jitter on CDP can stretch a 0.5 s interaction into 2 s, so allocate generous timeouts.
- **Git worktrees through `basher`** — Windows paths and worktree resolution need verification; on Windows with `git version 2.49.0.windows.1`, worktree paths must avoid drive-letter collisions with the main repo.
- **Spec-file inline payload can blow up `spawn_agents` prompts** — 30-spec builds + full screenshot references might exceed token budgets. Compress specs to required-essential content per builder instead of passing everything.

---

## Notes

- Codebuff is **not** in the upstream template's official supported platforms list: Claude Code, Codex CLI, OpenCode, GitHub Copilot, Cursor, Windsurf, Gemini CLI, Cline, Roo Code, Continue, Amazon Q, Augment, Aider.
- The upstream `scripts/sync-skills.mjs` regenerates platform-specific copies of the skill. If porting lands in the upstream, add a `.agents/skills/` sync target. Until then, keep the ported skill in a fork under `.agents/skills/clone-website/SKILL.md`.
- `JCodesMore/ai-website-cloner-template` is a *template* repo meant for "Use this template" — not a plugin or skill distribution. Some manual setup is expected.
