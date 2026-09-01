import { el, icon, badge, pageHead, sectionTitle, copyBtn } from "../ui.js";
import { getCol, find } from "../store.js";
import { navigate } from "../router.js";
import { openNewSandbox } from "./sandboxes.js";

const KIND_TONE = { sandbox: "indigo", mixin: "blue" };

// What a kit wires in → the portal primitive it maps to.
function wireChips(k) {
  const w = k.wires || {};
  const chips = [];
  if (w.agent) chips.push(["agent · " + w.agent, "gray"]);
  (w.mcp || []).forEach((m) => chips.push(["MCP · " + m, "indigo"]));
  if (w.policy) chips.push(["policy · " + w.policy, "green"]);
  (w.credentials || []).forEach((c) => chips.push(["secret · " + c, "amber"]));
  (w.network || []).forEach((n) => chips.push(["net · " + n, "gray"]));
  (w.setup || []).forEach((s) => chips.push(["setup · " + s, "gray"]));
  (w.ports || []).forEach((p) => chips.push(["port · " + p, "gray"]));
  return chips.map(([t, tone]) => badge(t, tone));
}

export function renderKits() {
  const kits = getCol("kits");
  const wrap = el("div", {});
  wrap.append(el("div", { class: "back", onClick: () => navigate("sandboxes") }, icon("back", "ico"), "Back to Sandboxes"));
  wrap.append(pageHead(
    "Kits",
    "Kits are declarative sbx artifacts — a spec.yaml the engine composes into a sandbox. A sandbox kit is the agent environment; mixin kits layer on tools, credentials, network policy and setup. They're the reusable source behind the Sandboxes, MCP, Secrets and Policies you see elsewhere.",
  ));

  for (const kind of ["sandbox", "mixin"]) {
    const group = kits.filter((k) => k.kind === kind);
    if (!group.length) continue;
    wrap.append(sectionTitle(kind === "sandbox" ? "Sandbox kits (agent environments)" : "Mixin kits (layered add-ons)"));
    const grid = el("div", { class: "grid grid-cards" });
    for (const k of group) {
      grid.append(el("div", { class: "card link", onClick: () => navigate("kits/" + k.id) },
        el("div", { class: "card-head" },
          el("div", { class: "card-title mono" }, k.name),
          el("div", { style: "display:flex;gap:6px" }, badge(k.kind, KIND_TONE[k.kind]), k.locked ? badge("pinned", "gray") : null)),
        el("div", { class: "card-sub" }, "v" + k.version),
        el("p", { class: "muted", style: "margin:8px 0 0;font-size:12.5px" }, k.desc),
        el("div", { style: "display:flex;flex-wrap:wrap;gap:5px;margin-top:12px" }, ...wireChips(k))));
    }
    wrap.append(grid);
  }
  return wrap;
}

export function renderKitDetail(id) {
  const k = find("kits", id);
  if (!k) return el("div", {}, el("div", { class: "back", onClick: () => navigate("kits") }, icon("back", "ico"), "Kits"),
    el("div", { class: "empty" }, "Kit not found."));

  const wrap = el("div", {});
  wrap.append(el("div", { class: "back", onClick: () => navigate("kits") }, icon("back", "ico"), "Back to Kits"));
  wrap.append(el("div", { class: "detail-head" }, icon("box", "ico"), el("h1", { class: "mono" }, k.name),
    badge(k.kind, KIND_TONE[k.kind])));
  wrap.append(el("p", { class: "muted", style: "margin:0" }, k.desc));

  const actions = el("div", { class: "page-actions", style: "margin:16px 0" });
  if (k.kind === "sandbox")
    actions.append(el("button", { class: "btn btn-primary", onClick: () => openNewSandbox(k.wires.agent) }, icon("play", "ico"), "Compose a sandbox"));
  else
    actions.append(el("button", { class: "btn btn-primary", onClick: () => openNewSandbox(null, [k.name]) }, icon("plus", "ico"), "Add to a new sandbox"));
  actions.append(el("button", { class: "btn", onClick: () => navigate("interactive") }, icon("terminal", "ico"), "sbx kit inspect"));
  wrap.append(actions);

  wrap.append(el("dl", { class: "kv" },
    el("dt", {}, "Kind"), el("dd", {}, k.kind),
    el("dt", {}, "Version"), el("dd", {}, "v" + k.version),
    el("dt", {}, "Source"), el("dd", {}, el("span", { class: "mono" }, k.source), copyBtn(k.source)),
    el("dt", {}, "Pinned"), el("dd", {}, k.locked ? badge("digest-pinned", "green") : badge("floating", "amber")),
  ));

  wrap.append(sectionTitle("What it wires in"));
  wrap.append(el("div", { class: "card" }, el("div", { style: "display:flex;flex-wrap:wrap;gap:6px" }, ...wireChips(k))));

  wrap.append(sectionTitle("spec.yaml"));
  wrap.append(el("pre", { class: "code" }, k.spec));
  return wrap;
}
