# Usuwa zadeklarowane kształty wewnątrz podgrafów (Loop/If) — ORT-web sprawdza je ostro przy wczytaniu.
import sys, onnx
m = onnx.load(sys.argv[1])
def clean(g, sub):
    del g.value_info[:]
    if sub:
        for o in g.output:
            if o.type.HasField("tensor_type"): o.type.tensor_type.ClearField("shape")
    for n in g.node:
        for a in n.attribute:
            if a.g.node: clean(a.g, True)
            for sg in a.graphs: clean(sg, True)
clean(m.graph, False)
onnx.save(m, sys.argv[2]); print("ok")
# Zmienna pętli startuje jako skalar, a gałąź „then” w If.3 robi z niej [1] (stałe o kształcie [1]).
# ORT-web wymaga zgodności — stałe w tej gałęzi zamieniamy na skalary.
from onnx import numpy_helper
m = onnx.load(sys.argv[2])
loop = next(n for n in m.graph.node if n.op_type == "Loop")
body = next(a.g for a in loop.attribute if a.name == "body")
ifn = next(n for n in body.node if n.name == "If.3")
then = next(a.g for a in ifn.attribute if a.name == "then_branch")
for n in then.node:
    if n.op_type == "Constant":
        arr = numpy_helper.to_array(n.attribute[0].t)
        print("stała", n.output[0], arr.shape, arr.ravel()[:3])
        n.attribute[0].t.CopyFrom(numpy_helper.from_array(arr.reshape(()), n.attribute[0].t.name))
onnx.save(m, sys.argv[2]); print("ok 2")
# Range ze stałymi wejściami (0, 3, 1) → stała; WebGPU EP w ORT-web nie przydziela Range dostawcy.
import numpy as np
from onnx import helper
m = onnx.load(sys.argv[2])
prod = {o: n for n in m.graph.node for o in n.output}
def const_val(x):
    n = prod.get(x)
    while n is not None and n.op_type in ("Squeeze", "Identity", "Cast"): n = prod.get(n.input[0])
    return numpy_helper.to_array(n.attribute[0].t) if n is not None and n.op_type == "Constant" else None
for r in [n for n in m.graph.node if n.op_type == "Range"]:
    v = [const_val(x) for x in r.input]
    if any(a is None for a in v): continue
    arr = np.arange(v[0].item(), v[1].item(), v[2].item()).astype(v[0].dtype)
    i = list(m.graph.node).index(r)
    m.graph.node.remove(r)
    m.graph.node.insert(i, helper.make_node("Constant", [], [r.output[0]], value=numpy_helper.from_array(arr)))
    print("Range → stała", arr.tolist())
onnx.save(m, sys.argv[2])
