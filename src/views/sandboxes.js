import {
  el, icon, badge, statusBadge, cveChips, toast, modal, confirmDialog, field, input, select,
  pageHead, sectionTitle, fmtDate, timeAgo, delay,
} from "../ui.js";
import { getCol, find, add, update, remove, uid, nextCount } from "../store.js";
import { navigate } from "../router.js";
import { buildDhiArtifact, startSession } from "../scenario.js";

export function renderSandboxes() {
  const sandboxes = getCol("sandboxes");
  const wrap = el("div", {},
    pageHead(
      "Sandboxes",
      "Sandboxes are isolated microVMs where your agents do their work. See everything running or stopped, track status, or open one to pick up where you left off.",
      [
        el("button", { class: "btn", onClick: () => navigate("kits") }, icon("box"), "Browse kits"),
        el("button", { class: "btn btn-primary", onClick: () => openNewSandbox() }, icon("plus"), "New sandbox"),
      ],
    ),
  );

  if (!sandboxes.length) {
    wrap.append(el("div", { class: "empty" },
      el("div", { class: "big" }, "📦"),
      el("div", {}, "No sandboxes running yet."),
      el("div", { style: "margin-top:14px" },
        el("button", { class: "btn btn-primary", onClick: openNewSandbox }, icon("plus"), "New sandbox")),
    ));
    return wrap;
  }

  const grid = el("div", { class: "grid grid-cards" });
  for (const s of sandboxes) {
    grid.append(el("div", { class: "card link", onClick: () => navigate("sandboxes/" + s.id) },
      el("div", { class: "card-head" },
        el("div", { class: "card-title" }, icon("box", "ico"), s.name),
        statusBadge(s.status)),
      el("div", { class: "card-sub" }, "microVM · " + s.agent + " · " + s.workspace),
      el("div", { class: "card-meta" },
        el("span", {}, "Base ", el("b", {}, s.base)),
        el("span", {}, "MCP ", el("b", {}, (s.mcp || []).length ? s.mcp.join(", ") : "none")),
        el("span", {}, "Policy ", el("b", {}, s.policy)),
        el("span", {}, "Started ", el("b", {}, timeAgo(s.started))),
      ),
    ));
  }
  wrap.append(grid);
  return wrap;
}

