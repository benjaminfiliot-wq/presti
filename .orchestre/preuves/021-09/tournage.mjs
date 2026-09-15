// .orchestre/preuves/021-09/tournage.mjs
// Enregistre deux films de la démo lestraque (natif vs lenis), recalés par flashs blancs,
// monte côte à côte et génère la planche et mesures.json.

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PREUVES = path.join(RACINE, '.orchestre', 'preuves', '021-09');
const TRAVAIL = path.join(RACINE, '.orchestre', 'travail', '021-09');
const SITE = path.join(TRAVAIL, 'site');

// 1. S'assurer que le site de travail existe
if (!fs.existsSync(SITE)) {
  fs.cpSync(path.join(RACINE, 'public', 'sites-demo', 'lestraque'), SITE, { recursive: true });
}

// 2. Serveur HTTP local
const types = {
  html: 'text/html; charset=utf-8',
  css: 'text/css',
  js: 'text/javascript',
  mjs: 'text/javascript',
  json: 'application/json',
  webp: 'image/webp',
  avif: 'image/avif',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  woff2: 'font/woff2'
};

const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(SITE, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { 'content-type': types[path.extname(f).slice(1)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

await new Promise((r) => srv.listen(0, r));
const url = `http://127.0.0.1:${srv.address().port}/index.html`;
console.log('Serveur démo local démarré sur', url);

// 3. Détection des repères blancs
function reperesBlancs(f) {
  const brut = spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-vf', 'crop=iw-40:ih:0:0,fps=50,scale=32:20,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 }).stdout;
  const t = 32 * 20, n = Math.floor(brut.length / t), debuts = [];
  let avant = false;
  for (let i = 0; i < n; i++) {
    let blanc = true;
    for (let k = 0; k < t && blanc; k++) if (brut[i * t + k] < 245) blanc = false;
    if (blanc && !avant) debuts.push(i / 50);
    avant = blanc;
  }
  return debuts;
}

// 4. Flash blanc
async function flash(page, temps) {
  const t = temps();
  await page.evaluate(() => {
    const o = document.createElement('div');
    o.id = '__repere';
    o.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#fff';
    document.documentElement.appendChild(o);
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('__repere')?.remove());
  await page.waitForTimeout(250);
  return t;
}

// 5. Programme de molette (au moins 5 événements, dy positif pour descendre, t croissant)
const PROGRAMME = [
  { t: 1.0, dy: 350 },
  { t: 2.5, dy: 450 },
  { t: 4.0, dy: 500 },
  { t: 5.5, dy: 500 },
  { t: 7.0, dy: 450 },
  { t: 8.5, dy: 350 }
];

// 6. Tournage d'une version
async function filmer(mode) {
  console.log(`\n--- Tournage : ${mode} ---`);
  const dossierEnreg = fs.mkdtempSync(path.join(os.tmpdir(), `lestraque-${mode}-`));
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    recordVideo: { dir: dossierEnreg, size: { width: 1440, height: 900 } }
  });

  // Injection instrumentation rAF et scroll
  await ctx.addInitScript(() => {
    window.__rafIntervals = [];
    window.__scrollEvents = [];
    let lastRaf = performance.now();
    let lastScrollY = window.scrollY;

    function verifierScroll() {
      if (window.scrollY !== lastScrollY) {
        lastScrollY = window.scrollY;
        window.__scrollEvents.push({ t: performance.now(), y: lastScrollY });
      }
    }

    window.addEventListener('scroll', verifierScroll);

    function boucle(t) {
      const dt = t - lastRaf;
      lastRaf = t;
      window.__rafIntervals.push(dt);
      verifierScroll();
      requestAnimationFrame(boucle);
    }
    requestAnimationFrame(boucle);
  });

  // Injection Lenis si mode === 'lenis'
  if (mode === 'lenis') {
    const lenisJs = fs.readFileSync(path.join(PREUVES, 'lenis.min.js'), 'utf8');
    await ctx.addInitScript({ content: lenisJs });
    await ctx.addInitScript(() => {
      function startLenis() {
        if (window.__lenis) return;
        const lenis = new window.Lenis({
          lerp: 0.1,
          smoothWheel: true,
          syncTouch: false
        });
        window.__lenis = lenis;
        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      }
      if (document.readyState !== 'loading') startLenis();
      else document.addEventListener('DOMContentLoaded', startLenis);
    });
  }

  const page = await ctx.newPage();
  const t0 = Date.now();
  const temps = () => (Date.now() - t0) / 1000;

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Attendre stabilisation initiale
  await page.waitForTimeout(800);
  await page.mouse.move(720, 450);

  // Repère A
  const repereA = await flash(page, temps);
  console.log(`Repère A à ${repereA.toFixed(3)} s`);

  // Attendre un court instant après le premier flash avant de commencer les 12 s du film
  await page.waitForTimeout(450);
  const tFilmDebut = temps();
  console.log(`Début du film 12s à ${tFilmDebut.toFixed(3)} s (script)`);

  // Exécution du programme de molette
  for (const step of PROGRAMME) {
    const cible = tFilmDebut + step.t;
    const attente = (cible - temps()) * 1000;
    if (attente > 0) await page.waitForTimeout(attente);
    await page.mouse.wheel(0, step.dy);
  }

  // Noter le moment où la dernière molette a été injectée
  const tDerniereMolette = await page.evaluate(() => performance.now());

  // Attendre la fin des 12 secondes
  const tFilmFin = tFilmDebut + 12.0;
  const attenteFin = (tFilmFin - temps()) * 1000;
  if (attenteFin > 0) await page.waitForTimeout(attenteFin);

  // Mesures dans la page
  const mesuresPage = await page.evaluate((tLastWheel) => {
    const scrolls = window.__scrollEvents;
    // Dernier scroll event après ou au moment du dernier wheel
    const scrollsApres = scrolls.filter((s) => s.t >= tLastWheel - 20);
    const dernierScroll = scrollsApres.length > 0 ? scrollsApres[scrollsApres.length - 1].t : tLastWheel;
    const arretMs = Math.max(0, Math.round(dernierScroll - tLastWheel));

    const inters = window.__rafIntervals.slice(20);
    inters.sort((a, b) => a - b);
    const p95 = inters[Math.floor(inters.length * 0.95)] || 16.6;

    return {
      arretMs,
      rafP95Ms: Number(p95.toFixed(2)),
      finalScrollY: window.scrollY,
      totalScrollEvents: scrolls.length
    };
  }, tDerniereMolette);

  // Repère B
  const repereB = await flash(page, temps);
  console.log(`Repère B à ${repereB.toFixed(3)} s`);
  await page.waitForTimeout(500);

  const video = page.video();
  await ctx.close();
  await browser.close();

  const webmPath = await video.path();
  console.log(`Vidéo brute enregistrée : ${webmPath}`);

  // Recalage avec les repères blancs
  const vus = reperesBlancs(webmPath);
  console.log(`Repères blancs vus dans la vidéo :`, vus);
  if (vus.length < 2) {
    throw new Error(`${mode} : ${vus.length} repère(s) blanc(s) vus au lieu d'au moins 2`);
  }

  const vA = vus[0];
  const vB = vus[vus.length - 1];
  const ecartA = vA - repereA;
  const ecartB = vB - repereB;
  const versVideo = (w) => w + ecartA + ((ecartB - ecartA) * (w - repereA)) / (repereB - repereA);

  const videoDebut = versVideo(tFilmDebut);
  console.log(`Heure de début recalée dans la vidéo : ${videoDebut.toFixed(3)} s`);

  const sortieMp4 = path.join(PREUVES, `${mode}.mp4`);
  // Découpe exacte de 12 s à 30 ips H.264
  const resFfmpeg = spawnSync('ffmpeg', [
    '-y',
    '-ss', videoDebut.toFixed(3),
    '-i', webmPath,
    '-t', '12.0',
    '-vf', 'fps=30,scale=1440:900',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', '30',
    sortieMp4
  ], { encoding: 'utf8' });

  if (resFfmpeg.status !== 0) {
    throw new Error(`ffmpeg ${mode} échoué : ${resFfmpeg.stderr}`);
  }
  console.log(`${mode}.mp4 créé avec succès (${fs.statSync(sortieMp4).size} octets)`);

  return mesuresPage;
}

