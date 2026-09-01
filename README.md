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
| **Agents** | Portal-style teams with search/sort/filter/grid-list. **Development Team** (architect, implementer, orchestrator, sandbox-coder) + **Catalog Intelligence Team** — the Llama 3.2 / Model Runner product-evaluation agents (vendor-intake, market-research, customer-match, catalog-management, orchestrator) from [catalog-service-ai-enhanced](https://github.com/ajeetraina/catalog-service-ai-enhanced). Create Agent, run in sandbox, or **Submit a product** to watch the catalog pipeline evaluate it live (score → APPROVED/REJECTED → Postgres/Mongo/Kafka) |
| **Projects** | `catalog-service` (frontend, backend, Kafka, LocalStack, WireMock) |
| **Artifacts** | Built images with CVEs, SBOM/provenance, signature, policy verdict |
| **Schedules** | Cron jobs (rebuild, CVE scan, policy-drift check) |
| **Tasks** | Kanban of supply-chain work items |
| **Interactive** | Simulated `sbx` / `docker scout` shell (incl. `sbx kit ls/inspect/add`) |

Two experiences live off-nav (reachable by button/link, like the real product's
CLI/declarative layers):

- **Kits** (`#/kits`) — declarative sbx artifacts (`spec.yaml`): `kind: sandbox`
  agent kits + `kind: mixin` add-ons (`dhi-mcp`, `node-toolchain`, `docker-build`,
  `deny-all-net`). Shows how a kit **composes** the Sandbox / MCP / Secrets / Policy
  primitives. "Compose from kits" is wired into **New sandbox**, and the sandbox's
  `.sbxenv.yaml` renders the resulting `kit:` + `mixins:`.
- **Product Evaluation** (`#/evaluate`) — submit a product, watch the Catalog
  Intelligence agents score it live.

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

Explanation: The DHI MCP server exposes two kinds of tools

When you register remotedhi, the agent gets a set of tools. They fall into two buckets:

Read-only (query) tools — just ask questions about Docker's Hardened Images catalog:
- dhi_get_image_cves — "what CVEs does node:24-debian13 have?"
- dhi_list_repositories, dhi_get_image_packages, dhi_get_image_attestations, dhi_get_tag_definition …

These only read. They return information. They change nothing.

Mutating tools — actually change infrastructure:
- dhi_create_mirror — create a mirror (a redirect/copy of a repository to another registry)
- dhi_remove_mirror — delete one

These write/mutate. They alter where hardened images come from.

"Read the catalog, not mutate it" = give it only the query tools

The agent's legitimate job is: before writing FROM, look up a good base image — check its CVEs, confirm it's signed, see its packages. That's all reading.

It has no reason to create or delete a mirror. So the dhi-readonly Cedar policy grants exactly the read tools and denies the two mutators:

```
permit (principal, action == MCP::Action::"invokeTool", resource)
when {
  resource.server == "remotedhi" &&
  ["dhi_get_image_cves","dhi_get_image_details", ...   //
   "dhi_list_repositories","dhi_list_mirrors"].contains(resource.tool)
};
```

Because dhi_create_mirror / dhi_remove_mirror aren't in ths denied.

### Why this is the point (not just a nice-to-have)

This is least privilege applied to an AI agent. The scary pt-injected — a malicious product description, a poisoneddependency, whatever — and tries to do something harmful. If it could call dhi_create_mirror, it could redirect your "hardened" base image to a registry an attacker controls → a supply-chain compromise

With the scoped policy, even a fully hijacked agent can ont can do with the DHI server is read CVE data. It literallycannot mutate your image sourcing, because those tools are off the table — enforced by policy, not by trusting the agent to behave.

▎ The soundbite for your demo: "The agent needs to read the catalog to pick a safe base — it never needs to write to it. So we grant read, deny
▎ write. Even a compromised agent can only look, not touch

### Where to show it live

Go to MCP → remotedhi: the tool table marks the read toolste_mirror / dhi_remove_mirror denied (red). That red/greensplit is this policy in action — a great visual for that beat of the talk.   
