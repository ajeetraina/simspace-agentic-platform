# Demo Script — Docker Agentic Platform (Simulation)

A tight **~7–10 minute** walkthrough that carries the whole platform through one
story: **the same agent, two environments.** Every step maps to a real click in
the live app.

> **Live:** https://agentic-platform.dockerworkshop.com
> **Repo:** https://github.com/ajeetraina/simspace-agentic-platform

> **🎬 Hands-free option:** click **Guided tour** in the sidebar (or open
> [`?tour=1`](https://agentic-platform.dockerworkshop.com/?tour=1#/dashboard)) to auto-play
> this entire story — including the live build and a live approve **and** reject — with
> caption overlays. Perfect for screen-recording. Use **Pause / Back / Next** to drive it
> manually, or narrate the manual walkthrough below.

---

## Before you start (30 sec)

- Open the app **full-screen**; set browser zoom to **~110–125%** so the room can read it.
- Click **Demo data → Reset** (bottom-left) to begin from the clean seeded state:
  empty Sandboxes, the `catalog-service:baseline` artifact present, no `:dhi` yet.
- Optional: keep **two tabs** open — one reset-clean for the live build, one with
  the build already done so you can jump straight to the payoff if time is tight.

---

## The walkthrough

### 1. The hook — sign in · 20s
> "This is a simulation of Docker's Agentic Platform — cloud sandboxing with AI
> governance. Any credentials work."

Click **Sign in** → lands on **Sandboxes**, empty. *"An agent hasn't done anything yet."*

### 2. The problem — what an unsupervised agent ships · 60s
Go to **Artifacts → `catalog-service:baseline`**.
> "An AI agent containerised our Node catalog service on a laptop, unsandboxed. It
> works — but look: `node:20`, 431 packages, 8 High / 41 Medium CVEs, unsigned,
> runs as root. **It fails policy.** Nobody chose that base image; the agent
> pattern-matched it."

Point at the red **policy fail** panel. This is your villain.

### 3. The governance you put in place · 75s
- **MCP → `remotedhi`**: "We register the DHI MCP server — signed, read-only
  catalog queries. Notice the two mirror-mutator tools are **denied**."
- **Policies → `dhi-readonly`**: "A Cedar policy enforces exactly that — the agent
  can *read* the hardened catalog, not mutate it."
- **Secrets** (quick): "Tokens are injected at runtime, never on disk."

### 4. The fix — run the agent in a box · 90s  ← centerpiece
- **New sandbox** → keep `catalog-sandbox`, agent `implementer`, attach
  **remotedhi**, profile **dhi-readonly** → **Create**. Watch it boot to *Running*.
- On the detail page: "Own daemon, own network, host read-only — and here's the
  whole thing as a committable **`.sbxenv.yaml`**."
- Click **Run agent build**. "Same prompt as before. This time it queries the DHI
  catalog *before* writing `FROM`."

### 5. Payoff — the before/after · 60s
- **Dashboard**: the comparison table now fills the right column — `0H · 1M · 4L`,
  78 packages, 84 MB, **signed, non-root, passes**. The hardening flow lights up green.
- **Artifacts → `catalog-service:dhi`** and **Sessions**: show the actual MCP tool
  calls the agent made. *"The fast path and the safe path became the same path."*

### 6. The crowd-pleaser — Interactive terminal · 90s
Go to **Interactive**. Click commands down the left rail, in order:

```
sbx daemon start
sbx mcp add remotedhi --url https://dhi.io/mcp
sbx run codex --static-mcp remotedhi -p "Containerise catalog-service for production"
docker scout compare --to catalog-service:baseline catalog-service:dhi
```

> "Everything you just clicked, driven from the CLI — and it updates Artifacts and
> the Dashboard live."

### 7. Agents — the multi-agent angle · 75s
Go to **Agents**.
> "Two teams. The **Development Team** built the image. The **Catalog Intelligence
> Team** is the multi-agent product-evaluation pipeline — Llama 3.2 on Docker Model
> Runner, from the `catalog-service-ai-enhanced` project."

Click **Submit a product** (on the Catalog Intelligence Team header, or **▶** on
`catalog-orchestrator`) to open the **live Product Evaluation**.

> "Let's add a product and watch the team decide. Same pre-filled sample — hit Submit."

Watch the fan-out animate: `catalog-orchestrator` receives → four agents light up →
`vendor-intake` builds a score breakdown (**~91/100 → APPROVED**), `market-research`
and `customer-match` add signal, `catalog-management` **commits to PostgreSQL ·
MongoDB · Kafka**. Then the green **APPROVED** banner.

**The kicker — trigger a live REJECT:** click **Sample: weak** → **Submit**. Same
pipeline, but `vendor-intake` scores it **40/100**, `catalog-management` shows
**skipped / not committed**, and the banner turns red: **REJECTED**.

> "The scoring is real and reacts to the input — a $899 cable with a one-line
> description fails on clarity and price. The agents made the call, and every step is
> audited. That's the point: agents making business decisions, governed and logged."

### 8. Close · 20s
Flash **Schedules** (nightly rebuild, CVE scan) and **Tasks** (kanban).
> "Governed, repeatable, auditable — agents boxed in by default."

---

## The two teams (reference)

**Development Team** — coding agents that run in sandboxes:
`architect` (Opus 4.8) · `implementer` (Sonnet 4.6) · `orchestrator` (Customized) ·
`sandbox-coder`.

**Catalog Intelligence Team** — the product-evaluation pipeline
([catalog-service-ai-enhanced](https://github.com/ajeetraina/catalog-service-ai-enhanced),
Llama 3.2 via Docker Model Runner):

| Agent | Role |
|---|---|
| `catalog-orchestrator` | Fans out to the pipeline, synthesises APPROVED / REJECTED |
| `vendor-intake` | Scores submissions 0–100 (≥ 70 approves) |
| `market-research` | Automated competitor analysis |
| `customer-match` | Matches products to customer segments |
| `catalog-management` | Writes to PostgreSQL, MongoDB history, Kafka events |

---

## The numbers (say these with confidence)

| | Unsandboxed (host) | Sandboxed (DHI MCP) |
|---|---|---|
| Image | `catalog-service:baseline` | `catalog-service:dhi` |
| Base | `node:20` | `dhi.io/node:24-debian13` |
| CVEs | 0C · **8H · 41M · 93L** | 0C · **0H · 1M · 4L** |
| Packages | 431 | 78 |
| Size | 1.1 GB | 84 MB |
| Signed / SBOM / root | no / none / root | **yes / attached / non-root** |
| Policy | **fail** | **pass** |

---

## Delivery tips

- **The terminal is your safety net.** If a click flow ever hiccups live, the
  Interactive command palette reproduces the entire story deterministically.
- **Reset between runs** with *Demo data → Reset* so the "before" state is clean.
- Great **"how does it actually work"** anchors for deep Q&A: the `.sbxenv.yaml`
  panel on a sandbox, and the Cedar policy source on **Policies → dhi-readonly**.
- Everything is client-side (`localStorage`) — nothing you click leaves the browser.

---

*Educational simulation of a real product's UI. Not affiliated with Docker, Inc.*
