from __future__ import annotations

import os
from pathlib import Path
from typing import TYPE_CHECKING, Any

from app.skills.base import Skill, SkillInput, SkillOutput
from app.skills.registry import registry

if TYPE_CHECKING:
    from app.core.context import AgentContext

_DEFAULT_ALLOWED = ["/tmp", "/workspace"]


def _get_allowed_dirs() -> list[Path]:
    raw = os.environ.get("FILE_READER_ALLOWED_DIRS", ",".join(_DEFAULT_ALLOWED))
    return [Path(p.strip()).resolve() for p in raw.split(",") if p.strip()]


def _is_allowed(path: Path) -> bool:
    resolved = path.resolve()
    return any(
        resolved == allowed or str(resolved).startswith(str(allowed) + os.sep)
        for allowed in _get_allowed_dirs()
    )


class FileReaderInput(SkillInput):
    path: str
    encoding: str = "utf-8"
    max_chars: int = 50_000


class FileReaderSkill(Skill):
    name = "file_reader"
    display_name = "File Reader"
    description = "Read the contents of a file from the filesystem. Only paths inside allowed directories are accessible."
    input_schema = FileReaderInput

    async def run(self, input: dict[str, Any], context: AgentContext | None = None) -> SkillOutput:
        try:
            data = FileReaderInput(**input)
            target = Path(data.path)

            if not _is_allowed(target):
                return SkillOutput(
                    success=False,
                    error=f"Path '{data.path}' is outside allowed directories: {_get_allowed_dirs()}",
                )

            if not target.exists():
                return SkillOutput(success=False, error=f"File not found: {data.path}")

            if not target.is_file():
                return SkillOutput(success=False, error=f"Not a file: {data.path}")

            content = target.read_text(encoding=data.encoding)
            truncated = len(content) > data.max_chars
            return SkillOutput(
                success=True,
                result=content[: data.max_chars],
                metadata={
                    "path": str(target.resolve()),
                    "size_chars": len(content),
                    "truncated": truncated,
                },
            )
        except PermissionError:
            return SkillOutput(success=False, error=f"Permission denied: {data.path}")
        except Exception as exc:
            return SkillOutput(success=False, error=str(exc))


registry.register(FileReaderSkill())
