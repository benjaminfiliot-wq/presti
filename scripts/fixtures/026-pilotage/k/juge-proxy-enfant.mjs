// scripts/fixtures/026-pilotage/k/juge-proxy-enfant.mjs — l'enfant de CL-16 (fiche 026-170, écrit par Claude Code).
//
//   node juge-proxy-enfant.mjs <racine jugée>
//
// Il appelle la fonction `proxy` de proxy.ts (sous la racine jugée, chargé par le crochet de résolution, `next/server`
// doublé : juge-doublure-next.mjs) avec un hôte d'artisan factice, et rend UNE ligne « @@proxy@@ {json} » : ce que la fonction
// décide pour /station/themes/station/theme.json (les thèmes ne se servent jamais sur le domaine d'un artisan) et pour trois
// chemins de contrôle (un chemin ordinaire passe ; le manifeste est refusé comme avant ; l'hôte maison sert les thèmes).
import fs from 'node:fs'
import path from 'node:path'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { CROCHET, urlDossier } from '../s/commun.mjs'
import { R } from '../a/commun.mjs'

const [racine] = process.argv.slice(2)
const sortie = (o) => console.log(`@@proxy@@ ${JSON.stringify(o)}`)
try {
  const doublure = pathToFileURL(path.join(path.dirname(new URL(import.meta.url).pathname), 'juge-doublure-next.mjs')).href
  register(`data:text/javascript,${encodeURIComponent(CROCHET)}`, { data: { racine: urlDossier(racine), depot: urlDossier(R), doublures: doublure, doubles: {}, prefixes: {}, paquets: { 'next/server': 'next' } } })
  const fichier = ['proxy.ts', 'middleware.ts'].map((f) => path.join(racine, f)).find((f) => fs.existsSync(f))
  const M = await import(pathToFileURL(fichier ?? path.join(racine, 'proxy.ts')).href)
  const appel = M.proxy ?? M.middleware
  if (typeof appel !== 'function') throw new Error('proxy.ts n\'exporte ni proxy ni middleware')
  const requete = (hote, chemin) => ({ headers: { get: (k) => (k.toLowerCase() === 'host' ? hote : null) }, nextUrl: { pathname: chemin, clone() { return { pathname: this.pathname } } } })
  const jouer = async (hote, chemin) => { const r = await appel(requete(hote, chemin)); return `${r?.type ?? '?'}${r?.pathname ? `:${r.pathname}` : ''}` }
  sortie({
    ok: true,
    theme: await jouer('artisan-essai.exemple.invalid', '/station/themes/station/theme.json'),
    themeVaisseau: await jouer('artisan-essai.exemple.invalid', '/station/themes/vaisseau/theme.json'),
    ordinaire: await jouer('artisan-essai.exemple.invalid', '/faq'),
    manifeste: await jouer('artisan-essai.exemple.invalid', '/manifest.webmanifest'),
    maison: await jouer('127.0.0.1:3000', '/station/themes/station/theme.json'),
  })
} catch (e) {
  sortie({ ok: false, erreur: String(e?.message ?? e).split('\n')[0].slice(0, 200) })
}
