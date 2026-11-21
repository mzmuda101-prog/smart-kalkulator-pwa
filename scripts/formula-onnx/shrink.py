# Odchudza ONNX z paddle2onnx: wpieka maskę 0/1 (const.0) w osadzenia, stałe → inicjalizatory,
# potem kwantyzacja int8 (dynamiczna). Użycie: python -I shrink.py <wej.onnx> <prefiks_wyjścia>
import sys, numpy as np, onnx
from onnx import numpy_helper, helper
from onnxruntime.quantization import quantize_dynamic, QuantType

src, out = sys.argv[1:3]
m = onnx.load(src)
loop = next(n for n in m.graph.node if n.op_type == "Loop")
body = next(a.g for a in loop.attribute if a.name == "body")

consts = {n.output[0]: n for n in m.graph.node if n.op_type == "Constant"}
E = numpy_helper.to_array(consts["embedding_3.w_0"].attribute[0].t)
qn = next(n for n in body.node if n.output[0] == "const.0")
mul = next(n for n in body.node if n.name == "Mul.2")
E = E * numpy_helper.to_array(qn.attribute[0].t)  # maska zeruje wiersz paddingu
consts["embedding_3.w_0"].attribute[0].t.CopyFrom(numpy_helper.from_array(E.astype(np.float32), "embedding_3.w_0"))
for n in body.node:  # Gather czyta wprost z osadzeń
    for i, x in enumerate(n.input):
        if x == mul.output[0]: n.input[i] = "embedding_3.w_0"
body.node.remove(qn); body.node.remove(mul)

# duże stałe głównego grafu → inicjalizatory (kwantyzator widzi tylko inicjalizatory)
for name, n in list(consts.items()):
    t = n.attribute[0].t
    if t.dims and np.prod(t.dims) >= 1024:
        arr = numpy_helper.to_array(t)
        m.graph.initializer.append(numpy_helper.from_array(arr, name))
        m.graph.node.remove(n)
onnx.save(m, out + "_fp32.onnx")
print("fp32 zapisany")
for wt, tag in ((QuantType.QInt8, "int8"),):
    quantize_dynamic(out + "_fp32.onnx", out + f"_{tag}.onnx", weight_type=wt,
                     op_types_to_quantize=["MatMul", "Gather"], extra_options={"MatMulConstBOnly": True, "EnableSubgraph": True}, per_channel=True)
    print(tag, "zapisany")
