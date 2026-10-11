'use client'

import { useEffect, useRef } from 'react'

// L'objet vivant du héros (refonte du 11/10/2026) : un anneau de plasma corail, le « cœur » de
// l'assistant, qui respire, suit la souris et s'ouvre quand on défile. Un shader WebGL 1 brut,
// sans bibliothèque (rien de plus à télécharger qu'un composant).
//
// Il ne doit jamais coûter l'affichage du texte : la toile démarre après le premier rendu, quand le
// navigateur est libre, et arrive en fondu. Hors écran ou onglet caché : pause. Mouvement réduit :
// une seule image fixe. Sans WebGL : rien, le fond sombre du héros suffit.

const SOMMET = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'

const FRAGMENT = `precision mediump float;
uniform vec2 u_res; uniform float u_t; uniform float u_p; uniform vec2 u_m;
const vec3 CO=vec3(.851,.467,.341);
const vec3 AMBRE=vec3(.965,.71,.48);
const vec3 FOND=vec3(.035,.035,.047);
float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h1(i),h1(i+vec2(1.,0.)),f.x),mix(h1(i+vec2(0.,1.)),h1(i+vec2(1.,1.)),f.x),f.y);}
float fbm3(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*n2(p);p=p*2.1+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*u_res)/u_res.y;
  vec2 q=uv-vec2(0.,.06)+u_m*.03;
  q/=(1.+.35*u_p);
  float d=length(q), a=atan(q.y,q.x); vec2 c=vec2(cos(a),sin(a));
  float R=.34+.04*sin(u_t*.35);
  vec3 col=vec3(0.);
  for(int i=0;i<8;i++){
    float fi=float(i);
    float n=fbm3(c*1.3+vec2(u_t*.12+fi*1.31,fi*2.07-u_t*.04));
    float rr=R+(n-.5)*(.16+.014*fi)*(1.+.8*u_p);
    float e=abs(d-rr);
    float g=.0024/(e+.003);
    vec3 teinte=mix(CO,AMBRE,smoothstep(-.9,.9,sin(a+fi*.8+u_t*.2)));
    col+=teinte*g*(.32+.68*n);
    col+=vec3(1.,.93,.86)*pow(g,4.)*.3;
  }
  col+=mix(CO,AMBRE,.4)*.14*exp(-abs(d-R)*4.);
  col+=CO*.07*exp(-d*2.6);
  for(int i=0;i<16;i++){
    float fi=float(i);
    float hh=h1(vec2(fi,7.)), hk=h1(vec2(fi,13.));
    float ang=hh*6.2831+u_t*(.12+.22*hk)*(hk>.5?1.:-1.);
    vec2 pp=(R+(hk-.5)*.32)*vec2(cos(ang),sin(ang));
    float dd=length(q-pp);
    col+=AMBRE*.000018/(dd*dd+.000018)*(.5+.5*sin(u_t*2.6+fi));
  }
  vec3 fond=FOND*(1.-.3*length(uv));
  vec3 sortie=1.-exp(-(fond+col)*1.2);
  sortie+=(h1(gl_FragCoord.xy+fract(u_t)*91.)-.5)*.03;
  gl_FragColor=vec4(sortie,1.);
}`

export default function ObjetVivant({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const toile = ref.current
    if (!toile) return
    let arrete = false
    let image = 0
    let nettoyer = () => {}

    const demarrer = () => {
      if (arrete) return
      const gl = toile.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power', preserveDrawingBuffer: false })
      if (!gl) return
      const shader = (type: number, source: string) => {
        const s = gl.createShader(type)!
        gl.shaderSource(s, source)
        gl.compileShader(s)
        return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
      }
      const vs = shader(gl.VERTEX_SHADER, SOMMET)
      const fs = shader(gl.FRAGMENT_SHADER, FRAGMENT)
      if (!vs || !fs) return
      const prog = gl.createProgram()!
      gl.attachShader(prog, vs)
      gl.attachShader(prog, fs)
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
      gl.useProgram(prog)
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const pos = gl.getAttribLocation(prog, 'p')
      gl.enableVertexAttribArray(pos)
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)
      const u = (n: string) => gl.getUniformLocation(prog, n)
      const uRes = u('u_res'), uT = u('u_t'), uP = u('u_p'), uM = u('u_m')

      const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches
      // Le plasma est flou par nature : sur téléphone, on le calcule en basse définition.
      const echelle = () => Math.min(window.devicePixelRatio || 1, 1.5) * (window.innerWidth < 760 ? .5 : .75)
      const taille = () => {
        const r = toile.getBoundingClientRect()
        const e = echelle()
        toile.width = Math.max(1, Math.round(r.width * e))
        toile.height = Math.max(1, Math.round(r.height * e))
        gl.viewport(0, 0, toile.width, toile.height)
      }
      taille()
      const souris = { x: 0, y: 0, cx: 0, cy: 0 }
      const bouge = (ev: PointerEvent) => { souris.x = ev.clientX / window.innerWidth - .5; souris.y = .5 - ev.clientY / window.innerHeight }
      let visible = true
      const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !reduit) boucle() }, { rootMargin: '80px' })
      obs.observe(toile)
      const debut = performance.now()
      const dessiner = (t: number) => {
        const r = toile.getBoundingClientRect()
        const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)))
        souris.cx += (souris.x - souris.cx) * .05
        souris.cy += (souris.y - souris.cy) * .05
        gl.uniform2f(uRes, toile.width, toile.height)
        gl.uniform1f(uT, t)
        gl.uniform1f(uP, p)
        gl.uniform2f(uM, souris.cx, souris.cy)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
      const boucle = () => {
        cancelAnimationFrame(image)
        const pas = () => {
          if (arrete || !visible || document.hidden) return
          dessiner((performance.now() - debut) / 1000)
          image = requestAnimationFrame(pas)
        }
        image = requestAnimationFrame(pas)
      }
      const redessinerFixe = () => dessiner(12)
      const onResize = () => { taille(); if (reduit) redessinerFixe() }
      const onVis = () => { if (!document.hidden && !reduit) boucle() }
      window.addEventListener('resize', onResize)
      document.addEventListener('visibilitychange', onVis)
      if (reduit) redessinerFixe()
      else { window.addEventListener('pointermove', bouge, { passive: true }); boucle() }
      requestAnimationFrame(() => toile.classList.add('pret'))
      nettoyer = () => {
        obs.disconnect()
        window.removeEventListener('resize', onResize)
        window.removeEventListener('pointermove', bouge)
        document.removeEventListener('visibilitychange', onVis)
        gl.getExtension('WEBGL_lose_context')?.loseContext()
      }
    }

    // Après le premier rendu et quand le navigateur souffle : le texte du héros passe avant.
    const ric = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    const minuterie = ric ? ric(demarrer, { timeout: 1200 }) : window.setTimeout(demarrer, 300)
    return () => {
      arrete = true
      cancelAnimationFrame(image)
      if (!ric) clearTimeout(minuterie)
      nettoyer()
    }
  }, [])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
