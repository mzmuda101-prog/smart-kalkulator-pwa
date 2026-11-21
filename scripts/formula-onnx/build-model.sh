#!/bin/sh
# Buduje model odczytu wzorów dla przeglądarki. Użycie: build-model.sh <katalog_wyjścia>
# (np. models/formulanet-s). Pliki pośrednie idą do katalogu tymczasowego, nie do repo.
set -e
mkdir -p "$1"
OUT=$(cd "$1" && pwd)
HERE=$(cd "$(dirname "$0")" && pwd)
PY=${PY:-$HOME/.venvs/paddle-onnx/bin/python}
SRC=${SRC:-$HOME/.paddlex/official_models/PP-FormulaNet-S}
W=$(mktemp -d)
cd "$W"
"$(dirname "$PY")/paddle2onnx" --model_dir "$SRC" --model_filename inference.json \
  --params_filename inference.pdiparams --save_file fn.onnx --opset_version 17
"$PY" -I "$HERE/shrink.py" fn.onnx fns
"$PY" -I "$HERE/convq.py" fns_int8.onnx fns_int8c.onnx
"$PY" -I "$HERE/fixshapes.py" fns_int8c.onnx model.onnx
"$PY" -I "$HERE/pack.py" model.onnx "$OUT" "$SRC/inference.yml"
ls -l model.onnx
rm -rf "$W"
