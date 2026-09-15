/* relief-fil.js — le fil de rendu du relief du héros (Web Worker, OffscreenCanvas). Tout le WebGL vit ici : ouvrir un contexte
   (99 à 221 ms mesurés sous ANGLE/D3D11), compiler le shader, décoder et redimensionner la photo, envoyer les textures, dessiner.
   Sur le fil principal, le relief ne pesait que par ces appels : des tâches longues de 250 à 350 ms au chargement (banc du 15/09).
   Ici, le fil de la page n'attend jamais.

   Le worker naît AVANT la décision (kit.js) : message « sonde », il ouvre un contexte d'1 px, refuse un renderer logiciel, le rend
   et répond. C'est lui qui paie le premier contexte du navigateur (370 à 410 ms à froid) ; la sonde du fil principal, qui seule
   sait si la page a droit à WebGL, passe ensuite à chaud. Accepté, kit.js le confie à relief.js, qui envoie « init ».

   Un seul shader, sur la photo que la page a déjà chargée (reprise du cache HTTP, cache: 'force-cache') :
   - la spirale se creuse : les zones lointaines (carte → 0, l'œil) se resserrent lentement vers l'œil, un peu plus quand le
     plateau noir monte ;
   - la lumière glisse sur les marches : une bande large tourne autour de l'œil (un tour par minute environ) et n'éclaire que
     ce qui est déjà clair ; elle ne réétalonne rien ;
   - le point de vue suit la souris de quelques pixels, amorti : le premier plan (limon, main courante) bouge, l'œil presque pas ;
     souris immobile depuis 2 s, il dérive seul et très lentement (un peu plus de la moitié de la course de la souris, périodes de
     23 et 31 s) : l'escalier vit sans qu'on y touche, et la main reprend la main dès qu'elle bouge.
   La lumière ne passe jamais sous le titre (uVoile : le haut du h1, transmis par relief.js) : elle éclaircissait le fond du h1 et
   baissait son contraste (6,55 → 6,16 en moyenne, juge du 15/09).
   Tous les effets valent 0 pendant le fondu d'apparition (700 ms), puis montent en 1,8 s : le passage photo → relief est invisible.
   Rendu logiciel (SwiftShader, llvmpipe…) : refusé par le nom du renderer, failIfMajorPerformanceCaveat ne suffit pas dans un
   worker (le headless shell de Chromium y accepte SwiftShader). */
