// ---------------------------------------------------------------------------
// Command simulator for the Interactive terminal. Faithful to the
// simspace-agentic-security lab's simulator.yaml. Pure text in, lines out,
// with optional side-effects on the store.
// ---------------------------------------------------------------------------
import { get, getCol, find, add, update, uid, nextCount, mutate } from "./store.js";
import { buildDhiArtifact, startSession } from "./scenario.js";

const L = (text, cls = "") => ({ text, cls });
const ok = (t) => L(t, "ok");
const warn = (t) => L(t, "warn");
const err = (t) => L(t, "err");
const dim = (t) => L(t, "dim");

// Each handler returns { lines: [], effect?: () => void }
export function runCommand(raw) {
  const cmd = raw.trim();
  if (!cmd) return { lines: [] };
  const parts = cmd.split(/\s+/);
  const state = get();

  // ---- built-ins ----
  if (cmd === "clear") return { lines: [], clear: true };
  if (cmd === "help") return { lines: helpLines() };
  if (cmd === "ls") return { lines: ["Dockerfile  compose.yaml  package.json  src/  frontend/  README.md"].map((t) => L(t)) };
  if (cmd === "tree") return { lines: treeLines() };
  if (cmd === "pwd") return { lines: [L("/workspace/catalog-service")] };
  if (/^cat\s+Dockerfile/.test(cmd)) return { lines: dockerfileLines() };
  if (cmd === "docker version") return { lines: ["Client:", " Version:    29.6.2", "Server:", " Version:    29.6.2"].map((t) => L(t)) };
  if (parts[0] === "git" && cmd.includes("--version")) return { lines: [L("git version 2.45.2")] };
  if (parts[0] === "git" && parts[1] === "clone") return { lines: gitClone() };

  // ---- docker login ----
  if (parts[0] === "docker" && parts[1] === "login")
    return { lines: [dim("Authenticating with existing credentials..."), ok("Login Succeeded")] };

  // ---- the unsandboxed agent build (already done in seed) ----
  if (parts[0] === "claude" && cmd.includes("-p"))
    return agentContainerise();

  // ---- docker scout ----
  if (parts[0] === "docker" && parts[1] === "scout") {
    if (parts[2] === "quickview") {
      if (cmd.includes(":dhi")) return dhiBuilt() ? { lines: quickviewDhi() } : notBuilt("catalog-service:dhi");
      return { lines: quickviewBaseline() };
    }
    if (parts[2] === "compare") return dhiBuilt() ? { lines: scoutCompare() } : notBuilt("catalog-service:dhi");
    if (parts[2] === "policy") return { lines: scoutPolicy() };
    if (parts[2] === "attest") return { lines: scoutAttest(cmd) };
    if (parts[2] === "cves") return { lines: quickviewBaseline() };
  }
  if (parts[0] === "docker" && parts[1] === "images")
    return { lines: dockerImages(cmd) };

  // ---- sbx ----
  if (parts[0] === "sbx") return sbxCommand(parts, cmd);

  // ---- npm ----
  if (cmd.startsWith("npm ls")) return { lines: [L("431")] };

  return { lines: [err("command not found — this command isn't part of the lab. Type 'help'.")] };
}

// ---------------------------------------------------------------------------
function dhiBuilt() { return getCol("artifacts").some((a) => a.name === "catalog-service:dhi"); }
function mcpAdded() { return getCol("sandboxes").some((s) => (s.mcp || []).includes("remotedhi")) || get()._sbxMcpAdded; }

function notBuilt(img) {
  return { lines: [err(`No such image: ${img}`), dim("Build it first: sbx run codex --static-mcp remotedhi -p \"...\"")] };
}

