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
| **Agents** | codex · claude · copilot · gemini |
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