// 7. Tourner natif puis lenis
const statsNatif = await filmer('natif');
const statsLenis = await filmer('lenis');

srv.close();

// 8. Montage côte à côte
console.log('\n--- Montage côte à côte ---');
const coteACoteMp4 = path.join(PREUVES, 'cote-a-cote.mp4');
const resHstack = spawnSync('ffmpeg', [
  '-y',
  '-i', path.join(PREUVES, 'natif.mp4'),
  '-i', path.join(PREUVES, 'lenis.mp4'),
  '-filter_complex', '[0:v][1:v]hstack',
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-r', '30',
  coteACoteMp4
], { encoding: 'utf8' });

if (resHstack.status !== 0) {
  throw new Error(`ffmpeg hstack échoué : ${resHstack.stderr}`);
}
console.log(`cote-a-cote.mp4 créé avec succès (${fs.statSync(coteACoteMp4).size} octets)`);

// 9. Planche comparative 4 instants : natif au-dessus de lenis
console.log('\n--- Génération de la planche ---');
const plancheJpg = path.join(PREUVES, 'planche.jpg');
const instants = [2.0, 5.0, 8.0, 11.0];
const clipsNatif = [], clipsLenis = [];

for (let i = 0; i < instants.length; i++) {
  const t = instants[i];
  const fn = path.join(TRAVAIL, `planche_n_${i}.jpg`);
  const fl = path.join(TRAVAIL, `planche_l_${i}.jpg`);
  spawnSync('ffmpeg', ['-y', '-ss', String(t), '-i', path.join(PREUVES, 'natif.mp4'), '-frames:v', '1', '-vf', 'scale=720:450', fn]);
  spawnSync('ffmpeg', ['-y', '-ss', String(t), '-i', path.join(PREUVES, 'lenis.mp4'), '-frames:v', '1', '-vf', 'scale=720:450', fl]);
  clipsNatif.push(fn);
  clipsLenis.push(fl);
}

