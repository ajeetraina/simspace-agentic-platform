import {
  el, icon, badge, toast, modal, confirmDialog, field, input, select, textarea, fmtDate, timeAgo,
} from "../ui.js";
import { getCol, add, update, remove, uid } from "../store.js";
import { navigate } from "../router.js";
import { openNewSandbox } from "./sandboxes.js";
import { startSession } from "../scenario.js";

// Toolbar state kept at module scope so it survives store-triggered re-renders.
let query = "";
let sortKey = "name";
let sortDir = "asc";
let filterTeam = "all";
let viewMode = "grid";

const BADGE_CLASS = { "Platform Default": "default", "Customized": "custom" };

export function renderAgents() {
  const agents = getCol("agents");
  const teams = getCol("teams");

  const wrap = el("div", {});

  // ---- Header ----
  wrap.append(el("div", { class: "page-head" },
    el("div", {}, el("h1", {}, "Agents"),
      el("p", { style: "margin-top:4px" }, `${agents.length} agents configured`)),
    el("div", { class: "page-actions" },
      el("button", { class: "btn", onClick: openAddTeam }, icon("users"), "Add team instance"),
      el("button", { class: "btn btn-primary", onClick: () => openCreateAgent() }, icon("plus"), "Create Agent")),
  ));

  // ---- Toolbar ----
  const search = input({ class: "input", placeholder: "Search agents…", value: query,
    oninput: (e) => { query = e.target.value; rerenderList(); } });
  const sortSel = select([
    { value: "name", label: "Name" }, { value: "model", label: "Model" }, { value: "updated", label: "Updated" },
  ], { value: sortKey, onchange: (e) => { sortKey = e.target.value; rerenderList(); } });
  const dirSel = select([
    { value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" },
  ], { value: sortDir, onchange: (e) => { sortDir = e.target.value; rerenderList(); } });
  const teamSel = select([
    { value: "all", label: "All teams" },
    ...teams.map((t) => ({ value: t.tag, label: t.name })),
  ], { value: filterTeam, onchange: (e) => { filterTeam = e.target.value; rerenderList(); } });

  const viewToggle = el("div", { class: "seg" },
    el("button", { class: viewMode === "list" ? "on" : "", title: "List view",
      onClick: () => { viewMode = "list"; rerenderList(); } }, icon("list")),
    el("button", { class: viewMode === "grid" ? "on" : "", title: "Grid view",
      onClick: () => { viewMode = "grid"; rerenderList(); } }, icon("grid")));

  wrap.append(el("div", { class: "toolbar" },
    el("div", { class: "search-box" }, icon("search"), search),
    el("span", { class: "tb-label" }, "Sort"), sortSel, dirSel,
    el("span", { class: "tb-label" }, icon("sliders"), " Filters"), teamSel,
    viewToggle,
  ));

  const listMount = el("div", {});
  wrap.append(listMount);

  function rerenderList() {
    listMount.replaceChildren(buildList());
    // keep focus in the search box while typing
    if (document.activeElement !== search && query) { /* no-op */ }
  }
  function buildList() {
    const container = el("div", {});
    const filtered = filterSort(getCol("agents"));
    const showTeams = getCol("teams").filter((t) => filterTeam === "all" || t.tag === filterTeam);

    if (!filtered.length) return el("div", { class: "empty" }, "No agents match your search.");

    for (const team of showTeams) {
      const members = filtered.filter((a) => a.team === team.tag);
      if (!members.length) continue;
      container.append(el("div", { class: "team-head" },
        el("span", { class: "t-name" }, icon("users"), team.name),
        team.updateAvailable ? badge("Update available", "blue", false) : null,
        el("span", { class: "t-desc" }, team.desc)));
      container.append(viewMode === "grid"
        ? el("div", { class: "grid grid-cards" }, ...members.map(agentCard))
        : el("div", { class: "table-wrap" }, ...members.map(agentRow)));
    }
    return container;
  }

  listMount.append(buildList());
  return wrap;
}

function filterSort(agents) {
  const q = query.trim().toLowerCase();
  let list = agents.filter((a) =>
    !q || [a.name, a.model, a.desc, ...(a.tags || []), ...(a.badges || [])].join(" ").toLowerCase().includes(q));
  list = list.slice().sort((a, b) => {
    let av, bv;
    if (sortKey === "updated") { av = a.updated || ""; bv = b.updated || ""; }
    else { av = (a[sortKey] || "").toLowerCase(); bv = (b[sortKey] || "").toLowerCase(); }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });
  return list;
}

function avatar(a) {
  return el("div", { class: "agent-av", style: `background:${a.color || "#64748b"}` },
    (a.name[0] || "A").toUpperCase());
}

function badgeRow(a) {
  return el("div", { class: "ac-badges" },
    ...(a.badges || []).map((b) => el("span", { class: "badge-xs " + (BADGE_CLASS[b] || "plain") }, b)));
}
function capRow(a, teamTag) {
  return el("div", { class: "ac-caps" },
    ...(a.tags || []).map((t) => el("span", { class: "cap" }, t)),
    el("span", { class: "cap team" }, teamTag));
}

function agentCard(a) {
  return el("div", { class: "card agent-card" },
    el("div", { class: "ac-top" },
      avatar(a),
      el("div", { style: "min-width:0" },
        el("div", { class: "ac-name" }, a.name),
        el("div", { class: "ac-model" }, icon("cpu", "m"), a.model))),
    badgeRow(a),
    el("p", { class: "ac-desc" }, a.desc),
    capRow(a, a.team),
    el("div", { class: "ac-foot" },
      el("span", { class: "date" }, fmtDate(a.updated).split(",")[0] + ", " + new Date(a.updated).getFullYear()),
      el("div", { class: "acts" },
        el("button", { class: "icon-btn", title: "History", onClick: () => showHistory(a) }, icon("clock")),
        el("button", { class: "icon-btn run", title: a.kind === "coding" ? "Run in sandbox" : "Run pipeline", onClick: () => runAgent(a) }, icon("play")),
        el("button", { class: "icon-btn", title: "Edit", onClick: () => openCreateAgent(a) }, icon("edit")),
      )),
  );
}

function agentRow(a) {
  return el("div", { class: "agent-row" },
    avatar(a),
    el("div", { class: "ar-main" },
      el("div", { style: "display:flex;align-items:center;gap:8px" },
        el("b", {}, a.name),
        el("span", { class: "ac-model" }, a.model),
        ...(a.badges || []).slice(0, 2).map((b) => el("span", { class: "badge-xs " + (BADGE_CLASS[b] || "plain") }, b))),
      el("div", { class: "ar-desc" }, a.desc)),
    el("div", { class: "acts" },
      el("button", { class: "icon-btn", title: "History", onClick: () => showHistory(a) }, icon("clock")),
      el("button", { class: "icon-btn run", title: "Run", onClick: () => runAgent(a) }, icon("play")),
      el("button", { class: "icon-btn", title: "Edit", onClick: () => openCreateAgent(a) }, icon("edit")),
    ));
}

// ---- Actions ----
function runAgent(a) {
  if (a.kind === "coding") { openNewSandbox(a.name); return; }
  // Service agent → simulate a catalog-pipeline run as a session.
  const session = startSession(
    { id: "sbx-catalog", name: "catalog-pipeline", agent: a.name, project: "catalog-service", mcp: ["docker-gateway"] },
    { prompt: `Run ${a.name} on the latest product submission.`, staticMcp: ["docker-gateway"] });
  update("sessions", session.id, {
    toolCalls: catalogToolCalls(a),
    status: "completed",
  });
  toast(`${a.name} ran — see Sessions`);
  navigate("sessions/" + session.id);
}

function catalogToolCalls(a) {
  const map = {
    "vendor-intake": ["model_runner__llama3.2:evaluate", "score: 87/100 → APPROVED (≥70)", "mongodb__insert(agent_history)"],
    "market-research": ["model_runner__llama3.2:competitor_analysis", "web_search__market(3 competitors)", "kafka__publish(product-evaluations)"],
    "customer-match": ["model_runner__llama3.2:segment_match", "postgres__query(customer_prefs)", "alignment: 0.82"],
    "catalog-management": ["postgres__insert(catalog_db.products)", "mongodb__insert(agent_history)", "kafka__publish(product-evaluations)"],
    "catalog-orchestrator": ["s2s__vendor-intake", "s2s__market-research", "s2s__customer-match", "synthesise → APPROVED"],
  };
  return map[a.name] || ["model_runner__llama3.2:run"];
}

function showHistory(a) {
  const sessions = getCol("sessions").filter((s) => s.agent === a.name);
  modal({
    title: a.name + " — history",
    body: sessions.length
      ? el("div", { class: "kv" }, ...sessions.flatMap((s) => [
          el("dt", {}, timeAgo(s.started)), el("dd", {}, `${s.sandbox} · ${s.status}`)]))
      : el("p", { class: "muted" }, "No runs recorded yet. Hit ▶ to run this agent."),
    cancelLabel: "Close",
  });
}

// ---- Create / edit agent ----
function openCreateAgent(existing) {
  const teams = getCol("teams");
  const name = input({ value: existing?.name || "", placeholder: "my-agent" });
  const teamSel = select(teams.map((t) => ({ value: t.tag, label: t.name })), { value: existing?.team || teams[0]?.tag });
  const modelSel = select(["Opus 4.8", "Sonnet 4.6", "Haiku 4.5", "Llama 3.2 · Model Runner"], { value: existing?.model || "Sonnet 4.6" });
  const kindSel = select([{ value: "coding", label: "Coding (runs in sandbox)" }, { value: "service", label: "Service (pipeline agent)" }], { value: existing?.kind || "coding" });
  const desc = textarea({ value: existing?.desc || "", style: "min-height:80px" });
  const caps = input({ value: (existing?.tags || []).join(", "), placeholder: "filesystem, shell, todo" });

  modal({
    title: existing ? "Edit agent" : "Create Agent", wide: true,
    subtitle: existing ? null : "Define a new agent and assign it to a team.",
    body: el("div", {},
      field("Name", name),
      el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:16px" },
        field("Team", teamSel), field("Kind", kindSel)),
      field("Model", modelSel),
      field("Description", desc),
      field("Capabilities", caps, "Comma-separated tools this agent can use."),
    ),
    submitLabel: existing ? "Save" : "Create Agent",
    onSubmit: () => {
      if (!name.value.trim()) { toast("Name required", "err"); return false; }
      const tags = caps.value.split(",").map((s) => s.trim()).filter(Boolean);
      const data = { name: name.value.trim(), team: teamSel.value, model: modelSel.value, kind: kindSel.value,
        desc: desc.value.trim() || "—", tags, updated: new Date().toISOString() };
      if (existing) { update("agents", existing.id, data); toast("Agent updated"); }
      else {
        const colors = ["#2496ED", "#1a7f37", "#7c3aed", "#db2777", "#d97706", "#0891b2"];
        add("agents", { id: uid("ag"), color: colors[getCol("agents").length % colors.length],
          badges: ["Customized"], default: false, ...data });
        toast("Agent created");
      }
      return true;
    },
  });
}

function openAddTeam() {
  const name = input({ placeholder: "QA Team" });
  const desc = input({ placeholder: "What this team does" });
  modal({
    title: "Add team instance",
    subtitle: "Groups related agents together, like the Development and Catalog Intelligence teams.",
    body: el("div", {}, field("Team name", name), field("Description", desc)),
    submitLabel: "Add team",
    onSubmit: () => {
      if (!name.value.trim()) { toast("Name required", "err"); return false; }
      const tag = name.value.trim().toLowerCase().replace(/\s+/g, "-");
      add("teams", { id: uid("team"), name: name.value.trim(), tag, updateAvailable: false, desc: desc.value.trim() || "—" });
      toast("Team added");
      return true;
    },
  });
}
