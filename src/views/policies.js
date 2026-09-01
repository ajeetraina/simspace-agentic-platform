import {
  el, icon, badge, statusBadge, toast, modal, confirmDialog, field, input, select, textarea,
  pageHead, sectionTitle, fmtDate,
} from "../ui.js";
import { getCol, find, add, update, remove, uid } from "../store.js";
import { navigate } from "../router.js";

export function renderPolicies() {
  const policies = getCol("policies");
  const wrap = el("div", {},
    pageHead(
      "Policies",
      "Govern what agents and their tools can do. Cedar policies gate MCP actions (register / invokeTool / invokePrimordial); Scout policies gate images in CI.",
      el("button", { class: "btn btn-primary", onClick: openNewPolicy }, icon("plus"), "New policy"),
    ),
  );

  const rows = policies.map((p) => el("tr", { class: "link", onClick: () => navigate("policies/" + p.id) },
    el("td", {}, el("span", { class: "mono" }, p.name)),
    el("td", {}, badge(p.kind, p.kind === "cedar" ? "indigo" : "blue")),
    el("td", {}, p.target),
    el("td", {}, p.mode === "scoped" ? badge("scoped", "green") : badge("permissive", "amber")),
    el("td", {}, statusBadge(p.status)),
    el("td", { class: "muted" }, fmtDate(p.updated)),
  ));

  wrap.append(el("div", { class: "table-wrap" },
    el("table", { class: "table" },
      el("thead", {}, el("tr", {},
        el("th", {}, "Name"), el("th", {}, "Kind"), el("th", {}, "Target"),
        el("th", {}, "Scope"), el("th", {}, "Status"), el("th", {}, "Updated"))),
      el("tbody", {}, ...rows))));
  return wrap;
}

function openNewPolicy() {
  const name = input({ placeholder: "my-policy" });
  const kind = select(["cedar", "scout"], { value: "cedar" });
  const target = select(["MCP access", "Image / CI"], { value: "MCP access" });
  const body = textarea({ value: `permit (principal, action == MCP::Action::"register", resource);\npermit (principal, action == MCP::Action::"invokePrimordial", resource);\n\npermit (principal, action == MCP::Action::"invokeTool", resource)\nwhen {\n  resource.server == "remotedhi" &&\n  ["dhi_get_image_cves","dhi_list_repositories"].contains(resource.tool)\n};` });

  modal({
    title: "New policy", wide: true,
    body: el("div", {},
      field("Name", name),
      el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:16px" }, field("Kind", kind), field("Target", target)),
      field("Policy source", body, "Cedar for MCP access control; Scout rules for image/CI gates."),
    ),
    submitLabel: "Create policy",
    onSubmit: () => {
      if (!name.value.trim()) { toast("Name required", "err"); return false; }
      add("policies", {
        id: uid("pol"), name: name.value.trim(), kind: kind.value, target: target.value,
        status: "draft", mode: "scoped", desc: "Custom policy.", cedar: body.value,
        updated: new Date().toISOString(),
      });
      toast("Policy created (draft)");
      return true;
    },
  });
}

export function renderPolicyDetail(id) {
  const p = find("policies", id);
  if (!p) return el("div", {}, el("div", { class: "back", onClick: () => navigate("policies") }, icon("back", "ico"), "Policies"),
    el("div", { class: "empty" }, "Policy not found."));

  const wrap = el("div", {});
  wrap.append(el("div", { class: "back", onClick: () => navigate("policies") }, icon("back", "ico"), "Back to Policies"));
  wrap.append(el("div", { class: "detail-head" }, icon("shield", "ico"), el("h1", {}, p.name), statusBadge(p.status)));
  wrap.append(el("p", { class: "muted", style: "margin:0" }, p.desc));

  const actions = el("div", { class: "page-actions", style: "margin:16px 0" });
  if (p.status !== "enforced")
    actions.append(el("button", { class: "btn btn-primary", onClick: () => { update("policies", id, { status: "enforced", updated: new Date().toISOString() }); toast("Policy enforced across sandboxes"); } }, icon("check", "ico"), "Enforce"));
  else
    actions.append(el("button", { class: "btn", onClick: () => { update("policies", id, { status: "draft", updated: new Date().toISOString() }); toast("Policy set to draft (not enforced)"); } }, "Set to draft"));
  actions.append(el("button", { class: "btn", onClick: openEdit }, icon("edit", "ico"), "Edit"));
  actions.append(el("button", { class: "btn btn-danger", onClick: () => confirmDialog({
    title: "Delete policy", message: `Delete ${p.name}?`, confirmLabel: "Delete",
    onConfirm: () => { remove("policies", id); toast("Policy deleted"); navigate("policies"); },
  }) }, icon("trash", "ico"), "Delete"));
  wrap.append(actions);

  wrap.append(el("dl", { class: "kv", style: "margin-bottom:8px" },
    el("dt", {}, "Kind"), el("dd", {}, badge(p.kind, p.kind === "cedar" ? "indigo" : "blue")),
    el("dt", {}, "Target"), el("dd", {}, p.target),
    el("dt", {}, "Scope"), el("dd", {}, p.mode === "scoped" ? badge("scoped (least-privilege)", "green") : badge("permissive (governance off)", "amber")),
    el("dt", {}, "Updated"), el("dd", {}, fmtDate(p.updated)),
  ));

  wrap.append(sectionTitle(p.kind === "cedar" ? "Cedar source" : "Rule source"));
  wrap.append(el("pre", { class: "code" }, p.cedar));

  if (p.mode === "permissive")
    wrap.append(el("div", { class: "panel", style: "padding:14px 16px;margin-top:14px;border-left:3px solid var(--amber)" },
      el("b", { style: "color:var(--amber)" }, "⚠ Governance turned off. "),
      el("span", { class: "muted" }, "This permits every action against every resource — fine to unblock a demo, but in production scope invokeTool to the read-only tools and deny the mutators.")));

  function openEdit() {
    const body = textarea({ value: p.cedar, style: "min-height:260px" });
    modal({
      title: "Edit " + p.name, wide: true,
      body: field("Policy source", body),
      submitLabel: "Save",
      onSubmit: () => {
        const scoped = /when\s*\{/.test(body.value);
        update("policies", id, { cedar: body.value, mode: scoped ? "scoped" : "permissive", updated: new Date().toISOString() });
        toast("Policy saved");
        return true;
      },
    });
  }

  return wrap;
}
