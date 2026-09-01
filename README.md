# Docker Agentic Platform ~ Simulation

A pixel-faithful, fully interactive **simulation** of the
[Docker Agentic Platform](https://agentic-platform.docker.com/) portal —
cloud sandboxing with AI governance. Sign in, create sandboxes (isolated
microVMs), register MCP servers, manage secrets, author Cedar policies, and
watch an agent build a container — all in your browser, nothing real executes.

It is seeded with the **Product Catalog** scenario from
[ajeetraina/simspace-agentic-security](https://github.com/ajeetraina/simspace-agentic-security):
an AI agent containerises a Node.js catalog service, and you turn what it
shipped into a signed, attested, policy-gated artifact.

> No backend, no accounts, no data leaves the browser. State lives in
> `localStorage`; use **Demo data → Reset** to restore the seeded scenario.

## Run it

**Live preview (recommended for editing):**

```bash
docker compose up dev          # http://localhost:8080
```

**Self-contained image:**

```bash
docker compose --profile build up app --build   # http://localhost:8081
# or:
docker build -t dap-sim . && docker run --rm -p 8080:80 dap-sim
```

**No Docker?** It is plain static files — any static server works:

```bash
python3 -m http.server 8080    # then open http://localhost:8080
```

Sign in with any email (a value is pre-filled). Everything is simulated.

## The demo path (Product Catalog)

The story mirrors the lab: the same agent, two environments.
See **[DEMO.md](DEMO.md)** for a click-by-click, ~7–10 min presenter script.

1. **Artifacts** → `catalog-service:baseline` — what the agent shipped
   *unsandboxed*: `node:20`, 431 packages, `0C · 8H · 41M · 93L`, unsigned,
   runs as root, **fails policy**.
2. **Sandboxes → New sandbox** → attach the `remotedhi` MCP server + the
   `dhi-readonly` policy → **Run agent build**. The agent queries the DHI MCP
   catalog *before* writing `FROM` and produces `catalog-service:dhi`:
   `dhi.io/node:24-debian13`, 78 packages, `0C · 0H · 1M · 4L`, signed,
   non-root, **passes policy**.
3. **Dashboard** → the two images sit side by side; the hardening flow lights up.
4. **Interactive** → drive the whole thing from a simulated shell
   (`sbx daemon start`, `sbx mcp add remotedhi …`, `sbx run codex -p "…"`,
   `docker scout compare …`). Commands update Artifacts, Sessions and the
   Dashboard live.

## What's simulated

| Nav item | What it does |
|---|---|
| **Sandboxes** | Create/stop/delete microVMs; run the agent build |
| **MCP** | Register servers by URL; inspect tools; see which are allowed/denied by policy |
| **Secrets** | Masked secrets injected at runtime (reveal/copy) |
| **Policies** | Cedar (MCP access) + Scout (image/CI) policies; enforce/edit |
| **Dashboard** | Posture overview + baseline-vs-hardened comparison |
| **Sessions** | Agent runs, prompts, and the MCP tool calls they made |
| **Agents** | Portal-style teams with search/sort/filter/grid-list. **Development Team** (architect, implementer, orchestrator, sandbox-coder) + **Catalog Intelligence Team** — the Llama 3.2 / Model Runner product-evaluation agents (vendor-intake, market-research, customer-match, catalog-management, orchestrator) from [catalog-service-ai-enhanced](https://github.com/ajeetraina/catalog-service-ai-enhanced). Create Agent, run in sandbox, or run the catalog pipeline |
| **Projects** | `catalog-service` (frontend, backend, Kafka, LocalStack, WireMock) |
| **Artifacts** | Built images with CVEs, SBOM/provenance, signature, policy verdict |
| **Schedules** | Cron jobs (rebuild, CVE scan, policy-drift check) |
| **Tasks** | Kanban of supply-chain work items |
| **Interactive** | Simulated `sbx` / `docker scout` shell |

## Project layout

```
index.html            app shell entry
nginx.conf            static server config (correct ES-module MIME types)
Dockerfile            nginx image
compose.yaml          dev (live) + app (built) services
assets/styles.css     all styling
src/
  app.js              shell: sidebar, topbar, auth gate, routes
  router.js           hash router
  store.js            state + seeded scenario + localStorage
  scenario.js         shared Product Catalog build logic
  ui.js               DOM/component helpers (modal, toast, table, badge…)
  logo.js             Docker whale mark
  terminal-sim.js     command simulator for the Interactive shell
  views/              one module per nav item
```

## Not affiliated with Docker, Inc.

This is an educational simulation of a real product's UI for demos and
workshops. It ships no Docker code and talks to no Docker service.


## Demo

Here's a tight, proven way to present it — a ~7–10 minute narrative that walks the whole platform through one story ("the same agent, two environments"). Everything below maps to actual clicks in your live app.

Before you start (30 sec)

- Open https://agentic-platform.dockerworkshop.com full-screen, browser zoom ~110–125% so the room can read it.
- Click Demo data → Reset (bottom-left) so you begin from the clean seeded state (empty Sandboxes, baseline artifact present, no :dhi yet).

The walkthrough

1. The hook — sign in (20s)

▎ "This is a simulation of Docker's Agentic Platform — cloud sandboxing with AI governance. Any credentials work."

Click Sign in → lands on Sandboxes, empty. "An agent hasn't done anything yet."

2. The problem — what an unsupervised agent ships (60s)
Go to Artifacts → catalog-service:baseline.

▎ "An AI agent containerised our Node catalog service on a laptop, unsandboxed. It works — but look: node:20, 431 packages, 8 High / 41 Medium CVEs, unsigned, runs as root. It fails policy. Nobody chose that base image; the agent pattern-matched it."

Point at the red "policy fail" panel. This is your villain.

3. The governance you put in place (75s)
- MCP → remotedhi: "We register the DHI MCP server — signed, read-only catalog queries. Notice the two mirror-mutator tools are denied."
- Policies → dhi-readonly: "A Cedar policy enforces exactly that — the agent can read the hardened catalog, not mutate it."