export function openNewSandbox(preselect, presetKits) {
  const agents = getCol("agents").filter((a) => a.kind === "coding");
  const projects = getCol("projects");
  const mcpServers = getCol("mcpServers");
  const policies = getCol("policies").filter((p) => p.target === "MCP access");
  const mixinKits = getCol("kits").filter((k) => k.kind === "mixin");

  const defaultAgent = preselect || (agents.find((a) => a.default) || agents[0])?.name;
  const name = input({ value: "catalog-sandbox" });
  const agentSel = select(agents.map((a) => ({ value: a.name, label: `${a.name} — ${a.model}` })), { value: defaultAgent });
  const projectSel = select(projects.map((p) => ({ value: p.name, label: p.name })), { value: projects[0]?.name });
  const policySel = select(policies.map((p) => ({ value: p.name, label: `${p.name} (${p.mode})` })), { value: "dhi-readonly" });

  // MCP multi-select as checkboxes
  const mcpChoices = mcpServers.map((m) => {
    const cb = el("input", { type: "checkbox", checked: m.name === "remotedhi", value: m.name });
    return { cb, node: el("label", { class: "radio-card", style: "cursor:pointer" }, cb,
      el("div", {}, el("div", { class: "t" }, m.name), el("div", { class: "d" }, m.type + " · " + m.url))) };
  });

  // Compose from mixin kits — checking one auto-wires the MCP servers and
  // policy it declares, showing kit → primitive composition.
  const defaultKits = presetKits || ["dhi-mcp"];
  const applyKit = (k, on) => {
    if (!on) return;
    (k.wires.mcp || []).forEach((n) => { const c = mcpChoices.find((x) => x.cb.value === n); if (c) c.cb.checked = true; });
    if (k.wires.policy) policySel.value = k.wires.policy;
  };
  const kitChoices = mixinKits.map((k) => {
    const cb = el("input", { type: "checkbox", checked: defaultKits.includes(k.name), value: k.name });
    cb.addEventListener("change", () => applyKit(k, cb.checked));
    return { k, cb, node: el("label", { class: "radio-card", style: "cursor:pointer" }, cb,
      el("div", {}, el("div", { class: "t mono" }, k.name), el("div", { class: "d" }, k.desc.slice(0, 52) + "…"))) };
  });

  const body = el("div", {},
    field("Name", name),
    field("Agent (sandbox kit)", agentSel, "The coding agent that runs inside the microVM — its sandbox kit."),
    field("Workspace (project)", projectSel, "Cloned read-write into the sandbox; your host stays read-only."),
    field(
      el("span", {}, "Compose from kits (mixins) ", el("a", { href: "#/kits", style: "font-weight:400", onClick: (e) => { e.preventDefault(); navigate("kits"); } }, "browse all →")),
      el("div", { class: "radio-cards" }, ...kitChoices.map((c) => c.node)),
      "Each mixin wires in MCP servers, credentials, network rules and setup — checking one auto-selects what it declares below."),
    field("MCP servers", el("div", { class: "radio-cards" }, ...mcpChoices.map((c) => c.node)),
      "Tools the sandboxed agent may reach, governed by the policy below."),
    field("Governance profile", policySel, "Cedar policy enforced over register / invokeTool / invokePrimordial."),
  );

  modal({
    title: "New sandbox",
    subtitle: "Launch an isolated microVM — own daemon, own network, host mounted read-only.",
    wide: true,
    body,
    submitLabel: "Create sandbox",
    onSubmit: async () => {
      const nm = name.value.trim();
      if (!nm) { toast("Name is required", "err"); return false; }
      const mcp = mcpChoices.filter((c) => c.cb.checked).map((c) => c.cb.value);
      const kits = kitChoices.filter((c) => c.cb.checked).map((c) => c.cb.value);
      const id = uid("sbx");
      nextCount("sandbox");
      add("sandboxes", {
        id, name: nm, agent: agentSel.value, project: projectSel.value,
        workspace: projectSel.value, base: "dhi.io/node (queried via MCP)",
        mcp, kits, policy: policySel.value, status: "starting",
        started: new Date().toISOString(), vcpu: 4, memory: "8 GB", disk: "20 GB",
        built: false,
      });
      toast("Sandbox microVM booting…");
      navigate("sandboxes/" + id);
      // Simulate boot
      await delay(1400);
      update("sandboxes", id, { status: "running" });
      return true;
    },
  });
}

