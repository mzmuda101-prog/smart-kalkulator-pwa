"""Bramka „każde = jest prawdą” (narzędzie deweloperskie, nie część apki), część 2 z 2.

Czyta steps.json z dump.js (kawałki LaTeX kroków, dokładnie to, co rysuje ekran) i sprawdza SymPy,
czy sąsiednie kawałki są sobie równe. Niezależnie od silnika apki: inny parser (LaTeX → SymPy), inna matematyka.

- „=”: tożsamość. W granicach — w punktach blisko celu (przy x → −∞ liczby ujemne), w pochodnych i całkach —
  w punktach próbnych; całka nieoznaczona — przez pochodną (stała C nie przeszkadza).
- W równaniach x jest niewiadomą, więc sprawdzamy tylko rachunki na samych liczbach (Δ = 25 − 24 = 1, sprawdzenie).
- „→”: granica liczona przez SymPy. „≈”: liczbowo, 4 cyfry.
- Kawałki z literami pomocniczymi (u, v, A, B, aₙ, F, Δ, x₁) to definicje — pomijamy je.

LaTeX czyta parse_latex(backend='lark'): gramatyka, bez wykonywania kodu (parse_expr nie jest używany).
Uruchom: npm run check:steps   (kod wyjścia 1 = jest fałszywa równość)
"""
import json
import re
import sys
import warnings
from pathlib import Path

from sympy import (Abs, Derivative, E, Expr, Integral, Limit, Symbol, diff, limit, nsimplify, oo, pi, sympify, zoo, nan)
from sympy.parsing.latex import parse_latex
from sympy import Function
from sympy.core.function import AppliedUndef

warnings.filterwarnings("ignore")
HERE = Path(__file__).resolve().parent
REL = ("=", r"\approx ", r"\to ", "<", ">")
OK_SYMS = {"C"}
PARAM_A = [False]
UNKNOWNS = [set()]  # niewiadome z odpowiedzi równania/układu (x, y) — mogą stać w krokach  # „a” jako parametr tylko w pochodnej a · t² (we wzorze ∫ 1/(x² + a²) to litera ze wzoru)
# znaczniki: lark czyta \alpha jako jeden symbol (zwykłe wieloliterowe nazwy czyta jako iloczyn liter)
MARKS = ["alpha", "beta", "gamma", "zeta", "eta", "theta", "kappa", "lambda", "mu", "nu", "xi", "rho", "sigma", "tau", "chi", "psi"]


class Skip(Exception):
    """kawałek, którego nie sprawdzamy (słowa, litery pomocnicze, nieznany zapis)"""


def strip_html_data(t: str) -> str:
    # \htmlData{formula=f}{X} → X (kolor wzoru)
    while (i := t.find(r"\htmlData{")) >= 0:
        j = t.index("}", i) + 1
        depth, k = 0, j
        for k in range(j, len(t)):
            depth += t[k] == "{"
            depth -= t[k] == "}"
            if depth == 0:
                break
        t = t[:i] + "{" + t[j + 1:k] + "}" + t[k + 1:]
    return t


def group_before(t: str, end: int) -> int:
    """początek grupy kończącej się na t[end-1]: (…), {…} albo jeden znak"""
    close = t[end - 1]
    pair = {")": "(", "}": "{", "]": "["}.get(close)
    if not pair:
        return end - 1
    depth = 0
    for k in range(end - 1, -1, -1):
        depth += t[k] == close
        depth -= t[k] == pair
        if depth == 0:
            return k
    raise Skip("nawias")


def lim_head(t: str):
    """\\lim_{x\\to 0^{+}}reszta → (x, '0', '+', reszta); None, gdy to nie granica"""
    if not t.startswith(r"\lim_{"):
        return None
    depth = 0
    for k in range(len(r"\lim_"), len(t)):
        depth += t[k] == "{"
        depth -= t[k] == "}"
        if depth == 0:
            break
    m = re.fullmatch(r"([a-z])\\to (.*)", t[len(r"\lim_{"):k].strip())
    if not m:
        raise Skip("granica")
    to, side = m.group(2).strip(), "+-"
    if to.endswith("^{+}"):
        side, to = "+", to[:-4].strip()
    elif to.endswith("^{-}"):
        side, to = "-", to[:-4].strip()
    return Symbol(m.group(1)), to, side, t[k + 1:]


