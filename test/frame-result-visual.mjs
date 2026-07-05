#!/usr/bin/env node
/**
 * [EN] Visual capture: digit-by-digit typing in Standard mode → GIF + MP4 (no PNG clutter left behind).
 *
 * ── HOW TO RUN (from repo root: Programistyka/) ─────────────────────────────
 *
 * 1. Dev server (pick one):
 *      npm run dev:pwa   → http://127.0.0.1:7811/smart-kalkulator-pwa/
 *      npm run dev:web   → http://127.0.0.1:7812/smart-kalkulator-pwa/
 *
 * 2. Playwright Chromium (once):  npx playwright install chromium
 * 3. ffmpeg on PATH:              brew install ffmpeg
 * 4. Run:
 *      node smart-kalkulator-pwa/test/frame-result-visual.mjs
 *
 * ── OUTPUT (tylko te pliki zostają na dysku) ────────────────────────────────
 *   test/output/result-typing-visual/result-typing.gif
 *   test/output/result-typing-visual/result-typing.mp4
 *   test/output/result-typing-visual/summary.json
 *
 * Klatki PNG są w katalogu tymczasowym i usuwane po zbudowaniu GIF/MP4.
 *
 * ── FLICKER / „trzęsiawica” w GIF-ie ───────────────────────────────────────
 *   • captureMode: 'stable' (default) — czeka aż font i layout się uspokoją.
 *   • captureMode: 'transition' — klatki mid-animation (debug font-size).
 *   • fps: 8–12 jest OK. Bardzo wysokie fps przy małej liczbie klatek = stroboskop.
 *
 * Env: CALC_URL, DIGITS, CAPTURE_MODE, FRAMES_PER_STEP, HOLD_LAST, FPS,
 *      DEVICE_SCALE_FACTOR, MP4_CRF, SETTLE_TIMEOUT_MS, SETTLE_FRAMES
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, readdir, copyFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  url: 'http://127.0.0.1:7811/smart-kalkulator-pwa/',
  digits: '1' + '0'.repeat(19),
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  captureMode: 'stable', // 'stable' | 'transition'
  framesPerStep: 5,
  holdLast: 4,
  fps: 10,
  settleTimeoutMs: 220,
  settleFrames: 3,
  mp4Crf: 20,
  outDir: join(__dirname, 'output', 'result-typing-visual'),
};

const ENV_KEYS = {
  url: 'CALC_URL',
  digits: 'DIGITS',
  captureMode: 'CAPTURE_MODE',
  framesPerStep: 'FRAMES_PER_STEP',
  holdLast: 'HOLD_LAST',
  fps: 'FPS',
  deviceScaleFactor: 'DEVICE_SCALE_FACTOR',
  mp4Crf: 'MP4_CRF',
  settleTimeoutMs: 'SETTLE_TIMEOUT_MS',
  settleFrames: 'SETTLE_FRAMES',
};

function cfg(key) {
  const ek = ENV_KEYS[key];
  if (ek && process.env[ek] !== undefined && process.env[ek] !== '') return process.env[ek];
  return CONFIG[key];
}

const URL = cfg('url');
const DIGITS = cfg('digits');
const CAPTURE_MODE = String(cfg('captureMode'));
const FRAMES_PER_STEP = Number(cfg('framesPerStep'));
const HOLD_LAST = Number(cfg('holdLast'));
const OUTPUT_FPS = Number(cfg('fps'));
const DEVICE_SCALE = Number(cfg('deviceScaleFactor'));
const MP4_CRF = Number(cfg('mp4Crf'));
const SETTLE_TIMEOUT_MS = Number(cfg('settleTimeoutMs'));
const SETTLE_FRAMES = Number(cfg('settleFrames'));
const VIEWPORT = CONFIG.viewport;
const OUT_DIR = CONFIG.outDir;

const FRAMES_PER_DIGIT = CAPTURE_MODE === 'transition' ? FRAMES_PER_STEP + HOLD_LAST : 1 + HOLD_LAST;
const EXPECTED_FRAMES = 1 + DIGITS.length * FRAMES_PER_DIGIT;

let frameIdx = 0;
let lastShotPath = null;
let tmpFramesDir = null;

async function shot(page, label) {
  const name = `frame_${String(frameIdx).padStart(4, '0')}.png`;
  const path = join(tmpFramesDir, name);
  await page.locator('#panel-calculator .calc-display').screenshot({ path });
  frameIdx++;
  lastShotPath = path;
  return { name, path, label };
}

async function duplicateLastShot(label) {
  if (!lastShotPath) throw new Error('No previous shot to duplicate');
  const name = `frame_${String(frameIdx).padStart(4, '0')}.png`;
  const path = join(tmpFramesDir, name);
  await copyFile(lastShotPath, path);
  frameIdx++;
  return { name, path, label };
}

async function pressDigit(page, digit) {
  await page.locator(`.calc-btn[data-action="${digit}"]`).dispatchEvent('pointerdown', { button: 0, bubbles: true });
}

async function readSample(page) {
  return page.evaluate(() => {
    const el = document.getElementById('calcResult');
    const expr = document.getElementById('calcExpr');
    const cs = el ? getComputedStyle(el) : null;
    return {
      expr: expr?.value ?? '',
      text: el?.textContent ?? '',
      font: cs?.fontSize ?? '',
      inline: el?.style.fontSize || null,
      h: el?.clientHeight ?? 0,
    };
  });
}

async function waitResultStable(page) {
  await page.evaluate(
    ({ timeoutMs, stableFrames }) => new Promise((resolve) => {
      const el = document.getElementById('calcResult');
      let last = '';
      let stable = 0;
      const deadline = performance.now() + timeoutMs;
      function tick() {
        if (!el) { resolve(); return; }
        const cs = getComputedStyle(el);
        const key = [el.textContent, cs.fontSize, el.style.fontSize || '', el.clientHeight].join('|');
        stable = key === last ? stable + 1 : 0;
        last = key;
        if (stable >= stableFrames || performance.now() >= deadline) resolve();
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }),
    { timeoutMs: SETTLE_TIMEOUT_MS, stableFrames: SETTLE_FRAMES }
  );
}

async function sampleAndCapture(page, step, digit) {
  const frames = [];
  const tag = `s${String(step).padStart(2, '0')}_d${digit}`;

  if (CAPTURE_MODE === 'transition') {
    for (let f = 0; f < FRAMES_PER_STEP; f++) {
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      frames.push({ frame: f, ...(await readSample(page)) });
      await shot(page, `${tag}_raf${f}`);
    }
    for (let h = 0; h < HOLD_LAST; h++) {
      await duplicateLastShot(`${tag}_hold${h}`);
    }
  } else {
    await waitResultStable(page);
    frames.push({ frame: 0, ...(await readSample(page)) });
    await shot(page, `${tag}_stable`);
    for (let h = 0; h < HOLD_LAST; h++) {
      await duplicateLastShot(`${tag}_hold${h}`);
    }
  }

  return { step, digit, frames };
}

async function buildMedia() {
  const list = (await readdir(tmpFramesDir)).filter((f) => f.endsWith('.png')).sort();
  if (!list.length) throw new Error('No frames captured');
  await mkdir(OUT_DIR, { recursive: true });
  const gifPath = join(OUT_DIR, 'result-typing.gif');
  const mp4Path = join(OUT_DIR, 'result-typing.mp4');
  const seqPattern = join(tmpFramesDir, 'frame_%04d.png');
  const fps = OUTPUT_FPS;
  const vf = `fps=${fps},scale=${VIEWPORT.width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=full[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5`;
  await execFileAsync('ffmpeg', ['-y', '-framerate', String(fps), '-i', seqPattern, '-vf', vf, gifPath], { maxBuffer: 20 * 1024 * 1024 });
  await execFileAsync('ffmpeg', ['-y', '-framerate', String(fps), '-i', seqPattern, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', String(MP4_CRF), mp4Path], { maxBuffer: 20 * 1024 * 1024 });
  return { gifPath, mp4Path, frameCount: list.length, fps, durationSec: list.length / fps };
}

async function main() {
  tmpFramesDir = join(tmpdir(), `calc-result-capture-${process.pid}`);
  frameIdx = 0;
  lastShotPath = null;
  await rm(tmpFramesDir, { recursive: true, force: true });
  await mkdir(tmpFramesDir, { recursive: true });

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: DEVICE_SCALE });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#calcResult');
    await page.locator('[data-tab="calculator"]').click();
    await pressDigit(page, 'AC');
    await waitResultStable(page);
    await shot(page, 's00_clear');

    const report = [];
    for (let step = 0; step < DIGITS.length; step++) {
      await pressDigit(page, DIGITS[step]);
      report.push(await sampleAndCapture(page, step + 1, DIGITS[step]));
    }

    await browser.close();
    const media = await buildMedia();
    const summary = {
      url: URL,
      digits: DIGITS,
      config: {
        captureMode: CAPTURE_MODE,
        framesPerStep: FRAMES_PER_STEP,
        holdLast: HOLD_LAST,
        fps: OUTPUT_FPS,
        settleTimeoutMs: SETTLE_TIMEOUT_MS,
        settleFrames: SETTLE_FRAMES,
        expectedFrames: EXPECTED_FRAMES,
        viewport: VIEWPORT,
        deviceScaleFactor: DEVICE_SCALE,
      },
      totalFrames: media.frameCount,
      durationSec: Math.round(media.durationSec * 10) / 10,
      gif: media.gifPath,
      mp4: media.mp4Path,
      steps: report.map((r) => ({
        step: r.step,
        digit: r.digit,
        expr: r.frames[r.frames.length - 1]?.expr,
        result: r.frames[r.frames.length - 1]?.text,
        font: r.frames[r.frames.length - 1]?.font,
      })),
    };
    await writeFile(join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    if (tmpFramesDir) await rm(tmpFramesDir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
