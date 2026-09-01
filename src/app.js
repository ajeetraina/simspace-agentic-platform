import { el, clear, icon, toast, modal } from "./ui.js";
import { whale } from "./logo.js";
import * as router from "./router.js";
import { getSession, logout, resetAll, subscribe } from "./store.js";
import { renderLogin } from "./views/login.js";
import { openNewSandbox } from "./views/sandboxes.js";

// View modules
import { renderSandboxes, renderSandboxDetail } from "./views/sandboxes.js";
import { renderMcp, renderMcpDetail } from "./views/mcp.js";
import { renderSecrets } from "./views/secrets.js";
import { renderPolicies, renderPolicyDetail } from "./views/policies.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderSessions, renderSessionDetail } from "./views/sessions.js";
import { renderAgents } from "./views/agents.js";
import { renderProjects, renderProjectDetail } from "./views/projects.js";
import { renderArtifacts, renderArtifactDetail } from "./views/artifacts.js";
import { renderSchedules } from "./views/schedules.js";
import { renderTasks } from "./views/tasks.js";
import { renderInteractive } from "./views/interactive.js";
import { renderEvaluate } from "./views/evaluate.js";

const NAV = [
  { group: "top", items: [
    { name: "sandboxes", label: "Sandboxes", ico: "box" },
    { name: "mcp", label: "MCP", ico: "share" },
    { name: "secrets", label: "Secrets", ico: "key" },
    { name: "policies", label: "Policies", ico: "shield" },
  ]},
  { group: "main", items: [
    { name: "dashboard", label: "Dashboard", ico: "grid" },
    { name: "sessions", label: "Sessions", ico: "msg" },
    { name: "agents", label: "Agents", ico: "bot" },
    { name: "projects", label: "Projects", ico: "folder" },
    { name: "artifacts", label: "Artifacts", ico: "package" },
    { name: "schedules", label: "Schedules", ico: "clock" },
    { name: "tasks", label: "Tasks", ico: "list" },
    { name: "interactive", label: "Interactive", ico: "terminal" },
  ]},
];

const TITLES = {
  sandboxes: "Sandboxes", mcp: "MCP", secrets: "Secrets", policies: "Policies",
  dashboard: "Dashboard", sessions: "Sessions", agents: "Agents", projects: "Projects",
  artifacts: "Artifacts", schedules: "Schedules", tasks: "Tasks", interactive: "Interactive",
  evaluate: "Product Evaluation",
};

// Register routes
router.route("sandboxes", ({ id }) => id ? renderSandboxDetail(id) : renderSandboxes());
router.route("mcp", ({ id }) => id ? renderMcpDetail(id) : renderMcp());
router.route("secrets", renderSecrets);
router.route("policies", ({ id }) => id ? renderPolicyDetail(id) : renderPolicies());
router.route("dashboard", renderDashboard);
router.route("sessions", ({ id }) => id ? renderSessionDetail(id) : renderSessions());
router.route("agents", renderAgents);
router.route("projects", ({ id }) => id ? renderProjectDetail(id) : renderProjects());
router.route("artifacts", ({ id }) => id ? renderArtifactDetail(id) : renderArtifacts());
router.route("schedules", renderSchedules);
router.route("tasks", renderTasks);
router.route("interactive", renderInteractive);
router.route("evaluate", renderEvaluate);
router.setNotFound(() => el("div", { class: "content" }, el("div", { class: "empty" }, "Page not found")));

const app = document.getElementById("app");

function boot() {
  const session = getSession();
  if (!session) { app.replaceChildren(renderLogin(boot)); return; }
  renderShell(session);
}

function renderShell(session) {
  const navBtns = [];
  const makeItem = (it) => {
    const btn = el("button", { class: "nav-item", dataset: { route: it.name },
      onClick: () => router.navigate(it.name) }, icon(it.ico), it.label);
    navBtns.push(btn);
    return btn;
  };

  const sidebar = el("aside", { class: "sidebar" },
    el("div", { class: "brand" }, whale(22), "Docker Agentic Platform"),
    el("nav", { class: "nav" },
      el("button", { class: "nav-item", onClick: () => openNewSandbox() }, icon("plus"), "New"),
      ...NAV[0].items.map(makeItem),
      el("div", { class: "nav-sep" }),
      ...NAV[1].items.map(makeItem),
    ),
    el("div", { class: "sidebar-foot" },
      el("button", { class: "nav-item", onClick: openSettings }, icon("refresh"), "Demo data"),
    ),
  );

  const crumbs = el("div", { class: "crumbs" });
  const avatar = el("div", { class: "avatar", title: session.email, onClick: openAccount },
    (session.name || "U").slice(0, 2).toUpperCase());

  const topbar = el("header", { class: "topbar" },
    crumbs,
    el("div", { class: "topbar-right" },
      el("span", { class: "badge badge-gray" }, "org: " + session.org),
      avatar),
  );

  const mount = el("main", { class: "content" });
  const main = el("div", { class: "main" }, topbar, mount);
  app.replaceChildren(el("div", { class: "layout" }, sidebar, main));

  router.setOnNavigate((name, id) => {
    navBtns.forEach((b) => b.classList.toggle("active", b.dataset.route === name));
    clear(crumbs);
    crumbs.append(el("b", {}, TITLES[name] || name));
    if (id) crumbs.append(" / " + id);
  });

  const rerender = router.start(mount);
  // Re-render current view on any state change.
  subscribe(() => rerender());

  function openAccount() {
    modal({
      title: "Account",
      body: el("div", {},
        el("div", { class: "kv" },
          el("dt", {}, "Signed in as"), el("dd", {}, session.email),
          el("dt", {}, "Organization"), el("dd", {}, session.org),
          el("dt", {}, "Plan"), el("dd", {}, el("span", { class: "badge badge-blue" }, "Agentic — Team")),
        )),
      submitLabel: "Sign out", danger: true,
      onSubmit: () => { logout(); toast("Signed out"); boot(); return true; },
    });
  }
}

function openSettings() {
  modal({
    title: "Demo data",
    subtitle: "This simulation stores everything in your browser's localStorage.",
    body: el("div", {},
      el("p", { class: "muted" }, "Reset restores the seeded Product Catalog scenario: the baseline image the agent built unsandboxed, the DHI MCP server, Cedar policies, secrets, project and schedules. Your sign-in is kept."),
    ),
    submitLabel: "Reset to seeded demo", danger: true,
    onSubmit: () => { resetAll(); toast("Demo data reset"); router.navigate("sandboxes"); return true; },
  });
}

boot();
