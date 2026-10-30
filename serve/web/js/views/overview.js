import { get } from "../api.js";
import { createFlow } from "../flow.js";
import { hydrograph } from "../hydro.js";
import { ROLES, role } from "../roles.js";
import { ago, h, ring } from "../ui.js";

const REPO = "https://github.com/zaindroid/floodsense-eu";
const euros = (v) => `€${Math.round(v / 1e6)}M`;

export function overview(root) {
  const who = role();
  const r = ROLES[who];
  const gauges = h("div", { class: "gauges three", "aria-live": "polite" });
  const flow = createFlow();

  root.append(
    h("section", { class: "hero" },
      hydrograph(),
      h("div", { class: "hero-in" },
        h("h1", {}, "Flood alerts.", h("br"), "Know before the water does."),
        h("p", { text: r.sub }),
        h("div", { class: "actions" },
          r.cta.map(([text, href], i) => h("a", { class: `btn ${i ? "ghost" : "primary"}`, href }, text))))),

    h("section", { class: "section" }, h("h2", { text: "Right now" }), gauges),

    h("section", { class: "section" },
      h("div", { class: "section-head" },
        h("h2", { text: "Watch it work" }),
        h("a", { href: "#/ask", text: "Ask a question and follow it" })),
      flow.el),

    h("p", { class: "built" },
      "Agents on NVIDIA Nemotron through Nebius Token Factory, data through Zetaris, web context from Tavily. ",
      h("a", { href: REPO, target: "_blank", rel: "noopener noreferrer", text: "Open source, Apache-2.0" })),
  );

  const views = who === "insurer" ? get("/views/exposure_join") : Promise.resolve(null);
  Promise.all([get("/watch/status"), get("/platform/status"), views.catch(() => null)])
    .then(([w, p, sites]) => {
      const total = w.counts?.sources ?? p.live_sources ?? 0;
      const elevated = w.counts?.elevated ?? 0;
      const since = (Date.now() - Date.parse(w.last_cycle?.finished_at || "")) / 60000;
      const checked = ring({ value: Number.isFinite(since) ? Math.min(15, since) : 0, max: 15,
        text: (ago(w.last_cycle?.finished_at) || "–").replace(" ago", ""), label: "since the last check, every 15 min" });
      if (who === "insurer" && sites?.length) {
        const hit = sites.filter((s) => s.in_footprint);
        const sum = (list) => list.reduce((n, s) => n + (s.sum_insured_eur || 0), 0);
        return gauges.replaceChildren(
          ring({ value: hit.length, max: sites.length, text: `${hit.length}`, label: `of ${sites.length} insured sites inside the Valencia 2024 footprint`, tone: "high" }),
          ring({ value: sum(hit), max: sum(sites), text: euros(sum(hit)), label: `insured there, of ${euros(sum(sites))} across all sites`, tone: "watch" }),
          checked);
      }
      if (who === "citizen") {
        return gauges.replaceChildren(
          ring({ value: total - elevated, max: total || 1, label: "places at their usual level", tone: "ok" }),
          ring({ value: elevated, max: total || 1, label: "places higher than usual", tone: "watch" }),
          checked);
      }
      gauges.replaceChildren(
        ring({ value: p.live_sources ?? total, max: total || 1, label: "sources read live" }),
        ring({ value: elevated, max: total || 1, label: "places above their usual level", tone: "watch" }),
        checked);
    })
    .catch(() => gauges.replaceChildren(h("p", { class: "muted", text: "Live numbers are unavailable right now." })));

  return () => flow.stop();
}
