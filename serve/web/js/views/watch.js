import { get } from "../api.js";
import { role } from "../roles.js";
import { ago, clock, failure, fill, h, loading, num, pill } from "../ui.js";

// The eight Valencia points (ui/src/fixtures/valencia_points.json on main).
const VALENCIA = {
  VAL01: "Paiporta", VAL02: "Catarroja", VAL03: "Sedaví", VAL04: "Alfafar",
  VAL05: "Benetússer", VAL06: "Algemesí", VAL07: "Chiva", VAL08: "Utiel",
};
// main's own labelled line for the Valencia model points; not an official threshold.
const VALENCIA_LINE = 20;

const STATE = {
  normal: { word: "Normal", tone: "ok", rank: 0 },
  watch: { word: "Watch", tone: "watch", rank: 1 },
  high: { word: "High", tone: "high", rank: 2 },
  unknown: { word: "No threshold", tone: "", rank: -1 },
};
const BAND = { below: "normal", near: "watch", above: "high" };
const countries = new Intl.DisplayNames(["en"], { type: "region" });
const country = (code) => { try { return countries.of(code); } catch { return code; } };

const titled = (s) => String(s || "").toLowerCase().replace(/(^|[\s(\-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

export function watch(root) {
  const body = h("div", {}, loading("Reading the live sources…"));
  root.append(
    h("header", { class: "page-head" },
      h("h1", { text: role() === "citizen" ? "Is my area at risk?" : "What we're watching" }),
      h("p", { text: "Every place FloodSense reads live, with its state, where the number comes from, and how fresh it is." })),
    body);

  Promise.all([
    get("/views/gauge_levels"), get("/views/eu_watch"), get("/views/hazard_now"),
    get("/watch/status").catch(() => null), get("/watch/events?limit=8").catch(() => null),
  ])
    .then(([gauges, eu, hazard, status, events]) => render(body, places(gauges, eu, hazard), status, events?.events || []))
    .catch((e) => body.replaceChildren(failure(e)));
}

function places(gauges, eu, hazard) {
  const out = [];
  for (const g of gauges || []) {
    const trend = typeof g.trend_cm_h === "number" ? g.trend_cm_h : null;
    out.push({
      group: "germany", place: titled(g.station), where: `${titled(g.water)}, Germany`,
      value: `${num(g.level_cm)} cm`, detail: g.mhw_cm ? `usual high ${num(g.mhw_cm)} cm` : "",
      trend, state: BAND[g.band] || "unknown", source: "Gauge, measured", at: g.ts_utc,
    });
  }
  for (const e of eu || []) {
    out.push({
      group: "europe", place: e.name, where: `${e.river}, ${country(e.country)}`,
      value: `${num(e.forecast_max_m3s)} m³/s`, detail: e.past30_median_m3s ? `${num(e.forecast_max_m3s / e.past30_median_m3s, 1)}× its usual flow` : "",
      trend: null, state: BAND[e.band] || "unknown", source: "River model, 7-day forecast", at: e.as_of_date,
    });
  }
  const byPoint = {};
  for (const r of hazard || []) (byPoint[r.point_id] ||= []).push(r);
  for (const [id, rows] of Object.entries(byPoint)) {
    const past = rows.filter((r) => r.horizon === "past").sort((a, b) => String(a.ts_utc).localeCompare(String(b.ts_utc)));
    const now = past[past.length - 1];
    const peak = Math.max(...rows.filter((r) => r.horizon === "forecast").map((r) => r.discharge_m3s ?? 0), now?.discharge_m3s ?? 0);
    out.push({
      group: "valencia", place: VALENCIA[id] || id, where: "Valencia, Spain",
      value: `${num(now?.discharge_m3s, 1)} m³/s`, detail: `next 48 h up to ${num(peak, 1)} m³/s`,
      trend: null, state: peak > VALENCIA_LINE ? "watch" : "normal", source: "River model, 48-hour forecast", at: now?.ts_utc,
    });
  }
  return out;
}

const GROUPS = { all: "All places", germany: "Germany", europe: "Rest of Europe", valencia: "Valencia" };

function render(body, all, status, events) {
  let group = "all";
  const counts = (k) => all.filter((p) => p.state === k).length;
  const list = h("div", { class: "rows" });
  const chips = h("div", { class: "chips", role: "group", "aria-label": "Filter places" });

  const draw = () => {
    chips.replaceChildren(...Object.entries(GROUPS).map(([k, label]) =>
      h("button", { class: "chip", type: "button", "aria-pressed": String(k === group), onclick: () => { group = k; draw(); } },
        `${label} (${k === "all" ? all.length : all.filter((p) => p.group === k).length})`)));
    const shown = all.filter((p) => group === "all" || p.group === group)
      .sort((a, b) => STATE[b.state].rank - STATE[a.state].rank || a.place.localeCompare(b.place));
    list.replaceChildren(...shown.map(row));
  };
  draw();

  const freshest = all.map((p) => p.at).filter(Boolean).sort().pop();
  fill(body,
    h("div", { class: "grid three card" },
      stat(counts("normal"), "Normal", "ok"), stat(counts("watch"), "Watch", "watch"), stat(counts("high"), "High", "high")),
    h("p", { class: "note", style: "margin-top:1rem" },
      `Latest reading ${ago(freshest)}. "Watch" and "High" compare each place with its own usual level; they are not official warnings.`),
    h("div", { class: "section" }, chips, h("div", { style: "height:1rem" }), list),
    events.length ? h("section", { class: "section card" },
      h("h2", { text: "What the watch noticed" }),
      h("div", { class: "feed" }, events.slice(0, 8).map((e) =>
        h("div", { class: "feed-item" }, h("time", { text: clock(e.ts) }), h("div", {}, h("span", { text: e.text })))))) : null,
    status?.counts ? h("p", { class: "muted small", style: "margin-top:1rem" },
      `The watch checks ${status.counts.sources} sources; last run ${ago(status.last_cycle?.finished_at)}.`) : null,
  );
}

function row(p) {
  const st = STATE[p.state];
  const trend = p.trend === null ? null : p.trend > 0 ? `rising ${num(p.trend)} cm/h` : p.trend < 0 ? `falling ${num(-p.trend)} cm/h` : "steady";
  return h("div", { class: "row" },
    h("div", { class: "place" }, h("b", { text: p.place }), h("span", { text: p.where })),
    h("div", { class: "val" }, p.value, " ", h("small", { text: [p.detail, trend].filter(Boolean).join(", ") })),
    h("div", { class: "src", text: p.source }),
    pill(st.word, st.tone));
}

function stat(value, label, tone) {
  return h("div", { class: "stat" }, h("b", { text: String(value), style: `color:var(--${tone})` }), h("span", { text: label }));
}
