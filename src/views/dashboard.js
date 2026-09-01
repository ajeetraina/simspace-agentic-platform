import { el, icon, badge, cveChips, pageHead, sectionTitle, timeAgo } from "../ui.js";
import { getCol } from "../store.js";
import { navigate } from "../router.js";
import { COMPARE } from "../scenario.js";

function stat(label, value, sub, tone) {
  return el("div", { class: "card stat" },
    el("div", { class: "label" }, label),
    el("div", { class: "value" }, value, sub ? el("small", {}, " " + sub) : null),
    tone ? el("div", { class: "delta" }, tone) : null);
}

export function renderDashboard() {
  const sandboxes = getCol("sandboxes");
  const artifacts = getCol("artifacts");
  const sessions = getCol("sessions");
  const policies = getCol("policies");
  const running = sandboxes.filter((s) => s.status === "running" || s.status === "building").length;
  const enforced = policies.filter((p) => p.status === "enforced").length;
  const dhi = artifacts.find((a) => a.name.endsWith(":dhi"));
  const passing = artifacts.filter((a) => a.policy === "pass").length;

  const wrap = el("div", {},
    pageHead("Dashboard", "Overview of your agentic supply chain — sandboxes, sessions, artifacts and governance posture."));

  wrap.append(el("div", { class: "grid stat-grid" },
    stat("Sandboxes running", String(running), `/ ${sandboxes.length} total`, el("span", { class: "muted" }, "isolated microVMs")),
    stat("Agent sessions", String(sessions.length), null, el("span", { class: "muted" }, sessions.filter((s) => s.status === "running").length + " active")),
    stat("Artifacts", String(artifacts.length), null,
      el("span", { class: passing === artifacts.length && artifacts.length ? "" : "muted" }, `${passing}/${artifacts.length} pass policy`)),
    stat("Policies enforced", String(enforced), `/ ${policies.length}`, el("span", { class: "badge badge-green" }, "governance on")),
  ));

  // Supply-chain progress flow
  wrap.append(sectionTitle("Supply-chain hardening"));
  const steps = [
    ["Agent build", true],
    ["SBOM · VEX · SLSA", !!dhi],
    ["Hardened base", !!dhi],
    ["Verify & gate", !!dhi],
    ["Build sandbox", running > 0],
  ];
  const flow = el("div", { class: "flow-diagram" });
  steps.forEach(([label, on], i) => {
    flow.append(el("span", { class: "node" + (on ? " on" : "") }, (on ? "✓ " : "") + label));
    if (i < steps.length - 1) flow.append(el("span", { class: "arr" }, "→"));
  });
  wrap.append(el("div", { class: "card" }, flow));

  // Baseline vs hardened comparison
  wrap.append(el("div", { id: "tour-compare" }, sectionTitle("catalog-service: what the agent shipped vs. what it should have")));
  const c = COMPARE;
  const compare = el("div", { class: "table-wrap" },
    el("table", { class: "table" },
      el("thead", {}, el("tr", {},
        el("th", {}, ""), el("th", {}, "Unsandboxed (host)"), el("th", {}, "Sandboxed (DHI MCP)"))),
      el("tbody", {},
        row("Image", el("span", { class: "mono" }, c.baseline.label), dhi ? el("span", { class: "mono" }, c.dhi.label) : el("span", { class: "muted" }, "not built yet")),
        row("Base", c.baseline.base, dhi ? c.dhi.base : "—"),
        row("CVEs", cveChips(c.baseline.cves), dhi ? cveChips(c.dhi.cves) : el("span", { class: "muted" }, "—")),
        row("Packages", String(c.baseline.pkgs), dhi ? String(c.dhi.pkgs) : "—"),
        row("Size", c.baseline.size, dhi ? c.dhi.size : "—"),
        row("Signed", badge("no", "red"), dhi ? badge("yes", "green") : el("span", { class: "muted" }, "—")),
        row("SBOM + provenance", badge("none", "red"), dhi ? badge("attached", "green") : el("span", { class: "muted" }, "—")),
        row("Runs as", badge("root", "amber"), dhi ? badge("non-root", "green") : el("span", { class: "muted" }, "—")),
      )));
  wrap.append(compare);
  if (!dhi) wrap.append(el("p", { class: "muted", style: "margin-top:10px" },
    "Launch a sandbox with the DHI MCP server and run the agent build to fill the right column. ",
    el("a", { href: "#/sandboxes", onClick: () => navigate("sandboxes") }, "Go to Sandboxes →")));

  // Two kinds of agents, one governance model
  wrap.append(el("div", { id: "tour-two-kinds" }, sectionTitle("Two kinds of agents, one governance model")));
  const agentCard = (title, tagline, body, tone) => el("div", { class: "card link", onClick: () => navigate("agents"),
    style: `border-left:3px solid ${tone}` },
    el("div", { class: "card-title", style: "margin-bottom:4px" }, icon("bot", "ico"), title),
    el("div", { class: "card-sub", style: "font-weight:600;color:var(--text)" }, tagline),
    el("p", { class: "muted", style: "margin:8px 0 0;font-size:12.5px" }, body));
  wrap.append(el("div", { class: "grid", style: "grid-template-columns:1fr 1fr;gap:16px" },
    agentCard("Development Team", "Agents that BUILD your software",
      "architect · implementer · orchestrator. Boxed in a microVM, pointed at the DHI MCP server, scoped by the dhi-readonly Cedar policy.", "#2496ED"),
    agentCard("Catalog Intelligence Team", "Agents that RUN inside your product",
      "vendor-intake · market-research · customer-match · catalog-management (Llama 3.2 on Docker Model Runner). Tools via the MCP gateway; decisions audited to MongoDB & Kafka.", "#db2777"),
  ));
  wrap.append(el("p", { class: "muted", style: "margin-top:10px" },
    "From ", el("span", { class: "mono" }, "FROM dhi.io/node:24"), " to ", el("span", { class: "mono" }, "APPROVED 87/100"),
    " — the same platform governs the agents that build your app and the agents that run inside it. ",
    el("a", { href: "#/agents", onClick: () => navigate("agents") }, "See the teams →")));

  // Recent sessions
  wrap.append(sectionTitle("Recent sessions"));
  if (!sessions.length) wrap.append(el("div", { class: "empty" }, "No sessions yet. Run an agent inside a sandbox."));
  else {
    const list = el("div", { class: "grid grid-cards" });
    sessions.slice(0, 3).forEach((s) => list.append(el("div", { class: "card link", onClick: () => navigate("sessions/" + s.id) },
      el("div", { class: "card-head" }, el("div", { class: "card-title" }, icon("msg", "ico"), s.agent),
        badge(s.status, s.status === "running" ? "green" : "gray", s.status === "running")),
      el("div", { class: "card-sub" }, s.sandbox + " · " + timeAgo(s.started)))));
    wrap.append(list);
  }

  return wrap;
}

function row(label, a, b) {
  return el("tr", {}, el("td", {}, el("b", {}, label)), el("td", {}, a), el("td", {}, b));
}
