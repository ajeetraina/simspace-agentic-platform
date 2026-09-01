import {
  el, icon, badge, toast, modal, confirmDialog, field, input, select,
  pageHead, fmtDate, copyBtn,
} from "../ui.js";
import { getCol, add, remove, uid } from "../store.js";

function mask(v) { return "•".repeat(Math.min(24, Math.max(8, (v || "").length))); }

export function renderSecrets() {
  const secrets = getCol("secrets");
  const wrap = el("div", {},
    pageHead(
      "Secrets",
      "Secrets are injected into sandboxes at runtime and never written to disk. Values are masked; agents receive them through the credential proxy.",
      el("button", { class: "btn btn-primary", onClick: openAddSecret }, icon("plus"), "Add secret"),
    ),
  );

  const rows = secrets.map((s) => {
    const valCell = el("td", {}, el("span", { class: "mono muted" }, mask(s.value)));
    const reveal = el("button", { class: "btn btn-sm btn-ghost", title: "Reveal", onClick: () => {
      const span = valCell.querySelector("span");
      if (span.dataset.shown) { span.textContent = mask(s.value); delete span.dataset.shown; }
      else { span.textContent = s.value; span.dataset.shown = "1"; }
    } }, icon("eye", "ico"));
    return el("tr", {},
      el("td", {}, el("span", { class: "mono" }, s.name)),
      el("td", { class: "muted" }, s.desc),
      el("td", {}, badge(s.scope, s.scope === "org" ? "blue" : "gray")),
      el("td", {}, s.provider),
      valCell,
      el("td", { class: "muted" }, fmtDate(s.updated)),
      el("td", { style: "text-align:right;white-space:nowrap" }, reveal, copyBtn(s.value),
        el("button", { class: "btn btn-sm btn-ghost", title: "Delete", onClick: () => confirmDialog({
          title: "Delete secret", message: `Delete ${s.name}? Sandboxes referencing it will fail to inject.`,
          confirmLabel: "Delete", onConfirm: () => { remove("secrets", s.id); toast("Secret deleted"); },
        }) }, icon("trash", "ico"))),
    );
  });

  wrap.append(el("div", { class: "table-wrap" },
    el("table", { class: "table" },
      el("thead", {}, el("tr", {},
        el("th", {}, "Name"), el("th", {}, "Description"), el("th", {}, "Scope"),
        el("th", {}, "Provider"), el("th", {}, "Value"), el("th", {}, "Updated"), el("th", {}))),
      el("tbody", {}, ...rows))));
  return wrap;
}

function openAddSecret() {
  const name = input({ placeholder: "MY_TOKEN" });
  const desc = input({ placeholder: "What it's for" });
  const value = input({ type: "password", placeholder: "secret value" });
  const scope = select(["org", "project"], { value: "org" });
  const provider = input({ placeholder: "docker / dhi.io / registry" });

  modal({
    title: "Add secret",
    subtitle: "Stored masked and injected at runtime through the credential proxy — never to disk.",
    body: el("div", {},
      field("Name", name),
      field("Description", desc),
      field("Value", value),
      field("Scope", scope),
      field("Provider", provider),
    ),
    submitLabel: "Add secret",
    onSubmit: () => {
      if (!name.value.trim() || !value.value) { toast("Name and value required", "err"); return false; }
      add("secrets", {
        id: uid("sec"), name: name.value.trim().toUpperCase().replace(/\s+/g, "_"),
        desc: desc.value.trim() || "—", value: value.value, scope: scope.value,
        provider: provider.value.trim() || "custom", updated: new Date().toISOString(),
      });
      toast("Secret added");
      return true;
    },
  });
}
