# FloodSense EU

Flood alerts across Europe from a team of AI agents that cite every number. A person makes the call.

Live at **https://floodsense-eu.zaindroid.me**. Open, no sign-in.

The agents, API and data views come from
[FloodSenseEU-Hackathon-Monorepo](https://github.com/GenAI-Open-Agent-Hackathon/FloodSenseEU-Hackathon-Monorepo)
`main`. This repository adds a new interface in `serve/web`: plain HTML, CSS and JavaScript modules,
no build step.

## Pages

| Page | What it shows |
|---|---|
| Home | Different for each role: a plain check of one place (citizen), an exposure desk with a map of insured sites (insurer), an operations board with a map of every place (civil protection) |
| Watch | Every place read live, its state, its source and how fresh it is |
| Ask | A question in plain words, each agent working step by step, then a cited answer. A panel at the bottom shows the run moving through sources, Zetaris, the agents and Nebius |
| Decide | The actions the agents propose, held until a person approves or rejects them |

The role switch (citizen, insurer, civil protection) changes each page's layout and what it puts first,
and tells the agents how to word their answer. It never changes what is true. Citizens ask in a simple
chat and do not see Decide.

## How it runs

One container: the agents and the API behind `/api`, the interface at `/`. Model calls go to NVIDIA
Nemotron on Nebius Token Factory; data comes from Zetaris; Tavily adds labelled web context when a
place is named.

Settings live on the platform, never in the repository: `LLM_BACKEND=nebius`, `NEBIUS_API_KEY`,
`ZETARIS_REST_URL`, `ZETARIS_API_KEY`, `FF_LIVE_DATA`, `FF_TAVILY`, `TAVILY_API_KEY`, and the run caps.

## Licence

Apache License 2.0, as the monorepo.
