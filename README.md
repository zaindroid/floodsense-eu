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
| Overview | What FloodSense does, live numbers, how the agents work, who it is for |
| Watch | Every place read live, its state, its source and how fresh it is |
| Ask | A question in plain words, each agent working step by step, then a cited answer |
| Decide | The actions the agents propose, held until a person approves or rejects them |
| For the jury | Each requirement with live proof, a one-minute walkthrough, the architecture |

The role switch (citizen, insurer, civil protection) changes the suggested questions and where each
journey starts, never what is true.

## How it runs

One container: the agents and the API behind `/api`, the interface at `/`. Model calls go to NVIDIA
Nemotron on Nebius Token Factory; data comes from Zetaris; Tavily adds labelled web context when a
place is named.

Settings live on the platform, never in the repository: `LLM_BACKEND=nebius`, `NEBIUS_API_KEY`,
`ZETARIS_REST_URL`, `ZETARIS_API_KEY`, `FF_LIVE_DATA`, `FF_TAVILY`, `TAVILY_API_KEY`, and the run caps.

## Licence

Apache License 2.0, as the monorepo.
