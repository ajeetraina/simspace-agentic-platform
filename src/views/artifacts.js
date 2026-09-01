import { el, icon, badge, cveChips, pageHead, sectionTitle, fmtDate } from "../ui.js";
import { getCol, find } from "../store.js";
import { navigate } from "../router.js";

export function renderArtifacts() {
  const artifacts = getCol("artifacts");
  const wrap = el("div", {},
    pageHead("Artifacts", "Images your agents built. Track CVEs, SBOM/provenance attestations, signatures and policy verdict for each."));

  const rows = artifacts.map((a) => el("tr", { class: "link", onClick: () => navigate("artifacts/" + a.id) },
    el("td", {}, el("span", { class: "mono" }, a.name)),
    el("td", {}, el("span", { class: "mono muted" }, a.base)),
    el("td", {}, cveChips(a.cves)),
    el("td", {}, String(a.packages)),
    el("td", {}, a.size),
    el("td", {}, a.signed ? badge("signed", "green") : badge("unsigned", "red")),
    el("td", {}, a.policy === "pass" ? badge("pass", "green", true) : badge("fail", "red")),
  ));

  wrap.append(el("div", { class: "table-wrap" }, el("table", { class: "table" },
    el("thead", {}, el("tr", {}, el("th", {}, "Image"), el("th", {}, "Base"), el("th", {}, "CVEs"),
      el("th", {}, "Pkgs"), el("th", {}, "Size"), el("th", {}, "Signature"), el("th", {}, "Policy"))),
    el("tbody", {}, ...rows))));
  return wrap;
}

export function renderArtifactDetail(id) {
  const a = find("artifacts", id);
  if (!a) return el("div", {}, el("div", { class: "back", onClick: () => navigate("artifacts") }, icon("back", "ico"), "Artifacts"),
    el("div", { class: "empty" }, "Artifact not found."));

  const wrap = el("div", {});
  wrap.append(el("div", { class: "back", onClick: () => navigate("artifacts") }, icon("back", "ico"), "Back to Artifacts"));
  wrap.append(el("div", { class: "detail-head" }, icon("package", "ico"), el("h1", { class: "mono" }, a.name),
    a.policy === "pass" ? badge("policy pass", "green", true) : badge("policy fail", "red")));
  wrap.append(el("p", { class: "muted", style: "margin:0" }, "Built by " + a.builtBy + " · " + fmtDate(a.built)));

  const attest = (ok, label) => el("div", { style: "display:flex;align-items:center;gap:8px;padding:6px 0" },
    ok ? el("span", { style: "color:var(--green)" }, icon("check", "ico")) : el("span", { style: "color:var(--red)" }, icon("x", "ico")),
    label);

  const left = el("div", { class: "panel", style: "padding:20px" },
    el("dl", { class: "kv" },
      el("dt", {}, "Digest"), el("dd", {}, el("span", { class: "mono" }, a.digest)),
      el("dt", {}, "Base image"), el("dd", {}, el("span", { class: "mono" }, a.base)),
      el("dt", {}, "Size"), el("dd", {}, a.size),
      el("dt", {}, "Packages"), el("dd", {}, String(a.packages)),
      el("dt", {}, "CVEs"), el("dd", {}, cveChips(a.cves)),
      el("dt", {}, "Runs as"), el("dd", {}, a.nonRoot ? badge("non-root", "green") : badge("root", "amber")),
    ));

  const right = el("div", { class: "panel", style: "padding:20px" },
    el("div", { class: "card-title", style: "margin-bottom:8px" }, "Supply-chain attestations"),
    attest(a.sbom, "SBOM (CycloneDX)"),
    attest(a.provenance, "SLSA provenance"),
    attest(a.signed, "Signature verified (Sigstore, keyless)"),
    el("div", { style: "margin-top:12px" }, a.policy === "pass"
      ? badge("gate: 3/3 passed → allowed", "green")
      : badge("gate: blocked before push", "red")));

  wrap.append(el("div", { class: "detail-grid" }, left, right));

  wrap.append(sectionTitle("docker scout quickview"));
  wrap.append(el("pre", { class: "code" }, quickview(a)));

  if (a.policy === "fail")
    wrap.append(el("div", { class: "panel", style: "padding:14px 16px;margin-top:14px;border-left:3px solid var(--red)" },
      el("b", { style: "color:var(--red)" }, "This is what the agent shipped unsupervised. "),
      el("span", { class: "muted" }, "It behaves correctly, but nothing about it behaving correctly tells you what it is built from. Rebuild it in a sandbox pointed at the DHI MCP server to fix it at authoring time.")));

  return wrap;
}

function quickview(a) {
  const { c, h, m, l } = a.cves;
  const pass = a.policy === "pass";
  return `    ✓ Indexed ${a.packages} packages
  Target             │  ${a.name}  │    ${c}C     ${h}H     ${m}M     ${l}L
    digest           │  ${a.digest.replace("sha256:", "")}
  Base image         │  ${a.base}
  Policy             │  ${pass ? "✓ 3/3 passed" : "✗ failed (no-critical / require-sbom / require-provenance)"}`;
}
