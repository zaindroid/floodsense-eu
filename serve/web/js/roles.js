// Three people FloodSense serves. The role changes what is offered first, not what is true.

export const ROLES = {
  citizen: {
    label: "Citizen",
    questions: [
      { q: "Is the Rhine at Köln rising right now?", when: "now", place: "Köln" },
      { q: "Is Paiporta at risk of flooding right now?", when: "now", place: "Paiporta" },
      { q: "What happened in Paiporta on 29 October 2024?", when: "valencia", place: "Paiporta" },
    ],
  },
  insurer: {
    label: "Insurer",
    questions: [
      { q: "Why are our Valencia sites at risk?", when: "valencia", place: "Paiporta" },
      { q: "Which insured sites sat inside the flood footprint?", when: "valencia", place: "Valencia" },
      { q: "What was known by 15:00 UTC on 14 July 2021?", when: "ahr", place: "Ahrweiler" },
    ],
  },
  civil: {
    label: "Civil protection",
    questions: [
      { q: "Where in Europe are rivers above their usual level today?", when: "now", place: null },
      { q: "When did the river peak at Paiporta, and what warned of it first?", when: "valencia", place: "Paiporta" },
      { q: "Which places on the Ahr flooded first in July 2021?", when: "ahr", place: "Ahrweiler" },
    ],
  },
};

const KEY = "fs.role";
export function role() {
  const r = localStorage.getItem(KEY);
  return ROLES[r] ? r : "insurer";
}
export function setRole(r) {
  if (ROLES[r]) localStorage.setItem(KEY, r);
}

// The past floods the agents can replay, and "now" for live data.
export const WHEN = {
  now: { label: "Now (live)", event_id: null, replay_ts: null },
  valencia: { label: "Valencia, Oct 2024", event_id: "EMSR773", replay_ts: "2024-10-29T18:00:00Z" },
  ahr: { label: "Ahr valley, Jul 2021", event_id: "EMSR517", replay_ts: "2021-07-14T15:00:00Z" },
};
