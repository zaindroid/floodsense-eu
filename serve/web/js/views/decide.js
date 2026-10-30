import { get, myRuns, post } from "../api.js";
import { ago, failure, fill, h, loading, pill } from "../ui.js";
import { answer } from "./ask.js";

const DONE = { approved: ["Approved", "ok"], edited: ["Approved with edits", "ok"], auto: ["Approved", "ok"], rejected: ["Rejected", "high"] };

export function decide(root, go, runId) {
  root.append(h("header", { class: "page-head" },
    h("h1", { text: "Decide" }),
    h("p", { text: "The agents propose; a person decides. Nothing leaves FloodSense until someone approves it here." })));
  const body = h("div", {}, loading("Loading decisions…"));
  root.append(body);
  (runId ? detail(body, runId, go) : queue(body)).catch((e) => body.replaceChildren(failure(e)));
}

async function queue(body) {
  const status = await get("/watch/status").catch(() => null);
  const ids = [...new Set([...(status?.awaiting_run_ids || []), ...myRuns().map((r) => r.id)])].slice(0, 12);
  const runs = (await Promise.all(ids.map((id) => get(`/runs/${encodeURIComponent(id)}`).catch(() => null)))).filter((r) => r?.summary);
  const waiting = runs.filter((r) => r.status === "awaiting_approval");
  const decided = runs.filter((r) => DONE[r.approval?.status]);

  fill(body,
    h("h2", { text: waiting.length ? `Waiting for you (${waiting.length})` : "Waiting for you" }),
    waiting.length ? h("div", { class: "rows" }, waiting.map(rowOf))
      : h("div", { class: "empty" }, h("p", { style: "margin:0 0 1rem", text: "Nothing is waiting. Ask a question about a past flood to see the agents propose actions." }),
        h("a", { class: "btn primary", href: "#/ask" }, "Ask the agents")),
    decided.length ? h("div", { class: "section" }, h("h2", { text: "Decided" }), h("div", { class: "rows" }, decided.map(rowOf))) : null,
  );
}

function rowOf(run) {
  const [word, tone] = run.status === "awaiting_approval" ? ["Waiting", "watch"] : DONE[run.approval?.status] || [run.status, ""];
  const n = (run.playbook || []).length;
  return h("a", { class: "row", href: `#/decide/${encodeURIComponent(run.run_id)}`, style: "color:inherit;text-decoration:none" },
    h("div", { class: "place" }, h("b", { text: run.request?.question || run.summary.slice(0, 90) }), h("span", { text: ago(run.trace?.[0]?.ts || run.cached_at) })),
    h("div", { class: "val" }, `${n} ${n === 1 ? "action" : "actions"}`),
    h("div", { class: "src", text: run.judge_summary?.overall != null ? `Judge ${Math.round(run.judge_summary.overall * 100)}%` : "" }),
    pill(word, tone));
}

async function detail(body, runId, go) {
  const run = await get(`/runs/${encodeURIComponent(runId)}`);
  const waiting = run.status === "awaiting_approval";
  const actions = run.playbook || [];
  const note = h("textarea", { "aria-label": "Note for the record", placeholder: "Why you decided this (needed to reject)" });
  const msg = h("p", { role: "status", class: "muted small" });
  const buttons = [
    h("button", { class: "btn primary", type: "button", onclick: () => send("approve") }, "Approve and release"),
    h("button", { class: "btn danger", type: "button", onclick: () => send("reject") }, "Reject"),
  ];

  async function send(action) {
    if (action === "reject" && !note.value.trim()) {
      msg.className = "err small";
      msg.textContent = "Add a short note so the record says why it was rejected.";
      note.focus();
      return;
    }
    buttons.forEach((b) => (b.disabled = true));
    msg.className = "muted small";
    msg.textContent = action === "approve" ? "Approving…" : "Rejecting…";
    try {
      await post(`/runs/${encodeURIComponent(runId)}/approval`, { action, reviewer: "jury", reviewer_note: note.value.trim() || null });
      body.replaceChildren(loading("Saved. Reloading…"));
      await detail(body, runId, go);
    } catch (e) {
      buttons.forEach((b) => (b.disabled = false));
      msg.className = "err small";
      msg.textContent = e.status === 409 ? "Someone already decided this run." : `Could not save the decision. ${e.message}`;
    }
  }

  const [word, tone] = waiting ? ["Waiting for a decision", "watch"] : DONE[run.approval?.status] || [run.status, ""];
  fill(body,
    h("p", {}, h("a", { href: "#/decide", text: "All decisions" })),
    h("div", { class: "run", style: "grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)" },
      h("div", { class: "answer card" }, answer(run, false)),
      h("div", { class: "card" },
        h("div", { style: "display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem" },
          h("h2", { style: "margin:0", text: "Proposed actions" }), pill(word, tone)),
        actions.length ? h("div", { class: "grid" }, actions.map((a) =>
          h("div", { class: "action" },
            h("div", { style: "display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.4rem" },
              pill(a.outbound ? "Sends a message" : "Internal", a.outbound ? "info" : "plain"),
              a.horizon_h != null ? pill(`within ${a.horizon_h} h`, "plain") : null,
              a.released ? pill("Released", "ok") : null),
            h("h3", { text: a.title || a.text }),
            a.title && a.text !== a.title ? h("p", { class: "muted small", style: "margin:0", text: a.text }) : null,
            a.target_region || a.affected_site_count != null ? h("p", { class: "muted small", style: "margin:.3rem 0 0",
              text: [a.target_region, a.affected_site_count != null ? `${a.affected_site_count} insured sites` : null].filter(Boolean).join(", ") }) : null,
            a.draft_message ? h("div", { class: "draft", text: a.draft_message }) : null)))
          : h("p", { class: "muted", text: "This answer proposed no actions." }),
        waiting ? h("div", { class: "decide-form grid", style: "margin-top:1.2rem" }, note,
          h("div", { style: "display:flex;gap:.6rem;flex-wrap:wrap" }, buttons), msg)
          : run.approval?.reviewer_note ? h("p", { class: "note", style: "margin-top:1.2rem", text: `Note: ${run.approval.reviewer_note}` }) : null)),
  );
}