def times_after_group(t: str) -> str:
    """„}(” to iloczyn (√n(…), n^{3}(…), \\frac{a}{b}(…)), chyba że to indeks: log_{2}(…)"""
    out, k = t, 0
    while (i := out.find("}(", k)) >= 0:
        s = group_before(out, i + 1)
        k = i + 2
        if s > 0 and out[s - 1] == "_":
            continue
        out = out[:i + 1] + r"\cdot " + out[i + 1:]
    return out


def to_expr(tex: str, var: Symbol, extra: dict) -> Expr:
    t = strip_html_data(tex).strip()
    t = re.sub(r"\\checkmark|\\ \\checkmark", "", t).rstrip(",").strip()
    if t.endswith("{:}"):
        t = t[:-3]
    t = t.replace("{:}", r"\div ")  # „:” w środku to dzielenie (3/5 : 9/10)
    if not t or r"\text" in t:
        raise Skip("słowa")
    t = (t.replace(r"\left", "").replace(r"\right", "").replace("{,}", ".").replace(r"\,", " ")
         .replace(r"\operatorname{tg}", r"\tan").replace(r"\operatorname{ctg}", r"\cot")
         .replace(r"\operatorname{arctg}", r"\arctan").replace(r"\tg", r"\tan").replace(r"\ctg", r"\cot").replace(r"\arctg", r"\arctan"))
    t = re.sub(r"\\pi(?![a-z])", r" \\omega ", t)
    t = re.sub(r"\\log(?!_)", r"\\log_{10}", t)  # w polskiej szkole „log” bez podstawy to log₁₀ (SymPy: ln)
    if t.startswith("[") and t.endswith("]"):
        raise Skip("symbol [ ]")  # [0/0], [∞/∞]: znacznik, nie wartość
    # nawias kwadratowy jak okrągły; iloczyn nawiasów jawnie (lark nie czyta „)(”, „}(”)
    t = re.sub(r"\\sqrt\[(\d)\]", r"\\sqrt§\1¤", t)  # stopień pierwiastka zostaje w [ ]
    t = t.replace("[", "(").replace("]", ")").replace("§", "[").replace("¤", "]")
    t = re.sub(r"\)\s*\(", r")\\cdot (", t)
    t = times_after_group(t)
    # pochodne z primem: (G)′ → znacznik, G liczone osobno
    while (i := t.find(r"^{\prime}")) >= 0:
        s = group_before(t, i)
        base = t[s:i]
        if re.fullmatch(r"[a-zA-Z]", base) and base != str(var):
            raise Skip("u′, f′")
        inner = base[1:-1] if base[0] in "({" else base
        g = to_expr(inner, var, extra)
        key = MARKS[len(extra)]
        extra[key] = diff(g, var)
        t = t[:s] + " \\" + key + " " + t[i + len(r"^{\prime}"):]
    # granica: reszta kawałka to jej treść
    head = lim_head(t)
    if head:
        v, to, side, rest = head
        at = oo if to == r"\infty" else -oo if to == r"-\infty" else to_expr(to, var, extra)
        return Limit(to_expr(rest, v, extra), v, at, dir=side)
    try:
        e = parse_latex(t, backend="lark")
    except Exception as err:  # noqa: BLE001 — nieznany zapis = pomijamy, liczymy w raporcie
        raise Skip("parser: " + type(err).__name__) from err
    if not isinstance(e, Expr) and hasattr(e, "children"):  # Tree('_ambig'): kilka odczytów — muszą być tym samym
        opts = [c for c in e.children if isinstance(c, Expr)]
        # ekran rysuje: x(x − 3) = iloczyn (nie funkcja x), \\sin x = sin tylko jednego znaku (dłuższy argument ma nawias)
        def score(o):
            undef = sum(1 for f in o.atoms(Function) if isinstance(f, AppliedUndef))
            return 1000 * undef + sum(len(str(f.args)) for f in o.atoms(Function))
        if opts:  # odczyt, który gubi litery (np. „0”), odpada
            most = max(sum(o.count(x) for x in o.free_symbols) for o in opts)
            opts = [o for o in opts if sum(o.count(x) for x in o.free_symbols) == most]
            best = min(score(o) for o in opts)
            top = [o for o in opts if score(o) == best]
            try:
                if all(o == top[0] or (o - top[0]).expand() == 0 for o in top[1:]):
                    e = top[0]
            except (TypeError, ValueError):
                pass
    if not isinstance(e, Expr):
        raise Skip("niejednoznaczne")
    e = e.subs({Symbol("e"): E, Symbol("omega"): pi})
    e = e.subs({Symbol(k): v for k, v in extra.items()})
    e = nsimplify(e, rational=True) if any(f.is_Float for f in e.atoms()) else e  # 2.5 → 5/2 (na wyrażeniu, nie na tekście)
    foreign = {s.name for s in e.free_symbols} - {str(var)} - OK_SYMS - ({"a"} if PARAM_A[0] else set()) - UNKNOWNS[0]
    if foreign:
        raise Skip("litery: " + ",".join(sorted(foreign)))
    return e


