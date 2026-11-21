# Wariant pod WebGPU: wszystkie duże wagi (MatMul, Gather, Conv) jako int8 + DequantizeLinear,
# liczenie w fp32 (bez MatMulInteger/DynamicQuantizeLinear, których WebGPU nie ma).
# Użycie: python -I wq.py <fns_fp32.onnx> <wyj.onnx>
import sys, numpy as np, onnx
from onnx import numpy_helper, helper
src, dst = sys.argv[1:3]
m = onnx.load(src)
inits = {i.name: i for i in m.graph.initializer}
axis = {}
def walk(g):
    for n in g.node:
        if n.op_type == "MatMul" and n.input[1] in inits: axis[n.input[1]] = 1
        if n.op_type == "Gather" and n.input[0] in inits: axis[n.input[0]] = 0
        if n.op_type == "Conv" and n.input[1] in inits: axis[n.input[1]] = 0
        for a in n.attribute:
            if a.g.node: walk(a.g)
walk(m.graph)
new_nodes = []
for name, ax in axis.items():
    W = numpy_helper.to_array(inits[name]).astype(np.float32)
    if W.size < 4096: continue
    red = tuple(i for i in range(W.ndim) if i != ax)
    s = np.abs(W).max(axis=red) / 127.0; s[s == 0] = 1e-8
    shp = [1] * W.ndim; shp[ax] = -1
    q = np.clip(np.round(W / s.reshape(shp)), -127, 127).astype(np.int8)
    m.graph.initializer.remove(inits[name])
    m.graph.initializer.extend([numpy_helper.from_array(q, name + "_q"), numpy_helper.from_array(s.astype(np.float32), name + "_s"),
                                numpy_helper.from_array(np.zeros(W.shape[ax], np.int8), name + "_z")])
    new_nodes.append(helper.make_node("DequantizeLinear", [name + "_q", name + "_s", name + "_z"], [name], axis=ax))
for n in reversed(new_nodes): m.graph.node.insert(0, n)
onnx.save(m, dst)
print("wag int8:", len(new_nodes))