const resPlanche = spawnSync('ffmpeg', [
  '-y',
  '-i', clipsNatif[0], '-i', clipsNatif[1], '-i', clipsNatif[2], '-i', clipsNatif[3],
  '-i', clipsLenis[0], '-i', clipsLenis[1], '-i', clipsLenis[2], '-i', clipsLenis[3],
  '-filter_complex', '[0][1][2][3]hstack=inputs=4[top];[4][5][6][7]hstack=inputs=4[bot];[top][bot]vstack[out]',
  '-map', '[out]',
  '-q:v', '2',
  plancheJpg
], { encoding: 'utf8' });

if (resPlanche.status !== 0) {
  throw new Error(`ffmpeg planche échoué : ${resPlanche.stderr}`);
}
console.log(`planche.jpg créée avec succès (${fs.statSync(plancheJpg).size} octets)`);

// 10. mesures.json
const mesures = {
  version: '1.3.26',
  reglages: {
    lerp: 0.1,
    smoothWheel: true,
    syncTouch: false
  },
  programme: PROGRAMME,
  natif: {
    programme: PROGRAMME,
    arretMs: statsNatif.arretMs,
    rafP95Ms: statsNatif.rafP95Ms
  },
  lenis: {
    programme: PROGRAMME,
    arretMs: statsLenis.arretMs,
    rafP95Ms: statsLenis.rafP95Ms
  }
};

fs.writeFileSync(path.join(PREUVES, 'mesures.json'), JSON.stringify(mesures, null, 2) + '\n');
console.log('mesures.json écrit :');
console.log(JSON.stringify(mesures, null, 2));

console.log('\n✓ Tournage et montage terminés avec succès.');
