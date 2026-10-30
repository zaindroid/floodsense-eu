# FloodSense EU with its own UI, as one container: the API proxy, the agents
# graph and the engines sidecar from the monorepo's main, and serve/ — this
# repository's server and its plain HTML/CSS/JS interface (serve/web), which
# needs no build step.

# The engines run TypeScript directly and have no runtime dependencies,
# so the node binary alone is the whole of what they need.
FROM node:22.18-bookworm-slim AS node

FROM python:3.12-slim
COPY --from=node /usr/local/bin/node /usr/local/bin/node

# Coolify runs its healthcheck inside the container and needs curl or wget.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY api/requirements.txt api-requirements.txt
COPY agents/requirements.txt agents-requirements.txt
RUN pip install --no-cache-dir -r api-requirements.txt -r agents-requirements.txt

COPY api/app ./app
COPY agents/floodsense_agents ./floodsense_agents
COPY engines/package.json engines/NOTICE /engines/
COPY engines/src /engines/src
COPY engines/vendor /engines/vendor
COPY serve ./serve
COPY start.sh /start.sh
RUN chmod +x /start.sh

ENV GIT_SHA=main BUILT_AT=unknown SOURCE_REF=main+pr132+pr131

# 8080 is the only port Coolify's healthcheck targets. The other services stay
# on loopback: nothing inside is reachable from outside except through /api,
# and the engines carry no authentication at all.
ENV PORT=8080 \
    PYTHONPATH=/srv \
    PYTHONUNBUFFERED=1 \
    AGENTS_URL=http://127.0.0.1:8100 \
    AGENTS_HOST=127.0.0.1 \
    AGENTS_PORT=8100 \
    ENGINES_URL=http://127.0.0.1:8300 \
    ENGINES_HOST=127.0.0.1 \
    ENGINES_PORT=8300 \
    ENGINES_DATA_DIR=/engines/.data

# The flags as compose.yaml and the v1.0 defaults have them. FF_LIVE_DATA and
# FF_TAVILY follow external credentials, so the deploy sets them.
ENV FF_SKEPTIC=true \
    FF_HITL=true \
    FF_JUDGE=true \
    FF_HMEM=true \
    FF_RAG_DOCS=false \
    FF_SEMANTIC_CACHE=true \
    FF_CACHED_REPLAY=true

# The graph's checkpointer. auto means sqlite here, falling back to memory if
# the directory is not writable. Runs survive a restart, not a rebuild.
ENV CHECKPOINTER=auto \
    CHECKPOINT_DIR=/data/checkpoints
RUN mkdir -p /data/checkpoints

EXPOSE 8080
CMD ["/start.sh"]