def value(e: Expr, var: Symbol) -> Expr:
    """granice i całki oznaczone policzone; całka nieoznaczona → pochodna porównywana osobno"""
    if e.has(Limit):
        e = e.replace(lambda x: isinstance(x, Limit), lambda x: x.doit())
    return e


def samples(ctx):
    at = ctx.get("at")
    if at == "oo":
        return [7.3, 11.9, 23.1, 41.7, 97.3]
    if at == "-oo":
        return [-7.3, -11.9, -23.1, -41.7, -97.3]
    if at is not None:
        a, side = at
        d = [0.0013, 0.0031, 0.0071, 0.017]
        return [a + x for x in d] + ([] if side == "+" else [a - x for x in d])
    return [0.37, 0.73, 1.31, 1.93, 2.41, 3.7, -0.61, -1.27]


def num(e: Expr, var: Symbol, x: float):
    v = complex(e.subs({var: x, Symbol("a"): 1.37}).evalf(30))
    return v


def same(a: Expr, b: Expr, var: Symbol, ctx) -> bool | None:
    """True/False; None = nie da się sprawdzić (za mało punktów)"""
    if a.has(Integral) and not all(i.limits and len(i.limits[0]) == 3 for i in a.atoms(Integral)) or \
       b.has(Integral) and not all(i.limits and len(i.limits[0]) == 3 for i in b.atoms(Integral)):
        a, b = diff(a.doit(), var), diff(b.doit(), var)  # ∫ … dx = F: pochodne muszą się zgadzać
    a, b = value(a.doit(), var), value(b.doit(), var)
    if a.has(oo, -oo, zoo) or b.has(oo, -oo, zoo):
        return a == b
    good = 0
    for x in samples(ctx) if (a.free_symbols | b.free_symbols) else [0.0]:
        try:
            p, q = num(a, var, x), num(b, var, x)
        except (TypeError, ValueError, ZeroDivisionError):
            continue
        if any(z != z or abs(z) > 1e12 for z in (p, q)) or abs(p.imag) > 1e-9 or abs(q.imag) > 1e-9:
            continue
        good += 1
        if abs(p - q) > 1e-7 * (1 + abs(p)):
            return False
    return True if good >= (1 if not (a.free_symbols | b.free_symbols) else 3) else None


def tends(a: Expr, b: Expr, var: Symbol, ctx) -> bool | None:
    at = ctx.get("at")
    if at is None:
        return None
    target = oo if at == "oo" else -oo if at == "-oo" else at[0]
    side = "+-" if at in ("oo", "-oo") else (at[1] or "+-")
    if side == "+-" and at not in ("oo", "-oo"):
        side = "+"  # granica obustronna = prawostronna, gdy istnieje (krok sprawdza dalszą część)
    try:
        got = limit(value(a, var), var, target, dir=side if at not in ("oo", "-oo") else "-" if at == "oo" else "+")
    except Exception:  # noqa: BLE001
        return None
    b = value(b, var)
    if got in (oo, -oo) or b in (oo, -oo):
        return got == b
    try:
        return abs(complex((got - b).evalf())) < 1e-9
    except TypeError:
        return None


