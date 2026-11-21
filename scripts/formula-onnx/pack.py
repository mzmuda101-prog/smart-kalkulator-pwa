# Dzieli model na kawałki .gz i zapisuje manifest.json + vocab.json.
# Użycie: python -I pack.py <model.onnx> <katalog_wyjścia> <inference.yml>
import sys, os, gzip, json, hashlib, yaml
src, out, yml = sys.argv[1:4]
PART = 10_000_000
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    if f.startswith("model.onnx.part"): os.remove(os.path.join(out, f))
data = open(src, "rb").read()
parts = []
for i in range(0, len(data), PART):
    chunk = data[i:i + PART]
    name = f"model.onnx.part{i // PART}.gz"
    gz = gzip.compress(chunk, 6, mtime=0)
    open(os.path.join(out, name), "wb").write(gz)
    parts.append({"file": name, "gzBytes": len(gz), "bytes": len(chunk), "sha256": hashlib.sha256(chunk).hexdigest()})
tok = yaml.safe_load(open(yml))["PostProcess"]["character_dict"]["fast_tokenizer_file"]
vocab = [None] * 50000
for t, i in tok["model"]["vocab"].items(): vocab[i] = t
for a in tok["added_tokens"]: vocab[a["id"]] = a["content"]
assert None not in vocab and vocab[2] == "</s>"
json.dump(vocab, open(os.path.join(out, "vocab.json"), "w"), ensure_ascii=False, separators=(",", ":"))
json.dump({"name": "formulanet-s", "version": 1, "bytes": len(data), "gzBytes": sum(p["gzBytes"] for p in parts),
           "parts": parts, "input": "x", "inputShape": [1, 1, 384, 384], "mean": 0.7931, "std": 0.1738,
           "eosId": 2, "firstTextId": 4}, open(os.path.join(out, "manifest.json"), "w"), indent=2)
print(len(parts), "kawałków", len(data), "B")
