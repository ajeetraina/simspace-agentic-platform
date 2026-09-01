import { el, icon, badge, pageHead } from "../ui.js";
import { getCol } from "../store.js";
import { openNewSandbox } from "./sandboxes.js";

export function renderAgents() {
  const agents = getCol("agents");
  const wrap = el("div", {},
    pageHead("Agents", "Coding agents available to run inside your sandboxes. Each runs with full permissions — but only inside the microVM boundary."));

  const grid = el("div", { class: "grid grid-cards" });
  for (const a of agents) {
    grid.append(el("div", { class: "card" },
      el("div", { class: "card-head" },
        el("div", { class: "card-title" }, icon("bot", "ico"), a.name),
        a.default ? badge("default", "blue") : badge("available", "green", true)),
      el("div", { class: "card-sub" }, a.vendor),
      el("p", { class: "muted", style: "margin:10px 0 0" }, a.desc),
      el("div", { style: "margin-top:14px" },
        el("button", { class: "btn btn-sm", onClick: () => openNewSandbox() }, icon("play", "ico"), "Run in sandbox")),
    ));
  }
  wrap.append(grid);
  return wrap;
}
