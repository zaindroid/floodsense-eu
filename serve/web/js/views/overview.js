import { get } from "../api.js";
import { createFlow } from "../flow.js";
import { hydrograph } from "../hydro.js";
import { ago, h, ring } from "../ui.js";

const REPO = "https://github.com/zaindroid/floodsense-eu";

export function overview(root) {
  const gauges = h("div", { class: "gauges three", "aria-live": "polite" });
  const flow = createFlow();

  root.append(
    h("section", { class: "hero" },
      hydrograph(),
      h("div", { class: "hero-in" },
        h("h1", {}, "Flood alerts.", h("br"), "Know before the water does."),
        h("p", { text: "AI agents read live river data, challenge their own answers and cite every number. A person makes the call." }),
        h("div", { class: "actions" },
          h("a", { class: "btn primary", href: "#/ask" }, "Ask the agents"),
          h("a", { class: "btn ghost", href: "#/watch" }, "See what's being watched")))),

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

  Promise.all([get("/watch/status"), get("/platform/status")])
    .then(([w, p]) => {
      const total = w.counts?.sources ?? p.live_sources ?? 0;
      const since = (Date.now() - Date.parse(w.last_cycle?.finished_at || "")) / 60000;
      gauges.replaceChildren(
        ring({ value: p.live_sources ?? total, max: total || 1, label: "sources read live", tone: "water" }),
        ring({ value: w.counts?.elevated ?? 0, max: total || 1, label: "places above their usual level", tone: "watch" }),
        ring({ value: Number.isFinite(since) ? Math.min(15, since) : 0, max: 15, text: ago(w.last_cycle?.finished_at).replace(" ago", "") || "–", label: "since the last check, every 15 min", tone: "water" }));
    })
    .catch(() => gauges.replaceChildren(h("p", { class: "muted", text: "Live numbers are unavailable right now." })));

  return () => flow.stop();
}
