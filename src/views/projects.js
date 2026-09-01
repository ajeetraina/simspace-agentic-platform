import { el, icon, badge, pageHead, sectionTitle, fmtDate } from "../ui.js";
import { getCol, find } from "../store.js";
import { navigate } from "../router.js";
import { openNewSandbox } from "./sandboxes.js";

export function renderProjects() {
  const projects = getCol("projects");
  const wrap = el("div", {},
    pageHead("Projects", "Codebases your agents work on. A project is cloned read-write into a sandbox; your host stays read-only."));

  const grid = el("div", { class: "grid grid-cards" });
  for (const p of projects) {
    grid.append(el("div", { class: "card link", onClick: () => navigate("projects/" + p.id) },
      el("div", { class: "card-head" }, el("div", { class: "card-title" }, icon("folder", "ico"), p.name), badge(p.language, "gray")),
      el("div", { class: "card-sub mono" }, p.repo + " @ " + p.commit),
      el("p", { class: "muted", style: "margin:10px 0 0" }, p.desc)));
  }
  wrap.append(grid);
  return wrap;
}

export function renderProjectDetail(id) {
  const p = find("projects", id);
  if (!p) return el("div", {}, el("div", { class: "back", onClick: () => navigate("projects") }, icon("back", "ico"), "Projects"),
    el("div", { class: "empty" }, "Project not found."));

  const artifacts = getCol("artifacts");
  const wrap = el("div", {});
  wrap.append(el("div", { class: "back", onClick: () => navigate("projects") }, icon("back", "ico"), "Back to Projects"));
  wrap.append(el("div", { class: "detail-head" }, icon("folder", "ico"), el("h1", {}, p.name)));
  wrap.append(el("p", { class: "muted", style: "margin:0" }, p.desc));

  wrap.append(el("div", { class: "page-actions", style: "margin:16px 0" },
    el("button", { class: "btn btn-primary", onClick: () => openNewSandbox() }, icon("play", "ico"), "Containerise in sandbox")));

  wrap.append(el("dl", { class: "kv" },
    el("dt", {}, "Repository"), el("dd", {}, el("span", { class: "mono" }, p.repo)),
    el("dt", {}, "Branch"), el("dd", {}, el("span", { class: "mono" }, p.branch + " @ " + p.commit)),
    el("dt", {}, "Language"), el("dd", {}, p.language),
    el("dt", {}, "Updated"), el("dd", {}, fmtDate(p.updated)),
  ));

  wrap.append(sectionTitle("Stack the agent must reason about"));
  const arch = el("div", { class: "card" },
    el("div", { style: "display:flex;flex-wrap:wrap;gap:8px" },
      ...p.components.map((c) => el("span", { class: "tool-pill" }, c))));
  wrap.append(arch);

  wrap.append(sectionTitle("Artifacts from this project"));
  const built = artifacts.filter((a) => a.name.startsWith("catalog-service"));
  if (!built.length) wrap.append(el("div", { class: "empty" }, "No artifacts yet."));
  else {
    const grid = el("div", { class: "grid grid-cards" });
    built.forEach((a) => grid.append(el("div", { class: "card link", onClick: () => navigate("artifacts/" + a.id) },
      el("div", { class: "card-head" }, el("div", { class: "card-title mono" }, a.name),
        a.policy === "pass" ? badge("pass", "green") : badge("fail", "red")),
      el("div", { class: "card-sub" }, a.base + " · " + a.size))));
    wrap.append(grid);
  }

  // This product is itself agentic — link the project to its runtime agent team.
  if (p.id === "proj-catalog") {
    wrap.append(sectionTitle("This product is itself agentic"));
    wrap.append(el("div", { class: "card link", onClick: () => navigate("agents"),
      style: "border-left:3px solid #db2777" },
      el("div", { class: "card-title", style: "margin-bottom:4px" }, icon("bot", "ico"), "Catalog Intelligence Team"),
      el("p", { class: "muted", style: "margin:0;font-size:13px" },
        "catalog-service doesn't just get built by agents — it ", el("b", {}, "runs"),
        " a multi-agent pipeline that evaluates every product submission: vendor-intake scores it, market-research and customer-match add signal, catalog-management commits the result. Same governance, one layer up. ",
        el("a", { href: "#/agents", onClick: (e) => { e.stopPropagation(); navigate("agents"); } }, "Meet the team →"))));
  }
  return wrap;
}