function helpLines() {
  return [
    L("Simulated shell — Product Catalog supply-chain lab. Try:", "ok"),
    L(""),
    dim("  Environment"),
    L("  docker version            git --version            docker login dhi.io"),
    dim("  Section 2 — the agent builds it (unsandboxed)"),
    L("  claude -p \"Containerise this Node.js app...\""),
    L("  docker scout quickview catalog-service:baseline"),
    L("  docker scout policy catalog-service:baseline     docker images catalog-service:baseline"),
    dim("  Section 4 — the agent's build sandbox"),
    L("  sbx daemon start          sbx mcp ls               sbx mcp add remotedhi --url https://dhi.io/mcp"),
    L("  sbx mcp inspect remotedhi sbx run codex --static-mcp remotedhi -p \"Containerise catalog-service...\""),
    L("  sbx env run               sbx env rm"),
    dim("  Section 3 — verify & compare"),
    L("  docker scout quickview catalog-service:dhi        docker scout compare --to catalog-service:baseline catalog-service:dhi"),
    L(""),
    dim("  ls · tree · cat Dockerfile · clear"),
  ];
}

function treeLines() {
  return [
    ".", "├── Dockerfile", "├── compose.yaml", "├── package.json",
    "├── frontend/", "│   ├── Dockerfile", "│   └── src/",
    "├── src/", "│   ├── index.js", "│   └── routes/products.js",
    "└── README.md",
  ].map((t) => L(t));
}

function dockerfileLines() {
  if (dhiBuilt()) return [
    dim("# Multi-stage — DHI dev variant to build, distroless runtime to ship"),
    L("FROM dhi.io/node:24-debian13-dev AS base"),
    L("WORKDIR /app"),
    L("COPY package*.json ./"),
    L("RUN npm ci --omit=dev"),
    L(""),
    L("FROM dhi.io/node:24-debian13 AS runtime"),
    L("WORKDIR /app"),
    L("COPY --from=base /app/node_modules ./node_modules"),
    L("COPY . ."),
    L("USER nonroot"),
    L("EXPOSE 3000"),
    L('CMD ["node", "src/index.js"]'),
  ];
  return [
    dim("# Generated by the agent — no base pinned, no user, no multi-stage"),
    L("FROM node:20"),
    L("WORKDIR /usr/src/app"),
    L("COPY package*.json ./"),
    L("RUN npm install --production"),
    L("COPY . ."),
    L("EXPOSE 3000"),
    L('CMD ["node", "src/index.js"]'),
  ];
}

function gitClone() {
  return [
    "Cloning into 'product-catalog-demo-showcase'...",
    dim("remote: Enumerating objects: 142, done."),
    "remote: Counting objects: 100% (142/142), done.",
    "Receiving objects: 100% (142/142), 48.71 KiB | 4.87 MiB/s, done.",
    "Resolving deltas: 100% (38/38), done.",
  ].map((t) => typeof t === "string" ? L(t) : t);
}

function agentContainerise() {
  return {
    lines: [
      dim("⏺ Reading project files..."),
      dim("⏺ Picking a base image..."),
      L("⏺ Selected FROM node:20", "warn"),
      dim("⏺ Writing Dockerfile, resolving dependency tree (431 packages)..."),
      dim("⏺ Building catalog-service:baseline..."),
      ok("✓ Built catalog-service:baseline (node:20 · ~1.1GB · 431 pkgs)"),
      L(""),
      dim("No errors, no warnings, no questions. But: nobody chose node:20, 431 packages"),
      dim("went unreviewed, and there's no proof of where any of it came from."),
      L("→ Freeze here. Run: docker scout quickview catalog-service:baseline", "warn"),
    ],
  };
}

function quickviewBaseline() {
  return [
    ok("    ✓ Image stored for indexing"),
    ok("    ✓ Indexed 431 packages"),
    L("  Target             │  catalog-service:baseline  │    0C     8H    41M    93L"),
    dim("    digest           │  3af1c9e0b2d4              │"),
    L("  Base image  node:20 │  updatable to node:24     │    0C     6H    30M    54L"),
    L(""),
    dim("  What's next:"),
    dim("    View recommendations → docker scout recommendations catalog-service:baseline"),
  ];
}

