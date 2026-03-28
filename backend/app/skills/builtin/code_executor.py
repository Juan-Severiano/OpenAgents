from __future__ import annotations

import asyncio
import io
import traceback
from concurrent.futures import ThreadPoolExecutor
from typing import TYPE_CHECKING, Any

from app.skills.base import Skill, SkillInput, SkillOutput
from app.skills.registry import registry

if TYPE_CHECKING:
    from app.core.context import AgentContext

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="code_exec")


def _run_restricted(code: str) -> tuple[bool, str]:
    """Compile and execute code in a RestrictedPython sandbox. Returns (success, output)."""
    try:
        from RestrictedPython import compile_restricted, safe_globals
        from RestrictedPython.Guards import safe_builtins, guarded_iter_unpack_sequence

        byte_code = compile_restricted(code, filename="<agent_code>", mode="exec")
        stdout_buf = io.StringIO()

        restricted_globals = {
            **safe_globals,
            "__builtins__": {
                **safe_builtins,
                "print": lambda *a, **kw: stdout_buf.write(" ".join(str(x) for x in a) + "\n"),
                "_getiter_": iter,
                "_getattr_": getattr,
                "_iter_unpack_sequence_": guarded_iter_unpack_sequence,
            },
        }
        local_vars: dict = {}
        exec(byte_code, restricted_globals, local_vars)  # noqa: S102

        output = stdout_buf.getvalue()
        # If there's a `result` variable, include it
        if "result" in local_vars:
            output += f"\nresult = {local_vars['result']!r}"

        return True, output or "(no output)"
    except SyntaxError as exc:
        return False, f"SyntaxError: {exc}"
    except Exception:
        return False, traceback.format_exc()


class CodeExecutorInput(SkillInput):
    code: str
    timeout: int = 10


class CodeExecutorSkill(Skill):
    name = "code_executor"
    display_name = "Code Executor"
    description = (
        "Execute Python code in a restricted sandbox. "
        "Use `print()` to produce output or set a `result` variable. "
        "No file I/O, network access, or imports of dangerous modules are allowed."
    )
    input_schema = CodeExecutorInput

    async def run(self, input: dict[str, Any], context: AgentContext | None = None) -> SkillOutput:
        try:
            data = CodeExecutorInput(**input)
            loop = asyncio.get_event_loop()
            success, output = await asyncio.wait_for(
                loop.run_in_executor(_executor, _run_restricted, data.code),
                timeout=float(data.timeout),
            )
            return SkillOutput(
                success=success,
                result=output,
                error=None if success else output,
                metadata={"lines": data.code.count("\n") + 1},
            )
        except asyncio.TimeoutError:
            return SkillOutput(
                success=False,
                error=f"Code execution timed out after {data.timeout}s",
            )
        except Exception as exc:
            return SkillOutput(success=False, error=str(exc))


registry.register(CodeExecutorSkill())