const VS = 'attribute vec2 aPos;varying vec2 vUv;void main(){vUv=vec2(aPos.x*.5+.5,.5-aPos.y*.5);gl_Position=vec4(aPos,0.,1.);}'
const FS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uImage,uProf;
uniform vec2 uEchelle,uDecal,uCentre,uOeil,uPousse;
uniform float uAspect,uCreuse,uLumiere,uAngle,uMarge,uVoile;
void main(){
  vec2 uv=vUv*uEchelle+uDecal;
  uv=uCentre+(uv-uCentre)*(1.-uMarge);
  float p=texture2D(uProf,uv).r;
  uv=uOeil+(uv-uOeil)*(1.+uCreuse*(1.-p));
  uv+=uPousse*(p-.2);
  p=texture2D(uProf,uv).r;
  vec3 c=texture2D(uImage,uv).rgb;
  vec2 q=(uv-uOeil)*vec2(uAspect,1.);
  float r=length(q);
  float bande=pow(.5+.5*cos(atan(q.y,q.x)-uAngle),6.);
  float anneau=smoothstep(.05,.2,r)*(1.-smoothstep(.6,1.05,r));
  float l=dot(c,vec3(.2126,.7152,.0722));
  float titre=1.-smoothstep(uVoile-.12,uVoile,vUv.y);
  c+=c*uLumiere*bande*anneau*titre*smoothstep(.28,.85,l)*(.55+.45*p);
  gl_FragColor=vec4(c,1.);
}`

let gl = null, toile = null, u = {}, charge = false, pret = false, actif = false, perdu = false
let W = 1, H = 1, dpr = 1, dw = 1, dh = 1, aspect = 4 / 3, pos = [0.5, 0.5], oeil = [0.4, 0.39]
let boucle = false, dernier = 0, dessine = 0, temps = 0, debut = -1, defile = 0, images = 0, tours = 0
let voile = 0.5, geste = -1e9, derive = 0
const souris = { x: 0, y: 0 }, visee = { x: 0, y: 0 }
const LOGICIEL = /swiftshader|llvmpipe|softpipe|software|basic render/i
let chaud = null
const demander = self.requestAnimationFrame ? (f) => self.requestAnimationFrame(f) : (f) => setTimeout(() => f(performance.now()), 16)

function cadrer() {
  if (!gl) return
  if (toile.width !== W || toile.height !== H) { toile.width = W; toile.height = H }
  dw = Math.max(W, H * aspect); dh = dw / aspect
  if (!u.uEchelle) return
  gl.viewport(0, 0, W, H)
  const ex = W / dw, ey = H / dh, ox = -((W - dw) * pos[0]) / dw, oy = -((H - dh) * pos[1]) / dh
  gl.uniform2f(u.uEchelle, ex, ey); gl.uniform2f(u.uDecal, ox, oy)
  // le surbalayage se fait autour du centre du cadre visible : autour de l'œil, le bord droit n'avait que 10 px de marge pour
  // 11 px de poussée, et la photo s'étirait sur une bande verticale (capture du 15/09)
  gl.uniform2f(u.uCentre, ox + ex / 2, oy + ey / 2)
  gl.uniform1f(u.uVoile, voile)
}

// boucle : un booléen, pas le numéro rendu par requestAnimationFrame — dans un worker ce numéro peut valoir 0, et chaque message
// relançait alors une boucle de plus (55 images par seconde au repos au lieu de 30, banc du 15/09)
function image() {
  boucle = false
  if (!actif || !charge || perdu) return
  // l'horloge du fil, pas l'horodatage passé au rappel : avec lui, le rythme de 30 images au repos ne jouait pas (60/s mesurés)
  const now = performance.now()
  tours++
  const dt = dernier ? Math.min(0.1, (now - dernier) / 1000) : 1 / 60
  dernier = now
  const k = 1 - Math.exp(-dt * 2.4)
  souris.x += (visee.x - souris.x) * k; souris.y += (visee.y - souris.y) * k
  temps += dt
  // la dérive monte en 2,5 s environ quand la souris se tait depuis 2 s, et retombe en moins d'une seconde dès qu'elle bouge
  const calme = now - geste > 2000
  derive += ((calme ? 1 : 0) - derive) * (1 - Math.exp(-dt * (calme ? 0.8 : 3)))
  const bouge = Math.abs(visee.x - souris.x) + Math.abs(visee.y - souris.y) > 0.002
  // souris au repos : 30 images par seconde suffisent à une lumière qui fait un tour par minute et à une dérive de 2 px/s
  if (pret && !bouge && now - dessine < 30) { boucle = true; demander(image); return }
  dessine = now
  if (pret && debut < 0) debut = temps
  const m = debut < 0 ? 0 : Math.min(1, Math.max(0, (temps - debut - 0.7) / 1.8))
  const intro = m * m * (3 - 2 * m)
  // point de vue = souris amortie + dérive, borné à la course de la souris (14 × 9 px) : la marge de surbalayage suffit toujours
  const vx = Math.max(-1, Math.min(1, souris.x + derive * 0.6 * Math.sin(temps * 2 * Math.PI / 23)))
  const vy = Math.max(-1, Math.min(1, souris.y + derive * 0.5 * Math.sin(temps * 2 * Math.PI / 31 + 1.3)))
  gl.uniform1f(u.uMarge, 0.024 * intro)
  gl.uniform1f(u.uCreuse, intro * (0.024 + 0.014 * Math.sin(temps * 2 * Math.PI / 17) + defile * 0.05))
  gl.uniform1f(u.uLumiere, 0.18 * intro)
  gl.uniform1f(u.uAngle, 0.9 + temps * 0.105)
  gl.uniform2f(u.uPousse, -vx * 14 * dpr / dw * intro, -vy * 9 * dpr / dh * intro)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  images++
  if (!pret) { pret = true; postMessage({ type: 'pret' }) }
  boucle = true; demander(image)
}
const relancer = () => { if (actif && charge && !perdu && !boucle) { dernier = 0; boucle = true; demander(image) } }

function init(m) {
  toile = m.toile; W = m.W; H = m.H; dpr = m.dpr; aspect = m.aspect; pos = m.pos; oeil = m.oeil; voile = m.voile ?? voile
  const o = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, failIfMajorPerformanceCaveat: true }
  try { gl = toile.getContext('webgl2', o) || toile.getContext('webgl', o) } catch (e) { gl = null }
  if (chaud) { const l = chaud.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); chaud = null }
  // pas de contexte, ou un contexte logiciel : la photo reste telle quelle
  if (!gl) return postMessage({ type: 'echec', raison: 'contexte' })
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '')
  if (LOGICIEL.test(renderer)) {
    const perdre = gl.getExtension('WEBGL_lose_context'); if (perdre) perdre.loseContext()
    gl = null
    return postMessage({ type: 'echec', raison: 'logiciel' })
  }
  toile.addEventListener('webglcontextlost', (e) => { e.preventDefault(); perdu = true; postMessage({ type: 'perdu' }) })

  const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s }
  const prog = gl.createProgram()
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS))
  gl.linkProgram(prog)
  const para = gl.getExtension('KHR_parallel_shader_compile')
  const compile = new Promise((ok, ko) => {
    const verif = () => {
      if (para && !gl.getProgramParameter(prog, para.COMPLETION_STATUS_KHR)) return void setTimeout(verif, 16)
      if (gl.getProgramParameter(prog, gl.LINK_STATUS)) ok(); else ko(new Error('shader refusé'))
    }
    verif()
  })
  cadrer()
  // la photo à la taille affichée, décodée et redimensionnée ici (un échantillonnage 2880 → 1440 sans mipmap scintillerait et ne
  // ressemblerait plus à l'image du navigateur)
  const cible = Math.max(1, Math.min(m.largeurNaturelle, Math.round(dw), gl.getParameter(gl.MAX_TEXTURE_SIZE)))
  const bitmap = (url, opts) => fetch(url, { cache: 'force-cache' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob() })
    .then((b) => createImageBitmap(b, opts).catch(() => createImageBitmap(b)))
  Promise.all([bitmap(m.image, { resizeWidth: cible, resizeHeight: Math.round(cible / aspect), resizeQuality: 'high' }), bitmap(m.profondeur), compile]).then(([photo, prof]) => {
    if (gl.isContextLost()) return
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
    for (const n of ['uImage', 'uProf', 'uEchelle', 'uDecal', 'uCentre', 'uOeil', 'uPousse', 'uAspect', 'uCreuse', 'uLumiere', 'uAngle', 'uMarge', 'uVoile']) u[n] = gl.getUniformLocation(prog, n)
    const texture = (unite, source) => {
      gl.activeTexture(gl.TEXTURE0 + unite); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
      if (source.close) source.close()
    }
    texture(0, photo); texture(1, prof)
    gl.uniform1i(u.uImage, 0); gl.uniform1i(u.uProf, 1)
    gl.uniform2f(u.uOeil, oeil[0], oeil[1]); gl.uniform1f(u.uAspect, aspect)
    cadrer()
    charge = true
    relancer()
  }).catch(() => postMessage({ type: 'echec' }))
}

onmessage = (e) => {
  const m = e.data
  if (m.type === 'sonde') {
    let ok = false
    try {
      const g = new OffscreenCanvas(1, 1).getContext('webgl', { failIfMajorPerformanceCaveat: true, alpha: false, antialias: false, depth: false, stencil: false })
      if (g) {
        const i = g.getExtension('WEBGL_debug_renderer_info')
        ok = !LOGICIEL.test(String(g.getParameter(i ? i.UNMASKED_RENDERER_WEBGL : g.RENDERER) || ''))
        // accepté, le contexte reste ouvert jusqu'à l'init : la carte reste chaude pendant la sonde du fil principal
        if (ok) chaud = g
        else { const l = g.getExtension('WEBGL_lose_context'); if (l) l.loseContext() }
      }
    } catch (err) { ok = false }
    postMessage({ type: 'sonde', ok })
  }
  else if (m.type === 'init') init(m)
  else if (m.type === 'taille') { W = m.W; H = m.H; dpr = m.dpr; if (m.voile !== undefined) voile = m.voile; cadrer(); dessine = 0; relancer() }
  else if (m.type === 'souris') {
    // un geste, pas un simple rappel de position (relief.js renvoie la dernière à chaque réactivation)
    if (Math.abs(m.x - visee.x) + Math.abs(m.y - visee.y) > 0.001) geste = performance.now()
    visee.x = m.x; visee.y = m.y; relancer()
  }
  else if (m.type === 'defile') defile = m.v
  else if (m.type === 'actif') { actif = m.v; relancer() }
  // le nombre d'images dessinées : la preuve, pour un banc, que la boucle s'arrête bien hors de l'écran
  else if (m.type === 'compte') postMessage({ type: 'compte', n: images, tours })
}
