import { get } from "../api.js";
import { fill, h, num } from "../ui.js";

const REPO = "https://github.com/GenAI-Open-Agent-Hackathon/FloodSenseEU-Hackathon-Monorepo";
const NEBIUS_DEMO = "https://floodsense-nebius.zaindroid.me";

const TRY = [
  ["Pick a role", "Citizen, insurer or civil protection, in the top bar. It changes the suggested questions."],
  ["Open Watch", "See every place read live, its state, and where each number comes from."],
  ["Ask a question", "Pick a suggestion about Valencia 2024 and watch the agents work step by step."],
  ["Check the answer", "Each claim carries numbered sources; the Judge's score sits below."],
  ["Decide", "Approve or reject the proposed actions. Nothing is sent without you."],
];

export function jury(root) {
  const reqs = h("div", {}, requirements(null, null));
  const usage = h("div");
  root.append(
    h("header", { class: "page-head" },
      h("h1", { text: "For the jury" }),
      h("p", { text: "What FloodSense does, how each requirement is met, and how to check it yourself in about a minute." })),

    h("section", { class: "card" }, h("h2", { text: "Requirements, with live proof" }), reqs),

    h("section", { class: "section" },
      h("h2", { text: "Try it in a minute" }),
      h("ol", { class: "grid five", style: "list-style:none;padding:0;margin:0" },
        TRY.map(([title, text], i) => h("li", { class: "step card" }, h("span", { class: "n", text: String(i + 1) }), h("h3", { text: title }), h("p", { text }))))),

    h("section", { class: "section card" },
      h("h2", { text: "How it fits together" }),
      h("div", { class: "arch" },
        h("div", { class: "stack" },
          box("Live sources", "German gauges, Copernicus river forecasts, rain models, 45 in all"),
          box("Zetaris", "One SQL layer over every source, with the query behind each number"),
          box("Tavily", "Recent news, only when a place is named, clearly marked as web")),
        h("div", { class: "arrow", "aria-hidden": "true", text: "→" }),
        h("div", { class: "stack" },
          box("Agents on Nebius Token Factory", "Watchers, Investigator, Skeptic, Exposure, Playbook and Judge, on NVIDIA Nemotron"),
          box("A person", "Approves or rejects every proposed action; approved findings become memory")))),

    h("section", { class: "section" }, usage),
  );

  Promise.all([get("/platform/status"), get("/watch/status").catch(() => null)])
    .then(([p, w]) => {
      fill(reqs, requirements(p, w));
      fill(usage, usageCard(p));
    })
    .catch(() => reqs.prepend(h("p", { class: "err", text: "Live proof is unavailable right now; the list below is what the app is built to do." })));
}

function requirements(p, w) {
  const nebius = p?.llm_backend === "nebius";
  const lanes = Object.values(p?.lanes || {}).filter(Boolean);
  const sources = p?.live_sources ?? w?.counts?.sources;
  return [
    req(nebius || !p, "Inference on Nebius Token Factory",
      "Every model call goes to Nebius Token Factory's OpenAI-compatible API.",
      p ? [h("span", { class: "nebius-tag", text: nebius ? "Nebius" : String(p.llm_backend) }), code("llm_backend", p.llm_backend)] : []),
    req(lanes.length > 0 || !p, "Open models: NVIDIA Nemotron",
      "A fast lane for routing and short answers, a deep lane for investigation and judging.",
      lanes.map((m) => code("", m.split("/").pop()))),
    req(true, "A team of agents, not one prompt",
      "Watchers read, the Investigator explains, the Skeptic attacks it, the Judge scores every claim against its evidence.",
      [h("a", { href: "#/ask", text: "Watch a run" })]),
    req(sources != null || !p, "Real, live data",
      "Live gauges and river forecasts across Europe through Zetaris, each claim tied to the query that produced it.",
      sources != null ? [code("live sources", sources), p?.data_backend ? code("data", p.data_backend) : null] : []),
    req(p ? p.tavily === true : true, "Web context, kept apart",
      "Tavily adds recent news for a named place. Web sources are labelled and never used as measurements.",
      p ? [code("tavily", p.tavily ? "on" : "off")] : []),
    req(true, "A person decides",
      "Proposed actions pause for approval. A rejection needs a reason; approvals are remembered for later runs.",
      [h("a", { href: "#/decide", text: "Open Decide" }), w?.counts ? code("waiting", w.counts.awaiting_approval ?? 0) : null]),
    req(true, "Open source",
      "The whole system, agents, API and data views, is public under Apache-2.0.",
      [h("a", { href: REPO, target: "_blank", rel: "noopener noreferrer", text: "Source on GitHub" }),
        h("a", { href: NEBIUS_DEMO, target: "_blank", rel: "noopener noreferrer", text: "Copy running on Nebius Cloud" })]),
  ];
}

function req(ok, title, text, proof) {
  return h("div", { class: "req" },
    h("span", { class: `mark${ok ? "" : " no"}`, "aria-label": ok ? "met" : "check", text: ok ? "✓" : "!" }),
    h("div", {}, h("h3", { text: title }), h("p", { text }),
      proof?.filter(Boolean).length ? h("div", { class: "proof" }, proof) : null));
}

function usageCard(p) {
  const lanes = Object.entries(p?.llm_usage?.lanes || {});
  if (!lanes.length) return null;
  return h("div", { class: "card" },
    h("h2", { text: "Model use since the last restart" }),
    h("div", { class: "grid three" }, lanes.map(([lane, u]) =>
      h("div", { class: "stat" },
        h("b", { text: num(u.calls) }),
        h("span", { text: `${lane} lane calls, ${num(u.total_tokens)} tokens${u.avg_latency_ms ? `, ${num(u.avg_latency_ms / 1000, 1)} s average` : ""}` })))));
}

const box = (title, text) => h("div", { class: "box" }, h("b", { text: title }), h("span", { text }));
const code = (k, v) => h("code", { text: k ? `${k}: ${v}` : String(v) });
