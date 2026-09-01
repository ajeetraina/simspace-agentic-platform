import { el, icon, badge, statusBadge, toast, modal, confirmDialog, field, input, select, pageHead } from "../ui.js";
import { getCol, add, update, remove, uid } from "../store.js";

const COLS = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

const prioBadge = (p) => badge(p, p === "high" ? "red" : p === "medium" ? "amber" : "gray");

export function renderTasks() {
  const tasks = getCol("tasks");
  const wrap = el("div", {},
    pageHead("Tasks", "Supply-chain work items across your projects. Drag-free kanban — click a card to advance it.",
      el("button", { class: "btn btn-primary", onClick: openNew }, icon("plus"), "New task")));

  const board = el("div", { class: "grid", style: "grid-template-columns:repeat(3,1fr);gap:16px;align-items:start" });
  for (const col of COLS) {
    const items = tasks.filter((t) => t.status === col.key);
    const column = el("div", { class: "panel", style: "padding:14px;background:#f8fafc" },
      el("div", { style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px" },
        el("b", {}, col.label), badge(String(items.length), "gray")));
    if (!items.length) column.append(el("div", { class: "muted", style: "font-size:12px;padding:8px 2px" }, "Nothing here"));
    for (const t of items) {
      column.append(el("div", { class: "card", style: "padding:13px;margin-bottom:10px;cursor:pointer",
        onClick: () => advance(t) },
        el("div", { style: "font-weight:600;margin-bottom:8px" }, t.title),
        el("div", { style: "display:flex;justify-content:space-between;align-items:center" },
          el("div", { style: "display:flex;gap:6px" }, prioBadge(t.priority), badge(t.assignee, "blue")),
          el("button", { class: "btn btn-sm btn-ghost", title: "Delete", onClick: (e) => { e.stopPropagation(); confirmDialog({
            title: "Delete task", message: t.title, confirmLabel: "Delete",
            onConfirm: () => { remove("tasks", t.id); toast("Task deleted"); } }); } }, icon("trash", "ico"))),
      ));
    }
    board.append(column);
  }
  wrap.append(board);
  wrap.append(el("p", { class: "muted", style: "margin-top:14px" }, "Tip: click a card to move it to the next column."));
  return wrap;
}

function advance(t) {
  const order = ["todo", "in_progress", "done"];
  const next = order[(order.indexOf(t.status) + 1) % order.length];
  update("tasks", t.id, { status: next, updated: new Date().toISOString() });
  toast(`Moved to ${next.replace("_", " ")}`);
}

function openNew() {
  const title = input({ placeholder: "Task title" });
  const priority = select(["high", "medium", "low"], { value: "medium" });
  const assignee = select(getCol("agents").map((a) => a.name).concat(["platform", "unassigned"]));
  const status = select(COLS.map((c) => ({ value: c.key, label: c.label })), { value: "todo" });
  modal({
    title: "New task",
    body: el("div", {}, field("Title", title),
      el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:16px" }, field("Priority", priority), field("Status", status)),
      field("Assignee", assignee)),
    submitLabel: "Create",
    onSubmit: () => {
      if (!title.value.trim()) { toast("Title required", "err"); return false; }
      add("tasks", { id: uid("tk"), title: title.value.trim(), status: status.value, priority: priority.value,
        assignee: assignee.value, project: "catalog-service", updated: new Date().toISOString() });
      toast("Task created");
      return true;
    },
  });
}
