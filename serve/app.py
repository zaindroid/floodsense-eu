"""The one app this container serves.

Mounts the team's API under /api and this repository's own UI (serve/web) at
/. The endpoints the platform asks for live here, because they describe the
container rather than any one service inside it. The app is open: no sign-in.
"""

from __future__ import annotations

import os
from pathlib import Path

import httpx
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.main import app as api_app  # api/app/main.py, mirrored from main
from serve.stream import app as stream_app

AGENTS_URL = os.environ.get("AGENTS_URL", "http://127.0.0.1:8100").rstrip("/")
WEB = Path(__file__).with_name("web")

app = FastAPI(title="FloodSense EU", version=api_app.version)


@app.get("/health")
def health() -> dict[str, str]:
    """Process liveness only. It must not wait on anything behind it:
    a slow dependency here marks the whole node unhealthy."""
    return {"status": "ok", "service": "floodsense-eu"}


@app.get("/ready")
async def ready() -> JSONResponse:
    """Ready when the graph behind the API answers, and not before."""
    checks: dict[str, str] = {}
    async with httpx.AsyncClient(timeout=3.0) as client:
        for name, url in (("agents", f"{AGENTS_URL}/ready"),):
            try:
                r = await client.get(url)
                checks[name] = "ok" if r.status_code == 200 else f"http {r.status_code}"
            except httpx.HTTPError as e:
                checks[name] = type(e).__name__
    ok = all(v == "ok" for v in checks.values())
    return JSONResponse({"ready": ok, "checks": checks}, status_code=200 if ok else 503)


@app.get("/version")
def version() -> dict[str, str]:
    return {
        "sha": os.environ.get("GIT_SHA", "dev"),
        "built": os.environ.get("BUILT_AT", "unknown"),
        "source": os.environ.get("SOURCE_REF", "main"),
    }


# Order matters: /api/stream is claimed before /api, and /api before the UI.
app.mount("/api/stream", stream_app)
app.mount("/api", api_app)


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    # The shell is never cached, so a new build is seen on the next visit.
    return FileResponse(WEB / "index.html", headers={"cache-control": "no-store"})


class Web(StaticFiles):
    """The UI's files are not fingerprinted. no-cache would be raised to hours by the CDN, so no-store."""

    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        response.headers["cache-control"] = "no-store"
        return response


app.mount("/", Web(directory=WEB), name="web")
