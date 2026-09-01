import { el, icon, badge, statusBadge, toast, modal, confirmDialog, field, input, select, pageHead, fmtDate } from "../ui.js";
import { getCol, add, update, remove, uid } from "../store.js";

export function renderSchedules() {
  const schedules = getCol("schedules");
  const wrap = el("div", {},
    pageHead("Schedules", "Recurring jobs — rebuilds, CVE scans, policy-drift checks — run on cron against your projects and sandboxes.",
      el("button", { class: "btn btn-primary", onClick: openNew }, icon("plus"), "New schedule")));

  const rows = schedules.map((s) => el("tr", {},
    el("td", {}, el("span", { class: "mono" }, s.name)),
    el("td", {}, el("span", { class: "mono" }, s.cron), el("div", { class: "muted", style: "font-size:12px" }, s.cronText)),
    el("td", {}, s.action),
    el("td", {}, s.target),
    el("td", { class: "muted" }, fmtDate(s.lastRun)),
    el("td", { class: "muted" }, s.nextRun === "—" ? "—" : fmtDate(s.nextRun)),
    el("td", {}, statusBadge(s.status)),
    el("td", { style: "text-align:right;white-space:nowrap" },
      el("button", { class: "btn btn-sm btn-ghost", title: s.status === "active" ? "Pause" : "Resume",
        onClick: () => { update("schedules", s.id, { status: s.status === "active" ? "paused" : "active" }); toast(s.status === "active" ? "Paused" : "Resumed"); } },
        icon(s.status === "active" ? "stop" : "play", "ico")),
      el("button", { class: "btn btn-sm btn-ghost", title: "Run now",
        onClick: () => { update("schedules", s.id, { lastRun: new Date().toISOString() }); toast(`Triggered ${s.name}`); } }, icon("refresh", "ico")),
      el("button", { class: "btn btn-sm btn-ghost", title: "Delete", onClick: () => confirmDialog({
        title: "Delete schedule", message: `Delete ${s.name}?`, confirmLabel: "Delete",
        onConfirm: () => { remove("schedules", s.id); toast("Schedule deleted"); } }) }, icon("trash", "ico"))),
  ));

  wrap.append(el("div", { class: "table-wrap" }, el("table", { class: "table" },
    el("thead", {}, el("tr", {}, el("th", {}, "Name"), el("th", {}, "Schedule"), el("th", {}, "Action"),
      el("th", {}, "Target"), el("th", {}, "Last run"), el("th", {}, "Next run"), el("th", {}, "Status"), el("th", {}))),
    el("tbody", {}, ...rows))));
  return wrap;
}

function openNew() {
  const name = input({ placeholder: "nightly-rebuild" });
  const cron = input({ placeholder: "0 2 * * *", value: "0 2 * * *" });
  const action = input({ placeholder: "What to run" });
  const target = select(getCol("projects").map((p) => p.name).concat(["all artifacts", "all sandboxes"]));
  modal({
    title: "New schedule",
    body: el("div", {}, field("Name", name), field("Cron expression", cron, "Standard 5-field cron."),
      field("Action", action), field("Target", target)),
    submitLabel: "Create",
    onSubmit: () => {
      if (!name.value.trim()) { toast("Name required", "err"); return false; }
      add("schedules", { id: uid("sch"), name: name.value.trim(), cron: cron.value, cronText: "Custom",
        action: action.value || "—", target: target.value, status: "active",
        lastRun: null, nextRun: new Date(Date.now() + 86400000).toISOString() });
      toast("Schedule created");
      return true;
    },
  });
}
