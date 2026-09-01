import { el, icon, badge, statusBadge, toast, confirmDialog, pageHead, sectionTitle, fmtDate, timeAgo } from "../ui.js";
import { getCol, find, update, remove } from "../store.js";
import { navigate } from "../router.js";

export function renderSessions() {
  const sessions = getCol("sessions");
  const wrap = el("div", {},
    pageHead("Sessions", "Every agent run inside a sandbox. Follow a session to see the tools it called and the transcript."));

  if (!sessions.length) return wrap.appendChild(el("div", { class: "empty" },
    el("div", { class: "big" }, "💬"), "No sessions yet.",
    el("div", { style: "margin-top:12px" }, el("button", { class: "btn btn-primary", onClick: () => navigate("sandboxes") }, "Launch a sandbox"))
  )), wrap;

  const rows = sessions.map((s) => el("tr", { class: "link", onClick: () => navigate("sessions/" + s.id) },
    el("td", {}, el("span", { class: "mono" }, s.agent)),
    el("td", {}, s.sandbox),
    el("td", {}, s.project || "—"),
    el("td", {}, (s.mcp || []).length ? s.mcp.map((m) => el("span", { class: "tool-pill" }, m)) : el("span", { class: "muted" }, "none")),
    el("td", {}, s.toolCalls?.length ? `${s.toolCalls.length} calls` : "—"),
    el("td", { class: "muted" }, timeAgo(s.started)),
    el("td", {}, statusBadge(s.status)),
  ));
  wrap.append(el("div", { class: "table-wrap" }, el("table", { class: "table" },
    el("thead", {}, el("tr", {}, el("th", {}, "Agent"), el("th", {}, "Sandbox"), el("th", {}, "Project"),
      el("th", {}, "MCP"), el("th", {}, "Tool calls"), el("th", {}, "Started"), el("th", {}, "Status"))),
    el("tbody", {}, ...rows))));
  return wrap;
}

export function renderSessionDetail(id) {
  const s = find("sessions", id);
  if (!s) return el("div", {}, el("div", { class: "back", onClick: () => navigate("sessions") }, icon("back", "ico"), "Sessions"),
    el("div", { class: "empty" }, "Session not found."));

  const wrap = el("div", {});
  wrap.append(el("div", { class: "back", onClick: () => navigate("sessions") }, icon("back", "ico"), "Back to Sessions"));
  wrap.append(el("div", { class: "detail-head" }, icon("msg", "ico"), el("h1", {}, s.agent + " · " + s.sandbox), statusBadge(s.status)));

  const actions = el("div", { class: "page-actions", style: "margin:14px 0" });
  if (s.status === "running")
    actions.append(el("button", { class: "btn", onClick: () => { update("sessions", id, { status: "completed" }); toast("Session ended"); } }, icon("stop", "ico"), "End session"));
  actions.append(el("button", { class: "btn", onClick: () => navigate("sandboxes/" + s.sandboxId) }, icon("box", "ico"), "Open sandbox"));
  actions.append(el("button", { class: "btn btn-danger", onClick: () => confirmDialog({
    title: "Delete session", message: "Remove this session record?", confirmLabel: "Delete",
    onConfirm: () => { remove("sessions", id); toast("Session deleted"); navigate("sessions"); } }) }, icon("trash", "ico"), "Delete"));
  wrap.append(actions);

  wrap.append(el("dl", { class: "kv" },
    el("dt", {}, "Agent"), el("dd", {}, s.agent),
    el("dt", {}, "Sandbox"), el("dd", {}, el("a", { href: "#/sandboxes/" + s.sandboxId }, s.sandbox)),
    el("dt", {}, "MCP servers"), el("dd", {}, (s.mcp || []).length ? s.mcp.join(", ") : "none"),
    el("dt", {}, "Started"), el("dd", {}, fmtDate(s.started)),
    el("dt", {}, "Turns"), el("dd", {}, String(s.turns || 0)),
  ));

  if (s.prompt) {
    wrap.append(sectionTitle("Prompt"));
    wrap.append(el("pre", { class: "code light" }, s.prompt));
  }

  if (s.toolCalls?.length) {
    wrap.append(sectionTitle("Tool calls (via DHI MCP server)"));
    wrap.append(el("div", { class: "panel", style: "padding:14px 18px" },
      ...s.toolCalls.map((t) => el("div", { style: "padding:5px 0;border-bottom:1px solid var(--border)" },
        icon("check", "ico"), " ", el("span", { class: "mono" }, t)))));
    wrap.append(el("p", { class: "muted", style: "margin-top:10px" },
      "The agent queried the hardened catalog before writing FROM — reading signed CVE evidence rather than pattern-matching a base image."));
  }
  return wrap;
}
