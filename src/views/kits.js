import { el, icon, badge, pageHead, sectionTitle, copyBtn } from "../ui.js";
import { getCol, find } from "../store.js";
import { navigate } from "../router.js";
import { openNewSandbox } from "./sandboxes.js";

const KIND_TONE = { workload: "indigo", mixin: "blue" };

// Short label + tone for each typed capability request (v3 vocabulary).
const CAP_META = {
  "sbx": ["launch as agent", "indigo"],
  "network-policy": ["network egress", "gray"],
  "credential": ["credential", "amber"],
  "lifecycle": ["lifecycle hooks", "gray"],
  "volume": ["persistent volume", "gray"],
  "agent-context": ["agent context", "green"],
  "agent-sessions": ["headless sessions", "gray"],
  "agent-skills": ["shared skills", "gray"],
  "port": ["inbound port", "gray"],
  "privileged": ["privileged", "red"],
  "resources": ["resource limits", "gray"],
};

// "com.docker.sandbox/network-policy@1" → "network-policy@1"
function shortType(t) { return t.replace(/^com\.docker\.sandbox\//, ""); }
// "network-policy@1" → "network-policy"
function capKey(t) { return shortType(t).replace(/@\d+$/, ""); }

function capChips(k) {
  return (k.capabilities || []).map((c) => {
    const [, tone] = CAP_META[capKey(c.type)] || ["", "gray"];
    return badge(shortType(c.type), tone);
  });
}

export function renderKits() {
  const kits = getCol("kits");
  const wrap = el("div", {});
  wrap.append(el("div", { class: "back", onClick: () => navigate("sandboxes") }, icon("back", "ico"), "Back to Sandboxes"));
  wrap.append(pageHead(
    "Kits",
    "Kits are declarative sbx artifacts — each one an OCI image whose manifest carries a v3 descriptor. A kit declares what it provides, what it requires from other kits, and the typed capabilities it asks the host for. A workload kit owns the agent environment (exactly one per composition); mixin kits are overlays that layer on tools, credentials, network policy and setup. They're the reusable source behind the Sandboxes, MCP, Secrets and Policies you see elsewhere.",
  ));

  for (const kind of ["workload", "mixin"]) {
    const group = kits.filter((k) => k.kind === kind);
    if (!group.length) continue;
    wrap.append(sectionTitle(kind === "workload" ? "Workload kits (agent environments)" : "Mixin kits (layered overlays)"));
    const grid = el("div", { class: "grid grid-cards" });
    for (const k of group) {
      grid.append(el("div", { class: "card link", onClick: () => navigate("kits/" + k.id) },
        el("div", { class: "card-head" },
          el("div", { class: "card-title mono" }, k.name),
          el("div", { style: "display:flex;gap:6px" }, badge(k.kind, KIND_TONE[k.kind]), badge("schema v" + (k.schemaVersion || "3"), "gray"))),
        el("div", { class: "card-sub" }, (k.displayName ? k.displayName + " · " : "") + "v" + k.version),
        el("p", { class: "muted", style: "margin:8px 0 0;font-size:12.5px" }, k.desc),
        el("div", { style: "display:flex;flex-wrap:wrap;gap:5px;margin-top:12px" }, ...capChips(k))));
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
    badge(k.kind, KIND_TONE[k.kind]), badge("schema v" + (k.schemaVersion || "3"), "gray")));
  wrap.append(el("p", { class: "muted", style: "margin:0" }, k.desc));

  const actions = el("div", { class: "page-actions", style: "margin:16px 0" });
  if (k.kind === "workload")
    actions.append(el("button", { class: "btn btn-primary", onClick: () => openNewSandbox(k.wires.agent) }, icon("play", "ico"), "Compose a sandbox"));
  else
    actions.append(el("button", { class: "btn btn-primary", onClick: () => openNewSandbox(null, [k.name]) }, icon("plus", "ico"), "Add to a new sandbox"));
  actions.append(el("button", { class: "btn", onClick: () => navigate("interactive") }, icon("terminal", "ico"), "sbx kit inspect"));
  wrap.append(actions);

  const provides = (k.provides && k.provides.length) ? k.provides : ["(nothing matchable)"];
  const requires = (k.requires && k.requires.length) ? k.requires : ["(nothing — composes anywhere)"];
  wrap.append(el("dl", { class: "kv" },
    el("dt", {}, "Display name"), el("dd", {}, k.displayName || k.name),
    el("dt", {}, "Kind"), el("dd", {}, k.kind + (k.kind === "workload" ? " — owns the environment, one per composition" : " — overlay, zero or more per composition")),
    el("dt", {}, "Version"), el("dd", {}, "v" + k.version),
    el("dt", {}, "Provides"), el("dd", {}, el("span", { class: "mono" }, provides.join(", "))),
    el("dt", {}, "Requires"), el("dd", {}, el("span", { class: "mono" }, requires.join(", "))),
    el("dt", {}, "Source"), el("dd", {}, el("span", { class: "mono" }, k.source), copyBtn(k.source)),
    ...(k.sourceUrl ? [el("dt", {}, "Upstream"), el("dd", {}, el("a", { href: k.sourceUrl, target: "_blank", rel: "noopener" }, k.sourceUrl))] : []),
    ...(k.licenses ? [el("dt", {}, "Licenses"), el("dd", {}, k.licenses.join(", "))] : []),
    el("dt", {}, "Pinned"), el("dd", {}, k.locked ? badge("digest-pinned", "green") : badge("floating", "amber")),
  ));

  wrap.append(sectionTitle("Capabilities it requests"));
  const capList = el("div", { class: "card", style: "display:flex;flex-direction:column;gap:10px" });
  for (const c of (k.capabilities || [])) {
    capList.append(el("div", { style: "display:flex;gap:10px;align-items:baseline" },
      badge(shortType(c.type), (CAP_META[capKey(c.type)] || ["", "gray"])[1]),
      c.optional ? badge("optional", "gray") : null,
      el("span", { class: "muted", style: "font-size:12.5px" }, c.desc || "")));
  }
  wrap.append(capList);

  wrap.append(sectionTitle("Kit descriptor"));
  wrap.append(el("pre", { class: "code" }, k.spec));
  return wrap;
}
