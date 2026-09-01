// ---------------------------------------------------------------------------
// Store: in-memory state persisted to localStorage, with a tiny pub/sub.
// Seeded with the "Product Catalog" scenario from
// github.com/ajeetraina/simspace-agentic-security so every view has data.
// ---------------------------------------------------------------------------

const KEY = "dap-sim-state-v2";
const SESSION_KEY = "dap-sim-session-v1";

function seed() {
  return {
    org: "acme-labs",
    // -------------------------------------------------------------------
    // Sandboxes — start empty to mirror the real portal's first-run screen.
    // Creating one runs the Product Catalog build flow.
    // -------------------------------------------------------------------
    sandboxes: [],

    // -------------------------------------------------------------------
    // MCP servers — the DHI MCP server is registered, exposing read-only
    // hardened-catalog query tools plus the two mirror mutators.
    // -------------------------------------------------------------------
    mcpServers: [
      {
        id: "mcp-remotedhi",
        name: "remotedhi",
        type: "remote",
        transport: "streamable-http",
        url: "https://dhi.io/mcp",
        status: "connected",
        policy: "dhi-readonly",
        added: "2026-08-28T10:12:00Z",
        tools: [
          { name: "dhi_get_image_cves", kind: "read", desc: "CVE report for a hardened base image" },
          { name: "dhi_get_image_details", kind: "read", desc: "Image metadata & variants" },
          { name: "dhi_get_image_packages", kind: "read", desc: "Package inventory for an image" },
          { name: "dhi_get_image_attestations", kind: "read", desc: "Signed SBOM / SLSA attestations" },
          { name: "dhi_get_tag_definition", kind: "read", desc: "Resolve a tag to a digest & variant" },
          { name: "dhi_get_repository", kind: "read", desc: "Repository details" },
          { name: "dhi_list_repositories", kind: "read", desc: "List hardened repositories" },
          { name: "dhi_list_mirrors", kind: "read", desc: "List configured mirrors" },
          { name: "dhi_create_mirror", kind: "mutate", desc: "Create a mirror (blocked by policy)" },
          { name: "dhi_remove_mirror", kind: "mutate", desc: "Remove a mirror (blocked by policy)" },
        ],
      },
      {
        id: "mcp-gateway",
        name: "docker-gateway",
        type: "gateway",
        transport: "primordial",
        url: "https://gateway.docker.com",
        status: "connected",
        policy: "mcp-policy",
        added: "2026-08-28T10:05:00Z",
        tools: [
          { name: "fetch", kind: "read", desc: "Gateway HTTP fetch primitive" },
          { name: "registry_query", kind: "read", desc: "Query image registries" },
        ],
      },
    ],

    // -------------------------------------------------------------------
    // Secrets — masked; injected into sandboxes at runtime, never on disk.
    // -------------------------------------------------------------------
    secrets: [
      { id: "sec-1", name: "DOCKER_PAT", desc: "Docker Hub personal access token", scope: "org", provider: "docker", updated: "2026-08-25T09:00:00Z", value: "dckr_pat_9f2a1c7e4b8d3a6f0e2c" },
      { id: "sec-2", name: "DHI_TOKEN", desc: "Docker Hardened Images catalog token", scope: "org", provider: "dhi.io", updated: "2026-08-25T09:02:00Z", value: "dhi_tok_5b3e9a1f7c2d8e4a6b0f" },
      { id: "sec-3", name: "REGISTRY_PASSWORD", desc: "Internal registry (registry.dockerlabs.xyz)", scope: "project", provider: "registry", updated: "2026-08-26T14:20:00Z", value: "rg_pw_c1d4f7a2e9b6034" },
      { id: "sec-4", name: "COSIGN_KEY", desc: "Keyless signing — Sigstore OIDC", scope: "org", provider: "sigstore", updated: "2026-08-27T11:45:00Z", value: "keyless (OIDC, no key material)" },
    ],

    // -------------------------------------------------------------------
    // Policies — Cedar. The wide-open dev policy and the scoped prod one.
    // -------------------------------------------------------------------
    policies: [
      {
        id: "pol-mcp",
        name: "mcp-policy",
        kind: "cedar",
        target: "MCP access",
        status: "draft",
        mode: "permissive",
        desc: "Wide-open dev policy — permits every MCP action on every resource. Governance turned off.",
        updated: "2026-08-28T10:00:00Z",
        cedar: `permit (
    principal,
    action == MCP::Action::"register",
    resource
);

permit (
    principal,
    action == MCP::Action::"invokeTool",
    resource
);

permit (
    principal,
    action == MCP::Action::"invokePrimordial",
    resource
);`,
      },
      {
        id: "pol-dhi",
        name: "dhi-readonly",
        kind: "cedar",
        target: "MCP access",
        status: "enforced",
        mode: "scoped",
        desc: "Production profile. register + primordials allowed; invokeTool permitted only for the read-only dhi_get_* / dhi_list_* queries. Mirror mutators denied.",
        updated: "2026-08-29T16:30:00Z",
        cedar: `permit (principal, action == MCP::Action::"register", resource);
permit (principal, action == MCP::Action::"invokePrimordial", resource);

permit (principal, action == MCP::Action::"invokeTool", resource)
when {
  resource.server == "remotedhi" &&
  ["dhi_get_image_cves","dhi_get_image_details","dhi_get_image_packages",
   "dhi_get_image_attestations","dhi_get_tag_definition","dhi_get_repository",
   "dhi_list_repositories","dhi_list_mirrors"].contains(resource.tool)
};`,
      },
      {
        id: "pol-gate",
        name: "supply-chain-gate",
        kind: "scout",
        target: "Image / CI",
        status: "enforced",
        mode: "scoped",
        desc: "CI gate that runs before push: no critical CVEs, SBOM required, provenance required.",
        updated: "2026-08-29T16:35:00Z",
        cedar: `# Scout policy gate (evaluated in CI before push)
rule no-critical-cves   { deny when image.cves.critical > 0 }
rule require-sbom       { deny when not image.attestations.sbom }
rule require-provenance { deny when not image.attestations.provenance }`,
      },
    ],

    // -------------------------------------------------------------------
    // Agent teams — configured agents grouped like the real portal.
    // -------------------------------------------------------------------
    teams: [
      { id: "team-dev", name: "Development Team", tag: "development-team", updateAvailable: true,
        desc: "Coding agents that design, implement and orchestrate work inside sandboxes." },
      { id: "team-catalog", name: "Catalog Intelligence Team", tag: "catalog-intelligence", updateAvailable: false,
        desc: "Multi-agent product-evaluation pipeline from catalog-service-ai-enhanced — intake, research, matching and catalog management." },
    ],

    // -------------------------------------------------------------------
    // Agents. `kind: coding` agents are runnable in sandboxes; `kind: service`
    // agents are the Llama-based catalog microservice agents.
    // -------------------------------------------------------------------
    agents: [
      // ---- Development Team (mirrors the official portal) ----
      { id: "ag-architect", name: "architect", team: "development-team", kind: "coding",
        model: "Opus 4.8", color: "#2496ED", default: false,
        desc: "Technical design and architecture specialist. Produces architecture decisions, design docs, and implementation plans. Embeds explorer and planner sub-agents.",
        badges: ["Platform Default", "S2S", "Artifacts", "GitHub"],
        tags: ["filesystem", "shell", "todo"], updated: "2026-05-12T09:00:00Z" },
      { id: "ag-implementer", name: "implementer", team: "development-team", kind: "coding",
        model: "Sonnet 4.6", color: "#1a7f37", default: true,
        desc: "Implementation specialist. Handles coding, bug fixes, refactoring, and tests across any language or framework. Embeds an opus planner, and reports back to the orchestrator.",
        badges: ["Platform Default", "S2S", "Artifacts", "GitHub"],
        tags: ["filesystem", "shell", "todo"], updated: "2026-05-12T09:00:00Z" },
      { id: "ag-orchestrator", name: "orchestrator", team: "development-team", kind: "coding",
        model: "Sonnet 4.6", color: "#7c3aed", default: false,
        desc: "Primary entry point for the development team. Routes requests to specialist agents via S2S, tracks progress, synthesises results, and returns a single answer.",
        badges: ["Platform Default", "Customized", "S2S", "Artifacts", "GitHub"],
        tags: ["filesystem", "shell", "todo"], updated: "2026-05-12T09:00:00Z" },
      { id: "ag-sandbox-coder", name: "sandbox-coder", team: "development-team", kind: "coding",
        model: "Sonnet 4.6", color: "#0ea5e9", default: false,
        desc: "A coding agent with shell and filesystem access for sandbox experimentation and quick scripts.",
        badges: ["S2S", "Artifacts"],
        tags: ["filesystem", "shell"], updated: "2026-08-25T09:00:00Z" },

      // ---- Catalog Intelligence Team (catalog-service-ai-enhanced) ----
      { id: "ag-catalog-orch", name: "catalog-orchestrator", team: "catalog-intelligence", kind: "service",
        model: "Sonnet 4.6", color: "#db2777", default: false,
        desc: "Entry point for the catalog pipeline. Receives a product submission, fans out to intake, research, match and catalog agents, then synthesises an APPROVED / REJECTED decision.",
        badges: ["Platform Default", "Customized", "S2S", "MCP Gateway"],
        tags: ["mcp-gateway", "kafka", "todo"], updated: "2026-08-30T10:00:00Z" },
      { id: "ag-vendor-intake", name: "vendor-intake", team: "catalog-intelligence", kind: "service",
        model: "Llama 3.2 · Model Runner", color: "#d97706", default: false,
        desc: "Evaluates vendor product submissions, scoring 0–100 across innovation & quality, market demand, description clarity, price and vendor credibility. ≥ 70 approves.",
        badges: ["Model Runner", "MCP Gateway", "Artifacts"],
        tags: ["model-runner", "postgres", "mongodb", "scoring"], updated: "2026-08-30T10:05:00Z" },
      { id: "ag-market-research", name: "market-research", team: "catalog-intelligence", kind: "service",
        model: "Llama 3.2 · Model Runner", color: "#0891b2", default: false,
        desc: "Automated competitor analysis. Assesses the competitive landscape and market positioning for each submission and returns a market-potential score.",
        badges: ["Model Runner", "S2S"],
        tags: ["model-runner", "web-search", "kafka"], updated: "2026-08-30T10:06:00Z" },
      { id: "ag-customer-match", name: "customer-match", team: "catalog-intelligence", kind: "service",
        model: "Llama 3.2 · Model Runner", color: "#4f46e5", default: false,
        desc: "Matches products to customer preferences and demographic segments, producing alignment scores per segment.",
        badges: ["Model Runner", "S2S"],
        tags: ["model-runner", "postgres"], updated: "2026-08-30T10:07:00Z" },
      { id: "ag-catalog-mgmt", name: "catalog-management", team: "catalog-intelligence", kind: "service",
        model: "Llama 3.2 · Model Runner", color: "#059669", default: false,
        desc: "Writes approved products to the PostgreSQL catalog, records evaluation history in MongoDB, and publishes events to the product-evaluations Kafka topic.",
        badges: ["Model Runner", "MCP Gateway"],
        tags: ["postgres", "mongodb", "kafka"], updated: "2026-08-30T10:08:00Z" },
    ],

    // -------------------------------------------------------------------
    // Projects — the catalog service the agent containerises.
    // -------------------------------------------------------------------
    projects: [
      {
        id: "proj-catalog",
        name: "catalog-service",
        repo: "git.dockerlabs.xyz/moby/catalog-service",
        branch: "main",
        commit: "a9d0e42",
        language: "Node.js 20",
        desc: "Product Catalog demo — React frontend + Node backend API talking to PostgreSQL, Kafka, LocalStack (S3) and WireMock.",
        components: ["Frontend (React)", "Backend API (Node)", "PostgreSQL", "Kafka", "LocalStack (S3)", "WireMock"],
        updated: "2026-08-28T10:12:00Z",
      },
    ],

    // -------------------------------------------------------------------
    // Artifacts — the baseline image already exists (agent built it on the
    // host in Section 2). The :dhi image appears after a sandbox build.
    // -------------------------------------------------------------------
    artifacts: [
      {
        id: "art-baseline",
        name: "catalog-service:baseline",
        digest: "sha256:3af1c9e0b2d4",
        base: "node:20",
        size: "1.1 GB",
        packages: 431,
        cves: { c: 0, h: 8, m: 41, l: 93 },
        sbom: false, provenance: false, signed: false, nonRoot: false,
        policy: "fail",
        built: "2026-08-28T10:22:00Z",
        builtBy: "claude (on host, unsandboxed)",
      },
    ],

    // -------------------------------------------------------------------
    // Sessions — agent runs. Empty until a sandbox is launched.
    // -------------------------------------------------------------------
    sessions: [],

    // -------------------------------------------------------------------
    // Schedules — recurring jobs.
    // -------------------------------------------------------------------
    schedules: [
      { id: "sch-1", name: "nightly-rebuild", cron: "0 2 * * *", cronText: "Every day at 02:00", action: "Rebuild catalog-service:dhi from hardened base", target: "catalog-service", status: "active", lastRun: "2026-08-31T02:00:00Z", nextRun: "2026-09-02T02:00:00Z" },
      { id: "sch-2", name: "weekly-cve-scan", cron: "0 6 * * 1", cronText: "Mondays at 06:00", action: "docker scout cves on all artifacts", target: "all artifacts", status: "active", lastRun: "2026-08-31T06:00:00Z", nextRun: "2026-09-07T06:00:00Z" },
      { id: "sch-3", name: "policy-drift-check", cron: "0 */6 * * *", cronText: "Every 6 hours", action: "Re-evaluate Cedar MCP policies", target: "all sandboxes", status: "paused", lastRun: "2026-08-30T18:00:00Z", nextRun: "—" },
    ],

    // -------------------------------------------------------------------
    // Tasks — supply-chain work items.
    // -------------------------------------------------------------------
    tasks: [
      { id: "tk-1", title: "Migrate catalog-service to Docker Hardened Image", status: "done", priority: "high", assignee: "codex", project: "catalog-service", updated: "2026-08-29T12:00:00Z" },
      { id: "tk-2", title: "Attach SBOM + SLSA provenance at build", status: "done", priority: "high", assignee: "codex", project: "catalog-service", updated: "2026-08-29T13:10:00Z" },
      { id: "tk-3", title: "Add cosign keyless signing to pipeline", status: "in_progress", priority: "high", assignee: "claude", project: "catalog-service", updated: "2026-08-30T09:30:00Z" },
      { id: "tk-4", title: "Scope Cedar policy to deny mirror mutators", status: "done", priority: "medium", assignee: "platform", project: "catalog-service", updated: "2026-08-29T16:30:00Z" },
      { id: "tk-5", title: "Wire Scout policy gate before registry push", status: "in_progress", priority: "high", assignee: "platform", project: "catalog-service", updated: "2026-08-30T10:00:00Z" },
      { id: "tk-6", title: "Document sandbox environment file (.sbxenv.yaml)", status: "todo", priority: "low", assignee: "unassigned", project: "catalog-service", updated: "2026-08-30T11:00:00Z" },
    ],

    counters: { sandbox: 0, session: 0 },
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  const s = seed();
  persist(s);
  return s;
}

function persist(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s || state)); } catch (_) {}
}

// ---- pub/sub ----
const subs = new Set();
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
function emit() { persist(); subs.forEach((fn) => fn()); }

// ---- accessors ----
export function get() { return state; }
export function getCol(name) { return state[name] || []; }
export function find(col, id) { return (state[col] || []).find((x) => x.id === id); }

export function add(col, item) {
  state[col] = state[col] || [];
  state[col].unshift(item);
  emit();
  return item;
}
export function update(col, id, patch) {
  const item = find(col, id);
  if (item) Object.assign(item, patch);
  emit();
  return item;
}
export function remove(col, id) {
  state[col] = (state[col] || []).filter((x) => x.id !== id);
  emit();
}
export function nextCount(key) {
  state.counters[key] = (state.counters[key] || 0) + 1;
  return state.counters[key];
}
export function mutate(fn) { fn(state); emit(); }

export function resetAll() {
  state = seed();
  persist(state);
  subs.forEach((fn) => fn());
}

// ---- auth (separate key so reset-data doesn't log you out) ----
export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
export function login(email) {
  const user = { email, name: email.split("@")[0], org: state.org };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}
export function logout() { localStorage.removeItem(SESSION_KEY); }

// unique id helper
export function uid(prefix) {
  return prefix + "-" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
}
