// head-pousse.mjs — attend que le HEAD du PC soit connu de GitHub (origin/main), sans jamais pousser lui-même.
// `usine.mjs executer` et `lancer` partent d'origin/main : un commit d'une autre session pas encore poussé (son crochet de commit dure 2 à 3 min,
// le push vient après) les fait refuser « HEAD inconnu de GitHub : pousse d'abord » (code 125). Ce n'est pas une panne de l'usine : on attend un peu
// (29/09, 15:35 : deux commits en vol ont envoyé le typecheck du moteur sur le PC, 15 min, PC saturé) avant de renoncer.
import { spawnSync } from 'node:child_process'

const dormir = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

/** Rend { ok, tete, attenteS } : ok si HEAD est un ancêtre d'origin/main (déjà poussé). Attend jusqu'à maxS secondes, en relisant origin. */
export function headPousse({ cwd, maxS = 240, pasS = 15 } = {}) {
  const g = (...a) => spawnSync('git', a, { cwd, encoding: 'utf8', windowsHide: true, timeout: 60_000 })
  const debut = Date.now()
  for (;;) {
    g('fetch', '-q', 'origin') // ne touche ni l'index ni l'arbre : seulement origin/*
    if (g('merge-base', '--is-ancestor', 'HEAD', 'origin/main').status === 0) return { ok: true, tete: (g('rev-parse', '--short', 'HEAD').stdout || '').trim(), attenteS: Math.round((Date.now() - debut) / 1000) }
    if (Date.now() - debut >= maxS * 1000) return { ok: false, tete: (g('rev-parse', '--short', 'HEAD').stdout || '').trim(), attenteS: Math.round((Date.now() - debut) / 1000) }
    dormir(Math.max(200, Math.min(pasS * 1000, maxS * 1000 - (Date.now() - debut))))
  }
}