export function renderSandboxDetail(id) {
  const s = find("sandboxes", id);
  if (!s) return el("div", {}, el("div", { class: "back", onClick: () => navigate("sandboxes") }, icon("back", "ico"), "Sandboxes"),
    el("div", { class: "empty" }, "Sandbox not found."));

  const wrap = el("div", {});
  wrap.append(el("div", { class: "back", onClick: () => navigate("sandboxes") }, icon("back", "ico"), "Back to Sandboxes"));
  wrap.append(el("div", { class: "detail-head" },
    icon("box", "ico"),
    el("h1", {}, s.name),
    statusBadge(s.status)));
  wrap.append(el("p", { class: "muted", style: "margin:0 0 8px" },
    "Isolated microVM — own Docker daemon, own network, host mounted read-only."));

  // Actions
  const actions = el("div", { class: "page-actions", style: "margin:16px 0" });
  const buildBtn = el("button", { class: "btn btn-primary", disabled: s.status !== "running", onClick: runBuild },
    icon("play", "ico"), s.built ? "Re-run agent build" : "Run agent build");
  actions.append(buildBtn);
  if (s.status === "running")
    actions.append(el("button", { class: "btn", onClick: () => { update("sandboxes", id, { status: "stopped" }); toast("Sandbox stopped"); } }, icon("stop", "ico"), "Stop"));
  else
    actions.append(el("button", { class: "btn", onClick: () => { update("sandboxes", id, { status: "running" }); toast("Sandbox started"); } }, icon("play", "ico"), "Start"));
  actions.append(el("button", { class: "btn", onClick: () => navigate("interactive") }, icon("terminal", "ico"), "Open terminal"));
  actions.append(el("button", { class: "btn btn-danger", onClick: () => confirmDialog({
    title: "Delete sandbox", message: `Tear down ${s.name}? The microVM and its workspace are destroyed.`,
    confirmLabel: "Delete", onConfirm: () => { remove("sandboxes", id); toast("Sandbox deleted"); navigate("sandboxes"); },
  }) }, icon("trash", "ico"), "Delete"));
  wrap.append(actions);

  // Body grid
  const config = el("div", { class: "panel", style: "padding:20px" },
    el("dl", { class: "kv" },
      el("dt", {}, "Agent"), el("dd", {}, s.agent),
      el("dt", {}, "Workspace"), el("dd", {}, el("span", { class: "mono" }, s.workspace + "/ (clone: true)")),
      el("dt", {}, "Base image"), el("dd", {}, el("span", { class: "mono" }, s.base)),
      el("dt", {}, "Resources"), el("dd", {}, `${s.vcpu} vCPU · ${s.memory} RAM · ${s.disk} disk`),
      el("dt", {}, "Network"), el("dd", {}, "isolated · egress via MCP gateway"),
      el("dt", {}, "Host mount"), el("dd", {}, badge("read-only", "gray")),
      el("dt", {}, "Composed from"), el("dd", {}, el("span", { class: "mono" }, s.agent),
        ...((s.kits || []).map((k) => el("a", { href: "#/kits", style: "margin-left:6px", onClick: (e) => { e.preventDefault(); navigate("kits"); } },
          el("span", { class: "tool-pill", style: "cursor:pointer" }, "+ " + k))))),
      el("dt", {}, "Started"), el("dd", {}, fmtDate(s.started)),
    ));

  const mcpPanel = el("div", { class: "panel", style: "padding:20px" },
    el("div", { class: "card-title", style: "margin-bottom:12px" }, icon("share", "ico"), "Attached MCP servers"),
    ...(s.mcp && s.mcp.length
      ? s.mcp.map((n) => el("div", { style: "display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)" },
          el("span", { class: "mono" }, n), badge("connected", "green", true)))
      : [el("div", { class: "muted" }, "None wired in.")]),
    el("div", { style: "margin-top:14px" },
      el("div", { class: "muted", style: "font-size:12px;margin-bottom:6px" }, "Governance profile"),
      badge(s.policy, "indigo")),
  );

  wrap.append(el("div", { class: "detail-grid" }, config, mcpPanel));

  // Environment file
  wrap.append(sectionTitle(".sbxenv.yaml — the whole sandbox, declaratively"));
  wrap.append(el("pre", { class: "code" }, sbxEnvFile(s)));

  async function runBuild() {
    if (s.status !== "running") return;
    update("sandboxes", id, { status: "building" });
    buildBtn.disabled = true;
    toast("Agent querying DHI MCP catalog…");
    startSession(s, {
      prompt: "Containerise catalog-service for production. Choose a hardened base image, keep the final image shell-free, and attach an SBOM.",
      staticMcp: s.mcp,
    });
    await delay(1800);
    buildDhiArtifact(`${s.agent} (sandboxed · ${s.name})`);
    update("sandboxes", id, { status: "running", built: true });
    toast("Built catalog-service:dhi — 0C·0H·1M·4L, signed, non-root");
  }

  return wrap;
}

function sbxEnvFile(s) {
  const mixins = (s.kits && s.kits.length)
    ? "\n" + s.kits.map((k) => `  - ${k}`).join("\n")
    : " []";
  return `schemaVersion: "2"
name: ${s.name}

# Base sandbox kit (the agent) + composed mixin kits.
kit: ${s.agent}
mixins:${mixins}

workspace:
  path: ${s.workspace}
  clone: true

sandboxOptions:
  profile: ${s.policy}

mcp:
  servers:${(s.mcp && s.mcp.length) ? "\n" + s.mcp.map((n) => `    - name: ${n}\n      url: https://dhi.io/mcp`).join("\n") : " []"}`;
}