def context(prob) -> tuple[Symbol, dict]:
    first = prob["steps"][0]["lines"][0][0] if prob["steps"][0]["lines"][0] else ""
    ctx = {"title": prob["title"]}
    head = lim_head(strip_html_data(first).replace(r"\left", "").replace(r"\right", ""))
    if head:
        v, to, side, _ = head
        ctx["at"] = "oo" if to == r"\infty" else "-oo" if to == r"-\infty" else (float(to_expr(to, v, {}).evalf()), side.strip("+-") and side if side != "+-" else "")
        return v, ctx
    m = re.search(r"d([a-z])\b", first) or re.match(r"^f\\left\(([a-z])\\right\)", first)
    return Symbol(m.group(1) if m else "x"), ctx


# auto-test: bramka musi złapać fałsz i przepuścić prawdę (python check.py --self-test)
SELF_TEST = [
    {"q": "dobre", "title": "Pochodna", "steps": [{"label": "Funkcja", "math": "", "lines": [["f\\left(x\\right)", "=x^{3}"]]},
        {"label": "a", "math": "(x³)′ = 3x²", "lines": [["\\left(x^{3}\\right)^{\\prime}", "=3x^{2}"]]}]},
    {"q": "granica", "title": "Granica", "steps": [{"label": "b", "math": "lim sin x/x = 1",
        "lines": [["\\lim_{x\\to 0}\\frac{\\sin x}{x}", "=1"]]}]},
    {"q": "ZŁE pochodna", "title": "Pochodna", "steps": [{"label": "Funkcja", "math": "", "lines": [["f\\left(x\\right)", "=x^{3}"]]},
        {"label": "c", "math": "(x³)′ = 3x³", "lines": [["\\left(x^{3}\\right)^{\\prime}", "=3x^{3}"]]}]},
    {"q": "ZŁE granica", "title": "Granica", "steps": [{"label": "d", "math": "lim sin x/x = 2",
        "lines": [["\\lim_{x\\to 0}\\frac{\\sin x}{x}", "=2"]]}]},
    {"q": "ZŁE równanie", "title": "Równanie", "steps": [{"label": "e", "math": "Δ = 25 − 24 = 2",
        "lines": [["\\Delta", "=25-24", "=2"]]}]},
    {"q": "ZŁY krok układu", "title": "Układ równań", "steps": [{"label": "f", "math": "23 + 3y = 12", "lines": [["23+3y", "=12"]]},
        {"label": "g", "math": "x + y = 5", "lines": [["x+y", "=5"]]},
        {"label": "Odpowiedź", "math": "x = 3\ny = 2", "lines": [["x", "=3"], ["y", "=2"]]}]},
]


def main() -> int:
    if "--self-test" in sys.argv:
        global_bad = run(SELF_TEST)
        want = sorted(["ZŁE pochodna", "ZŁE granica", "ZŁE równanie", "ZŁY krok układu"])
        got = sorted({b.split(" | ")[0] for b in global_bad})
        print("auto-test:", "✅ łapie fałsz, przepuszcza prawdę" if got == want else f"❌ {got}")
        return 0 if got == want else 1
    data = json.loads((HERE / "steps.json").read_text())
    bad = run(data)
    if bad:
        print(f"\n❌ {len(bad)} kroków z fałszywą równością:")
        for b in dict.fromkeys(bad):
            print("  ✗", b)
        return 1
    print("✅ każde sprawdzone = jest prawdą")
    return 0


def answers(prob, var):
    """rozwiązania z kroku „Odpowiedź”: x = 3 / y = 2 → [{x: 3, y: 2}]; x₁ = 2 / x₂ = 3 → [{x: 2}, {x: 3}]; None, gdy to nie liczby"""
    last = prob["steps"][-1]
    if last["label"] != "Odpowiedź":
        return None
    pairs = []
    for line in last["lines"]:
        if len(line) != 2 or not line[1].startswith("="):
            return None
        name = re.sub(r"_\{\d\}$", "", strip_html_data(line[0]).strip())
        if not re.fullmatch(r"[a-z]", name):
            return None
        try:
            pairs.append((name, to_expr(line[1][1:], var, {})))
        except Skip:
            return None
        if pairs[-1][1].free_symbols:
            return None
    names = [n for n, _ in pairs]
    if len(set(names)) == len(names):
        return [{Symbol(n): v for n, v in pairs}]
    return [{Symbol(n): v} for n, v in pairs]  # kilka pierwiastków jednej niewiadomej


