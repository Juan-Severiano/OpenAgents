"""GitHub Skill Importer — fetches and validates skills from public GitHub repos.

Expected repo structure:
  skill.json   — manifest (name, display_name, description, input_schema, entrypoint?)
  skill.py     — implementation (script-style, same sandbox as custom_python)

URL formats supported:
  https://github.com/owner/repo
  https://github.com/owner/repo/tree/REF
  https://github.com/owner/repo/tree/REF/subpath
  (or pass subdir= explicitly in the request)
"""

from __future__ import annotations

import json
from urllib.parse import urlparse

import httpx
import structlog

log = structlog.get_logger(__name__)

_GITHUB_RAW = "https://raw.githubusercontent.com"
_GITHUB_API = "https://api.github.com"


def _parse_github_url(url: str) -> tuple[str, str, str | None, str]:
    """Return (owner, repo, ref_or_None, subdir)."""
    parsed = urlparse(url)
    if parsed.netloc not in ("github.com", "www.github.com"):
        raise ValueError(f"Not a GitHub URL: {url}")

    parts = [p for p in parsed.path.strip("/").split("/") if p]
    if len(parts) < 2:
        raise ValueError(f"Invalid GitHub URL — expected github.com/owner/repo: {url}")

    owner, repo = parts[0], parts[1]
    ref: str | None = None
    subdir = ""

    if len(parts) >= 4 and parts[2] == "tree":
        ref = parts[3]
        subdir = "/".join(parts[4:])

    return owner, repo, ref, subdir


async def _get_default_branch(owner: str, repo: str, token: str | None) -> str:
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{_GITHUB_API}/repos/{owner}/{repo}", headers=headers)
        if resp.status_code == 404:
            raise ValueError(f"Repository '{owner}/{repo}' not found or is private")
        resp.raise_for_status()
        return resp.json()["default_branch"]


async def _fetch_raw(
    owner: str, repo: str, ref: str, filepath: str, token: str | None
) -> str:
    url = f"{_GITHUB_RAW}/{owner}/{repo}/{ref}/{filepath}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code == 404:
            raise FileNotFoundError(filepath)
        resp.raise_for_status()
        return resp.text


async def _resolve_commit_sha(
    owner: str, repo: str, ref: str, token: str | None
) -> str:
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{_GITHUB_API}/repos/{owner}/{repo}/commits/{ref}",
            headers=headers,
        )
        if resp.status_code == 200:
            return resp.json()["sha"]
    return ref  # fallback: store the ref name itself


async def fetch_skill_from_github(
    url: str,
    subdir: str = "",
    token: str | None = None,
) -> dict:
    """Fetch, validate, and return a dict ready to insert as a Skill record.

    Raises ValueError with a user-friendly message on any validation failure.
    """
    owner, repo, ref, parsed_subdir = _parse_github_url(url)

    # subdir from request body takes precedence over URL-parsed subdir
    subdir = (subdir.strip("/") or parsed_subdir).strip("/")

    if not ref:
        ref = await _get_default_branch(owner, repo, token)
        log.debug("github_importer.resolved_branch", owner=owner, repo=repo, ref=ref)

    prefix = f"{subdir}/" if subdir else ""

    # --- Fetch manifest ---
    try:
        manifest_raw = await _fetch_raw(owner, repo, ref, f"{prefix}skill.json", token)
    except FileNotFoundError:
        raise ValueError(
            f"skill.json not found at '{prefix}skill.json' in {owner}/{repo}@{ref}. "
            "The repo must have a skill.json manifest at the root (or specified subdir)."
        )

    try:
        manifest: dict = json.loads(manifest_raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"skill.json is not valid JSON: {exc}")

    required_fields = {"name", "display_name", "description", "input_schema"}
    missing = required_fields - set(manifest.keys())
    if missing:
        raise ValueError(f"skill.json is missing required fields: {sorted(missing)}")

    if not isinstance(manifest["input_schema"], dict):
        raise ValueError("skill.json: 'input_schema' must be a JSON Schema object")

    entrypoint = manifest.get("entrypoint", "skill.py")

    # --- Fetch implementation ---
    try:
        code = await _fetch_raw(owner, repo, ref, f"{prefix}{entrypoint}", token)
    except FileNotFoundError:
        raise ValueError(
            f"Entrypoint '{prefix}{entrypoint}' not found in {owner}/{repo}@{ref}. "
            f"Set 'entrypoint' in skill.json or ensure skill.py exists."
        )

    # Validate Python syntax before storing
    try:
        compile(code, entrypoint, "exec")
    except SyntaxError as exc:
        raise ValueError(f"Syntax error in {entrypoint}: {exc}")

    # --- Resolve commit SHA for reproducibility ---
    commit_sha = await _resolve_commit_sha(owner, repo, ref, token)

    canonical_url = f"https://github.com/{owner}/{repo}"
    if subdir:
        canonical_url = f"{canonical_url}/tree/{ref}/{subdir}"

    log.info(
        "github_importer.fetched",
        owner=owner,
        repo=repo,
        ref=ref,
        commit=commit_sha[:7] if len(commit_sha) > 7 else commit_sha,
        name=manifest["name"],
    )

    return {
        "name": manifest["name"],
        "display_name": manifest["display_name"],
        "description": manifest["description"],
        "input_schema": manifest["input_schema"],
        "output_schema": manifest.get("output_schema"),
        "type": "custom_python",
        "source": "github",
        "implementation": code,
        "github_url": canonical_url,
        "github_ref": commit_sha,
        "is_public": False,
    }
