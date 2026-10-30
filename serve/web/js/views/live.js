import { get } from "../api.js";
import { createFlow } from "../flow.js";
import { ago, h, num, ring } from "../ui.js";

export function live(root) {
  const flow = createFlow({ log: true });
  const gauges = h("div", { class: "gauges" });
  root.append(
    h("header", { class: "page-head" },
      h("h1", { text: "Live" }),
      h("p", { text: "The system as it runs: data from the sources, each agent's step, every model call, and the person who decides." })),
    flow.el,
    h("section", { class: "section" }, gauges));

  const draw = () => Promise.all([get("/platform/status"), get("/watch/status").catch(() => null)]).then(([p, w]) => {
    const lanes = p?.llm_usage?.lanes || {};
    const calls = Object.values(lanes).reduce((n, l) => n + (l.calls || 0), 0);
    const total = w?.counts?.sources ?? p?.live_sources ?? 0;
    gauges.replaceChildren(
      ring({ value: p?.live_sources ?? total, max: total || 1, label: "sources read live", tone: "water" }),
      ring({ value: w?.counts?.elevated ?? 0, max: total || 1, label: "places above normal", tone: "watch" }),
      ring({ value: Math.min(15, minutesSince(w?.last_cycle?.finished_at)), max: 15, text: (ago(w?.last_cycle?.finished_at) || "–").replace(" ago", ""), label: "since the last check, every 15 min", tone: "water" }),
      kpi(num(calls), "model calls on Nebius since the last restart"),
      kpi(num(w?.counts?.awaiting_approval ?? 0), "runs waiting for a decision"));
  }).catch(() => {});
  draw();
  const timer = setInterval(draw, 30000);
  return () => { clearInterval(timer); flow.stop(); };
}

const kpi = (value, label) => h("div", { class: "kpi" }, h("b", { text: value }), h("span", { text: label }));

function minutesSince(ts) {
  const t = Date.parse(ts || "");
  return Number.isNaN(t) ? 0 : (Date.now() - t) / 60000;
}