def satisfied(a: Expr, b: Expr, sols) -> bool:
    """równanie z krokiem jest spełnione przez któreś rozwiązanie (x − 3 = 0 dotyczy tylko x = 3)"""
    for sol in sols:
        try:
            if abs(complex((a - b).subs(sol).evalf())) < 1e-9:
                return True
        except TypeError:
            continue
    return False


def run(data) -> list:
    checked = skipped = 0
    bad, reasons = [], {}
    for prob in data:
        var, ctx = context(prob)
        PARAM_A[0] = prob["title"] == "Pochodna"
        numbers_only = prob["title"] in ("Równanie", "Równanie trygonometryczne", "Nierówność", "Układ równań")
        UNKNOWNS[0] = set()
        sols = answers(prob, var) if prob["title"] in ("Równanie", "Układ równań") else None
        if sols:
            UNKNOWNS[0] = {str(k) for sol in sols for k in sol}
        for si, st in enumerate(prob["steps"]):
            for line in st["lines"]:
                prev = None
                if any(p.startswith(r"\notin") for p in line) or (st["label"].startswith("Odrzucam") and any(p.startswith("<") for p in line)):
                    continue  # odrzucone rozwiązanie (∉ D albo „… < 0”) z definicji nie spełnia odpowiedzi
                for piece in line:
                    rel = next((r for r in REL if piece.startswith(r)), None)
                    body = piece[len(rel):] if rel else re.sub(r"^(\\quad |,\\ |:\\quad |\\quad\\text\{lub\}\\quad )", "", piece)
                    try:
                        cur = to_expr(body, var, {})
                        if numbers_only and cur.free_symbols and not sols:
                            raise Skip("niewiadoma w równaniu")
                    except Skip as why:
                        reasons[str(why)] = reasons.get(str(why), 0) + 1
                        if "-v" in sys.argv and str(why).startswith(("parser", "niejedno")):
                            print("   ?", str(why)[:20], body[:90])
                        prev = None
                        skipped += 1
                        continue
                    if rel == "=" and prev is not None and sols and (prev.free_symbols or cur.free_symbols):
                        checked += 1  # równanie w krokach: odpowiedź musi je spełniać (przekształcenia równoważne)
                        if not satisfied(prev, cur, sols):
                            bad.append(f'{prob["q"]} | krok {si + 1} „{st["label"]}” | {st["math"]}  (odpowiedź nie spełnia)')
                        prev = None if body.rstrip().endswith((",", "{:}")) else cur
                        continue
                    if rel == "=" and prev == var and not ctx.get("at"):
                        prev = None  # „x = −1:” to wstawienie liczby, nie tożsamość
                    at = ctx.get("at")
                    if rel == "=" and prev == var and isinstance(at, tuple) and not cur.free_symbols and abs(float(cur.evalf()) - at[0]) < 1e-12:
                        prev = None  # „x = 0” przy x → 0: mianownik po wstawieniu punktu, nie tożsamość
                    if rel and prev is not None and rel in ("=", r"\approx ", r"\to "):
                        if rel == r"\to ":
                            ok = tends(prev, cur, var, ctx)
                        elif rel == "=":
                            ok = same(prev, cur, var, ctx)
                        else:
                            try:
                                ok = abs(complex(value(prev, var).evalf()) - complex(value(cur, var).evalf())) < 1e-4 * (1 + abs(complex(cur.evalf())))
                            except TypeError:
                                ok = None
                        if ok is None:
                            reasons["nie do sprawdzenia"] = reasons.get("nie do sprawdzenia", 0) + 1
                        else:
                            checked += 1
                            if not ok:
                                bad.append(f'{prob["q"]} | krok {si + 1} „{st["label"]}” | {st["math"]}')
                    if body.rstrip().endswith((",", "{:}")):
                        cur = None  # przecinek kończy łańcuch: dalej nowa równość
                    prev = cur
    print(f"sprawdzone równości: {checked}, pominięte kawałki: {skipped}")
    for k, v in sorted(reasons.items(), key=lambda x: -x[1])[:12]:
        print(f"   pominięte: {v:4d} × {k}")
    return bad


if __name__ == "__main__":
    sys.exit(main())