function quickviewDhi() {
  return [
    ok("    ✓ Indexed 78 packages"),
    L("  Target                          │  catalog-service:dhi  │    0C     0H     1M     4L"),
    dim("    digest                        │  9e2b71c4a0f8         │"),
    L("  Base  dhi.io/node:24-debian13    │  0 known CVEs          │    0C     0H     0M     0L"),
    L(""),
    ok("  SBOM attached · SLSA provenance attached · signed · runs non-root"),
  ];
}

function scoutCompare() {
  return [
    dim("    ✓ Comparing catalog-service:dhi → catalog-service:baseline"),
    L("                          │  baseline   │  dhi     │  change"),
    L("  Critical                │  0          │  0       │   0"),
    L("  High                    │  8          │  0       │  -8", "ok"),
    L("  Medium                  │  41         │  1       │  -40", "ok"),
    L("  Low                     │  93         │  4       │  -89", "ok"),
    L("  Packages                │  431        │  78      │  -353", "ok"),
    L("  Size                    │  1.1GB      │  84MB    │  -93%", "ok"),
    L(""),
    ok("  Same app. Same behaviour. A fraction of the attack surface."),
  ];
}

function scoutPolicy() {
  const dhi = dhiBuilt();
  if (dhi) return [
    ok("  ✓ no-critical-cves     PASSED"),
    ok("  ✓ require-sbom         PASSED"),
    ok("  ✓ require-provenance   PASSED"),
    ok("  gate: 3/3 passed → image allowed"),
  ];
  return [
    err("  ✗ no-critical-cves     FAILED  (policy evaluated against baseline)"),
    err("  ✗ require-sbom         FAILED  (no SBOM attestation)"),
    err("  ✗ require-provenance   FAILED  (no provenance attestation)"),
    err("  gate: 0/3 passed → image blocked"),
  ];
}

function scoutAttest(cmd) {
  if (!dhiBuilt()) return [err("✗ No attestations found on this digest"), err("✗ Nothing to verify — signature check cannot run")];
  return [
    L("$ docker scout attest get …/catalog-service:dhi --predicate-type slsa/provenance --verify"),
    ok("  ✓ SBOM (CycloneDX) present"),
    ok("  ✓ SLSA provenance present"),
    ok("  ✓ Signature verified — traces to trusted builder (Sigstore)"),
  ];
}

function dockerImages(cmd) {
  const dhi = cmd.includes(":dhi");
  const header = "REPOSITORY        TAG        IMAGE ID       SIZE";
  if (dhi && dhiBuilt()) return [header, "catalog-service   dhi        9e2b71c4a0f8   84MB"].map((t) => L(t));
  if (dhi) return notBuilt("catalog-service:dhi").lines;
  return [header, "catalog-service   baseline   3af1c9e0b2d4   1.1GB"].map((t) => L(t));
}

// ---------------------------------------------------------------------------
function sbxCommand(parts, cmd) {
  const sub = parts[1];

  if (sub === "daemon" && parts[2] === "start")
    return { lines: [dim("Starting sbx daemon..."), ok("  microVM booted: own daemon, own network, host mounted read-only."), ok("sbx daemon running (background).")] };
  if (sub === "daemon" && parts[2] === "stop")
    return { lines: [L("sbx daemon stopped.")] };

  if (sub === "mcp" && parts[2] === "ls") {
    if (mcpAdded()) return { lines: ["NAME        TYPE     URL", "remotedhi   remote   https://dhi.io/mcp", "", "1 MCP server configured."].map((t) => L(t)) };
    return { lines: [warn("No MCP servers configured. Add one with: sbx mcp add <name> --url <url>")] };
  }
  if (sub === "mcp" && parts[2] === "add") {
    return {
      lines: [
        ok(`Added MCP server 'remotedhi' (remote) -> https://dhi.io/mcp`),
        dim("  transport: streamable-http"),
        dim("  its tools are available to agents in the sandbox, governed by your MCP policy."),
      ],
      effect: () => mutate((s) => { s._sbxMcpAdded = true; }),
    };
  }
  if (sub === "mcp" && parts[2] === "inspect")
    return { lines: ["Name:      remotedhi", "Type:      remote", "URL:       https://dhi.io/mcp", "Transport: streamable-http"].map((t) => L(t)) };

  if (sub === "run") {
    if (cmd.includes("-p")) return sbxAgentBuild(cmd);
    return {
      lines: [ok("Attaching to codex session inside sandbox..."), dim("Tools: gateway + remotedhi (type /mcp to list). Ctrl-D to exit."),
        L("Run with -p to hand it the containerise prompt.", "warn")],
    };
  }

  if (sub === "env" && parts[2] === "run") return sbxEnvRun();
  if (sub === "env" && parts[2] === "rm")
    return { lines: [ok("Tore down sandbox 'catalog-sandbox' — microVM and workspace destroyed.")] };

  return { lines: [err("unknown sbx subcommand. Try: sbx daemon start | sbx mcp ls | sbx run codex -p \"...\"")] };
}

