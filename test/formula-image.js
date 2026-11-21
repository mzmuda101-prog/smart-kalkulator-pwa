// Obróbka zdjęcia wzoru i dekodowanie tokenów (js/formula-image.js).
// Uruchom: node test/formula-image.js
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const root = path.join(__dirname, '..');
const { blurScore, BLUR_MIN, trimEdgeBlobs, toTensor, decodeTokens } = require(path.join(root, 'js', 'formula-image.js'));
const vocab = require(path.join(root, 'models', 'formulanet-s', 'vocab.json'));

let pass = 0, fail = 0;
function ok(name, cond, got) {
    if (cond) { pass++; return; }
    fail++;
    console.log('  ✗', name, got === undefined ? '' : '→ ' + JSON.stringify(got));
}
function blank(w, h, v = 255) { return { data: new Uint8ClampedArray(w * h * 4).fill(v), width: w, height: h }; }
function rect(img, x0, y0, rw, rh, v = 0) {
    for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) {
        const i = (y * img.width + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
}
const px = (img, x, y) => img.data[(y * img.width + x) * 4];

// trimEdgeBlobs
{
    const im = blank(100, 40); rect(im, 20, 0, 10, 5); rect(im, 60, 15, 10, 10);
    const r = trimEdgeBlobs(im);
    ok('trim: górna plama wybielona', px(r, 25, 2) === 255, px(r, 25, 2));
    ok('trim: środkowa zostaje', px(r, 65, 20) === 0, px(r, 65, 20));
    ok('trim: wejście bez zmian', px(im, 25, 2) === 0);
}

// toTensor
{
    const im = blank(768, 192); rect(im, 100, 50, 300, 90);
    const t = toTensor(im);
    ok('tensor: długość', t.length === 147456, t.length);
    ok('tensor: róg = czarne pole', Math.abs(t[0] - (0 - 0.7931) / 0.1738) < 1e-5, t[0]);
    const im2 = blank(60, 60); rect(im2, 10, 10, 40, 40);
    rect(im2, 25, 25, 2, 2, 255);
    const t2 = toTensor(im2);
    ok('tensor: jasny piksel', t2.some(v => Math.abs(v - (1 - 0.7931) / 0.1738) < 1e-3));
}

// kolor: wagi szarości jak w run.py (R*0.114 + G*0.587 + B*0.299 po normalizacji)
{
    const im = blank(60, 60); rect(im, 10, 10, 40, 40);
    for (let y = 20; y < 40; y++) for (let x = 20; x < 40; x++) { const i = (y * 60 + x) * 4; im.data[i] = 200; im.data[i + 1] = 200; im.data[i + 2] = 40; }
    const want = ((0.114 * 200 + 0.587 * 200 + 0.299 * 40) / 255 - 0.7931) / 0.1738;
    const t = toTensor(im);
    ok('tensor: kolor wg wag run.py', t.some(v => Math.abs(v - want) < 0.03), want);
}

// decodeTokens
{
    const s = decodeTokens([0, 0, 82, 2646, 2, 99], vocab);
    ok('decode: zaczyna od \\operatorname', s.startsWith('\\operatorname'), s);
    ok('decode: ucina przed eos (bez „m”)', s === '\\operatorname', s);
    ok('decode: BigInt64Array', decodeTokens(BigInt64Array.from([0n, 0n, 82n, 2646n, 2n, 99n]), vocab) === s);
    ok('decode: Ġ → spacja', decodeTokens([243], vocab) === ' ', decodeTokens([243], vocab));
}

// parytet z Pythonem (lokalne fixtury poza gitem)
{
    const dir = path.join(__dirname, 'fixtures-local', 'tensors');
    if (!fs.existsSync(dir)) console.log('  (pomijam parytet z Pythonem: brak test/fixtures-local/tensors — scripts/formula-onnx/dump-tensors.py)');
    else for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.rgba')).sort()) {
        const id = f.slice(0, -5), meta = JSON.parse(fs.readFileSync(path.join(dir, id + '.json'), 'utf8'));
        const rgba = fs.readFileSync(path.join(dir, f));
        const ref = new Float32Array(fs.readFileSync(path.join(dir, id + '.bin')).buffer.slice(0));
        const t = toTensor({ data: new Uint8ClampedArray(rgba), width: meta.width, height: meta.height });
        let sum = 0; for (let i = 0; i < ref.length; i++) sum += Math.abs(t[i] - ref[i]);
        const mean = sum / ref.length;
        console.log('  parytet', id, 'średnia |Δ| =', mean.toFixed(5));
        ok('parytet ' + id, mean < 0.02, mean);
    }
}
// blurScore: frac.png ostry vs rozmyty Gaussem sigma=3 (PNG dekodowany tu, bez bibliotek)
{
function png(buf){let p=8,idat=[],w,h;while(p<buf.length){const l=buf.readUInt32BE(p),t=buf.toString('ascii',p+4,p+8);if(t==='IHDR'){w=buf.readUInt32BE(p+8);h=buf.readUInt32BE(p+12);}if(t==='IDAT')idat.push(buf.slice(p+8,p+8+l));p+=12+l;}
const raw=zlib.inflateSync(Buffer.concat(idat)),bp=4,st=w*bp,out=Buffer.alloc(h*st);
for(let y=0;y<h;y++){const f=raw[y*(st+1)];for(let x=0;x<st;x++){const v=raw[y*(st+1)+1+x],a=x>=bp?out[y*st+x-bp]:0,b=y?out[(y-1)*st+x]:0,c=x>=bp&&y?out[(y-1)*st+x-bp]:0;let r=f===0?v:f===1?v+a:f===2?v+b:f===3?v+((a+b)>>1):v+(()=>{const pp=a+b-c,pa=Math.abs(pp-a),pb=Math.abs(pp-b),pc=Math.abs(pp-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c})();out[y*st+x]=r&255;}}
return{data:new Uint8ClampedArray(out),width:w,height:h};}
function blur(im,s){const r=Math.ceil(3*s),k=[];let t=0;for(let i=-r;i<=r;i++){const v=Math.exp(-i*i/(2*s*s));k.push(v);t+=v;}
const {width:w,height:h}=im;let src=Float64Array.from(im.data),tmp=new Float64Array(src.length);
for(const dir of [0,1]){for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<4;c++){let a=0;for(let i=-r;i<=r;i++){const xx=dir?x:Math.min(w-1,Math.max(0,x+i)),yy=dir?Math.min(h-1,Math.max(0,y+i)):y;a+=k[i+r]*src[(yy*w+xx)*4+c];}tmp[(y*w+x)*4+c]=a/t;}[src,tmp]=[tmp,src];}
return{data:new Uint8ClampedArray(src),width:w,height:h};}
    const im = png(fs.readFileSync(path.join(root, 'test', 'fixtures', 'formulas', 'frac.png')));
    const sharp = blurScore(im), soft = blurScore(blur(im, 3));
    ok('blur: ostry powyżej progu', sharp > BLUR_MIN, sharp);
    ok('blur: sigma=3 poniżej progu', soft < BLUR_MIN, soft);
    ok('blur: duży odstęp', sharp > 10 * soft, [sharp, soft]);
}

console.log(fail ? `❌ formula-image: ${fail} błędów (${pass} OK)` : `✅ formula-image: ${pass} OK`);
process.exit(fail ? 1 : 0);
