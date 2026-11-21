"""Odpowiedzi wzorcowe do test/limits-zestaw.json (narzędzie deweloperskie, nie część apki).

Uruchom z katalogu repo:
  python3 -m venv scripts/limits-reference/.venv
  scripts/limits-reference/.venv/bin/pip install sympy
  scripts/limits-reference/.venv/bin/python scripts/limits-reference/reference.py
"""
import json
import re
import sys
from pathlib import Path

from sympy import E, Symbol, limit, log, oo, root, sqrt, cbrt, zoo, nan
from sympy.parsing.sympy_parser import (
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

ROOT = Path(__file__).resolve().parents[2]
FILE = ROOT / "test" / "limits-zestaw.json"
HEAD = re.compile(r"^lim\s+([a-z])\s*→\s*(-?∞|-?\d+(?:[.,]\d+)?)\s+(.+)$")


def to_sympy(src: str) -> str:
    s = src.replace("−", "-").replace("^", "**")
    s = re.sub(r"log_(\d+)\(", r"logb\1(", s)
    # ∛( … ) / ∜( … ) z dopasowanym nawiasem; ∜(n) też ma nawias w zestawie
    for sym, fn in (("∛", "cbrt"), ("∜", "root4")):
        s = s.replace(sym, fn)
    return s


def logb_factory(base):
    return lambda u: log(u, base)


def main() -> int:
    data = json.loads(FILE.read_text(encoding="utf-8"))
    tr = standard_transformations + (implicit_multiplication_application,)
    for row in data:
        m = HEAD.match(row["input"])
        if not m:
            print("nie rozumiem:", row["id"], row["input"])
            return 1
        name, target, body = m.groups()
        v = Symbol(name, positive=(name == "n"))
        local = {
            name: v, "sqrt": sqrt, "cbrt": cbrt, "root4": lambda u: root(u, 4), "e": E,
            "logb2": logb_factory(2), "logb4": logb_factory(4),
        }
        expr = parse_expr(to_sympy(body), local_dict=local, transformations=tr)
        at = oo if target == "∞" else (-oo if target == "-∞" else float(target.replace(",", ".")))
        if at not in (oo, -oo):
            at = int(at) if float(at).is_integer() else at
        res = limit(expr, v, at)
        if res in (nan, zoo) or res.has(nan):
            print("SymPy nie rozstrzygnął:", row["id"], res)
            return 1
        row["sympy"] = str(res)
        row["value"] = "inf" if res == oo else ("-inf" if res == -oo else float(res.evalf(30)))
        print(f'{row["id"]:>3}  {res}')
    FILE.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
