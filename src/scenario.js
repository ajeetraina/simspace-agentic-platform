// ---------------------------------------------------------------------------
// Shared Product Catalog scenario logic, so the sandbox detail page and the
// interactive terminal both produce the same hardened :dhi artifact + session.
// ---------------------------------------------------------------------------
import { get, getCol, find, add, update, uid } from "./store.js";

export const DHI_IMAGE = "catalog-service:dhi";

// Create (or refresh) the hardened catalog-service:dhi artifact — the outcome
// of running the sandboxed agent against the DHI MCP server.
export function buildDhiArtifact(builtBy = "codex (sandboxed)") {
  const existing = getCol("artifacts").find((a) => a.name === DHI_IMAGE);
  const data = {
    name: DHI_IMAGE,
    digest: "sha256:9e2b71c4a0f8",
    base: "dhi.io/node:24-debian13",
    size: "84 MB",
    packages: 78,
    cves: { c: 0, h: 0, m: 1, l: 4 },
    sbom: true, provenance: true, signed: true, nonRoot: true,
    policy: "pass",
    built: new Date().toISOString(),
    builtBy,
  };
  if (existing) { update("artifacts", existing.id, data); return existing.id; }
  const id = uid("art");
  add("artifacts", { id, ...data });
  return id;
}

// Start a new agent session tied to a sandbox.
export function startSession(sandbox, { prompt, staticMcp } = {}) {
  const id = uid("sess");
  const session = {
    id,
    agent: sandbox.agent,
    sandbox: sandbox.name,
    sandboxId: sandbox.id,
    project: sandbox.project,
    status: "running",
    prompt: prompt || null,
    mcp: staticMcp || sandbox.mcp || [],
    started: new Date().toISOString(),
    turns: prompt ? 6 : 0,
    toolCalls: prompt ? [
      "remotedhi__dhi_list_repositories",
      "remotedhi__dhi_get_tag_definition (node:24-debian13)",
      "remotedhi__dhi_get_image_cves (0C·0H·0M·0L)",
      "remotedhi__dhi_get_image_attestations (SBOM+SLSA, signed)",
    ] : [],
  };
  add("sessions", session);
  return session;
}

// Baseline vs hardened comparison numbers used on the dashboard & artifacts.
export const COMPARE = {
  baseline: { label: "catalog-service:baseline", base: "node:20", cves: { c: 0, h: 8, m: 41, l: 93 }, pkgs: 431, size: "1.1 GB", signed: false, sbom: false, root: true },
  dhi: { label: "catalog-service:dhi", base: "dhi.io/node:24-debian13", cves: { c: 0, h: 0, m: 1, l: 4 }, pkgs: 78, size: "84 MB", signed: true, sbom: true, root: false },
};
