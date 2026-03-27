from __future__ import annotations

import ast
import math
import operator
from typing import TYPE_CHECKING, Any

from app.skills.base import Skill, SkillInput, SkillOutput
from app.skills.registry import registry

if TYPE_CHECKING:
    from app.core.context import AgentContext

_SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
    ast.FloorDiv: operator.floordiv,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

_SAFE_FUNCTIONS = {
    "abs": abs, "round": round, "min": min, "max": max,
    "sqrt": math.sqrt, "log": math.log, "log10": math.log10,
    "sin": math.sin, "cos": math.cos, "tan": math.tan,
    "pi": math.pi, "e": math.e,
}


def _safe_eval(node: ast.expr) -> float:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)
    if isinstance(node, ast.Name) and node.id in _SAFE_FUNCTIONS:
        val = _SAFE_FUNCTIONS[node.id]
        if isinstance(val, float):
            return val
        raise ValueError(f"Cannot use {node.id} as a value")
    if isinstance(node, ast.BinOp) and type(node.op) in _SAFE_OPERATORS:
        return _SAFE_OPERATORS[type(node.op)](_safe_eval(node.left), _safe_eval(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _SAFE_OPERATORS:
        return _SAFE_OPERATORS[type(node.op)](_safe_eval(node.operand))
    if isinstance(node, ast.Call):
        func_name = node.func.id if isinstance(node.func, ast.Name) else None  # type: ignore[attr-defined]
        if func_name in _SAFE_FUNCTIONS:
            fn = _SAFE_FUNCTIONS[func_name]
            if callable(fn):
                args = [_safe_eval(a) for a in node.args]
                return float(fn(*args))
    raise ValueError(f"Unsafe expression: {ast.dump(node)}")


class CalculatorInput(SkillInput):
    expression: str


class CalculatorSkill(Skill):
    name = "calculator"
    display_name = "Calculator"
    description = "Evaluate a mathematical expression safely. Supports +, -, *, /, **, sqrt, sin, cos, log, etc."
    input_schema = CalculatorInput

    async def run(self, input: dict[str, Any], context: AgentContext | None = None) -> SkillOutput:
        try:
            data = CalculatorInput(**input)
            tree = ast.parse(data.expression, mode="eval")
            result = _safe_eval(tree.body)
            return SkillOutput(
                success=True,
                result=str(result),
                metadata={"expression": data.expression},
            )
        except Exception as exc:
            return SkillOutput(success=False, error=str(exc))


registry.register(CalculatorSkill())