function sbxAgentBuild(cmd) {
  const already = dhiBuilt();
  return {
    lines: [
      dim("⏺ Sandbox: microVM boundary active. Agent has full permissions — inside the box."),
      dim("⏺ Querying DHI MCP server before writing FROM..."),
      ok("  → remotedhi__dhi_list_repositories"),
      ok("  → remotedhi__dhi_get_tag_definition  (node:24-debian13)"),
      ok("  → remotedhi__dhi_get_image_cves      (0C · 0H · 0M · 0L)"),
      ok("  → remotedhi__dhi_get_image_attestations (SBOM + SLSA, signed)"),
      dim("⏺ Writing multi-stage Dockerfile: -dev to build, distroless to ship..."),
      dim("⏺ Building catalog-service:dhi..."),
      ok("✓ Built catalog-service:dhi — 0C·0H·1M·4L · 78 pkgs · SBOM attached · signed · non-root"),
      L(""),
      dim(already ? "(refreshed the existing artifact)" : "Same hardened image you'd reach by hand — the agent chose the safe path on its own."),
      L("→ Verify: docker scout compare --to catalog-service:baseline catalog-service:dhi", "warn"),
    ],
    effect: () => {
      buildDhiArtifact("codex (sandboxed · terminal)");
      const sbx = getCol("sandboxes").find((s) => (s.mcp || []).includes("remotedhi"))
        || { id: "sbx-terminal", name: "catalog-sandbox", agent: "codex", project: "catalog-service", mcp: ["remotedhi"] };
      startSession(sbx, { prompt: "Containerise catalog-service for production. Choose a hardened base image, keep the final image shell-free, and attach an SBOM.", staticMcp: ["remotedhi"] });
    },
  };
}

function sbxEnvRun() {
  return {
    lines: [
      dim("Reading .sbxenv.yaml from working directory..."),
      ok("✓ Created sandbox 'catalog-sandbox' (agent: codex)"),
      ok("✓ Registered MCP server 'remotedhi' -> https://dhi.io/mcp"),
      ok("✓ Applied governance profile 'dhi-readonly' (mirror mutators denied)"),
      ok("✓ Cloned workspace catalog-service (clone: true)"),
      dim("Attaching to codex session... the whole box, from one file in the repo."),
    ],
    effect: () => {
      const exists = getCol("sandboxes").some((s) => s.name === "catalog-sandbox");
      if (!exists) {
        nextCount("sandbox");
        add("sandboxes", {
          id: uid("sbx"), name: "catalog-sandbox", agent: "codex", project: "catalog-service",
          workspace: "catalog-service", base: "dhi.io/node (queried via MCP)", mcp: ["remotedhi"],
          policy: "dhi-readonly", status: "running", started: new Date().toISOString(),
          vcpu: 4, memory: "8 GB", disk: "20 GB", built: false,
        });
      }
      mutate((s) => { s._sbxMcpAdded = true; });
    },
  };
}
