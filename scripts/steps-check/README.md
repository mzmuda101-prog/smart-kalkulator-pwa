# Bramka „każde = jest prawdą” (SymPy)

Narzędzie deweloperskie, nie część aplikacji. Sprawdza, czy każda równość w krokach rozwiązań jest prawdziwa,
a nie tylko wynik końcowy. Niezależne od silnika apki: czyta LaTeX, który rysuje ekran (`stepToLatex`), parserem SymPy.

## Pierwsze uruchomienie (raz)

    python3 -m venv scripts/steps-check/.venv
    scripts/steps-check/.venv/bin/pip install "sympy==1.14.0" "mpmath==1.3.0" lark

## Użycie

    npm run check:steps        # ok. 1–2 min; kod wyjścia 1 = jest fałszywa równość

Po każdej zmianie w krokach (`js/math-limits.js`, `js/math-calculus.js`, `js/math-steps.js`) przed wydaniem.
`check.py -v` pokazuje kawałki, których parser nie przeczytał (do zwiększania pokrycia).

## Co sprawdza

- `dump.js`: wszystkie przykłady (zestaw granic, ściąga, lista `EXTRA`) → `steps.json`. Nowe zadanie z krokami dopisz do `EXTRA`.
- `check.py`: „=” to tożsamość (granice — w punktach blisko celu, całka nieoznaczona — przez pochodną),
  „→” liczy SymPy `limit`, „≈” liczbowo. W równaniach i układach każde równanie po drodze musi spełniać odpowiedź z kroku „Odpowiedź”; w nierównościach tylko rachunki na liczbach.
  Kawałki z literami pomocniczymi (u, A, aₙ, F, Δ) i słowami są pomijane — raport podaje ile.
- Auto-test (`--self-test`): bramka musi złapać cztery celowo fałszywe kroki (w tym zły krok układu) i przepuścić prawdziwe.

Bezpieczeństwo: `parse_latex(backend='lark')` to gramatyka, bez wykonywania kodu (bez `parse_expr`/`sympify` na tekście).

Hasła podręcznika (`js/step-formulas.js`): `dump.js` dokłada kroki każdego przykładu „Spróbuj” i każdą równość `$… = …$` z tekstów haseł; czego SymPy nie umie sprawdzić, wpisz do `SKIP_PROSE` z powodem.
