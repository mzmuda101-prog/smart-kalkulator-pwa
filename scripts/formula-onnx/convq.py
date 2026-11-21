# Wagi Conv (i inne duże fp32 inicjalizatory przy Conv) → int8 per kanał + DequantizeLinear.
# Liczenie zostaje w fp32, maleje tylko plik. Użycie: python -I convq.py <wej.onnx> <wyj.onnx>
import sys, numpy as np, onnx
from onnx import numpy_helper, helper
src, dst = sys.argv[1:3]
m = onnx.load(src)
inits = {i.name: i for i in m.graph.initializer}
conv_w = {n.input[1] for n in m.graph.node if n.op_type == "Conv" and n.input[1] in inits}
saved = 0
for name in conv_w:
    W = numpy_helper.to_array(inits[name]).astype(np.float32)
    if W.size < 4096: continue
    s = np.abs(W.reshape(W.shape[0], -1)).max(1) / 127.0
    s[s == 0] = 1e-8
    q = np.clip(np.round(W / s.reshape(-1, *[1] * (W.ndim - 1))), -127, 127).astype(np.int8)
    m.graph.initializer.remove(inits[name])
    m.graph.initializer.extend([numpy_helper.from_array(q, name + "_q"),
                                numpy_helper.from_array(s.astype(np.float32), name + "_s"),
                                numpy_helper.from_array(np.zeros_like(q[:, 0, 0, 0]) if W.ndim == 4 else np.zeros(W.shape[0], np.int8), name + "_z")])
    m.graph.node.insert(0, helper.make_node("DequantizeLinear", [name + "_q", name + "_s", name + "_z"], [name], axis=0))
    saved += W.nbytes - q.nbytes
onnx.save(m, dst)
print("zaoszczędzono MB", round(saved / 1e6, 1))
