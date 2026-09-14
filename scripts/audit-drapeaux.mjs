// Audit des promesses de vente — aucune publication ne cite une fonctionnalité ÉTEINTE.
//
//   node scripts/audit-drapeaux.mjs
//
// ── POURQUOI CE SCRIPT EXISTE ────────────────────────────────────────────────────────────────
//
// Le 2026-09-10, la publication 09 est partie au rendu en annonçant « WhatsApp à partir de 59 € »
// et « Les réseaux à 99 € ». Les deux étaient FAUX : `lib/flags.ts` porte `canauxWhatsapp: false`
// et `canauxReseaux: false`, avec ce commentaire écrit noir sur blanc dans le code :
//
//     « vendu dans la grille cible, PAS CONSTRUIT. Reste caché tant que c'est vrai. »
//
// Et `lib/plans.ts:143` filtre déjà ces lignes hors de la grille tarifaire affichée : le site ne
// les montre pas. Seule la vidéo les vendait.
//
// Le plus gênant : le champ `fonde` de cette publication NOTAIT que ces capacités étaient
// « derrière des drapeaux ». J'avais vu que les drapeaux existaient sans jamais lire leur VALEUR.
// **Citer un drapeau ne dispense pas de l'ouvrir** — d'où ce script, qui l'ouvre à ma place.
//
// L'audit v4 avait déjà relevé des « promesses de vente » de cette famille. C'est la deuxième fois.

import fs from 'node:fs'
import path from 'node:path'
import { PUBLICATIONS } from '../promo-src/hf/publications.mjs'

const RACINE = path.resolve(import.meta.dirname, '..')

// On lit les drapeaux dans le SOURCE, pas dans une copie : `lib/flags.ts` est du TypeScript,
// on en extrait les booléens à la regex plutôt que de le compiler pour trois valeurs.
const flagsSrc = fs.readFileSync(path.join(RACINE, 'lib', 'flags.ts'), 'utf8')
const FLAGS = {}
for (const m of flagsSrc.matchAll(/^\s*(\w+)\s*:\s*(true|false)\s*,/gm)) FLAGS[m[1]] = m[2] === 'true'

// Ce qu'une pub trahirait si elle en parlait, par drapeau.
const MOTS = {
  canauxWhatsapp: [/whatsapp/i],
  canauxReseaux: [/r[ée]seaux sociaux/i, /\bles r[ée]seaux\b/i],
  plateformePersona: [/persona\b/i],
  inventaireRecherche: [/recherche fournisseurs?/i, /recherche chez vos fournisseurs/i],
  plateformeRegles: [/r[èe]gles? d[’']automatisation/i],
}

const eteints = Object.entries(MOTS).filter(([f]) => FLAGS[f] === false).map(([f]) => f)
console.log('Drapeaux surveillés :')
for (const [f] of Object.entries(MOTS)) console.log(`  ${FLAGS[f] === false ? '⛔ ÉTEINT ' : '✓ allumé '} ${f}`)
if (!eteints.length) { console.log('\n✓ aucun drapeau éteint parmi ceux surveillés — rien à vérifier.'); process.exit(0) }
console.log(`\nÉteints : ${eteints.join(', ')}\n${'─'.repeat(92)}`)

let fautes = 0

// ── 1. Le texte QUI S'AFFICHE dans les vidéos. Aucune tolérance : on ne nuance pas en 6 mots. ──
for (const [num, p] of Object.entries(PUBLICATIONS)) {
  for (const x of p.plans) {
    for (const champ of ['kicker', 'titre', 'legende', 'note', 'mot']) {
      const v = x[champ]
      if (!v) continue
      for (const f of eteints) {
        for (const re of MOTS[f]) {
          if (re.test(v)) {
            console.log(`⛔ VIDÉO pub-${num} · ${f} est éteint · « ${v} »`)
            fautes++
          }
        }
      }
    }
  }
}

// ── 2. Le texte des POSTS. Ici une mention est tolérée SI elle dit que ce n'est pas construit. ──
const md = fs.readFileSync(path.join(RACINE, 'plans', 'publications-10.md'), 'utf8')
const DEMENT = /(pas construit|n[’']existe pas|pas aujourd[’']hui|pas encore|reste masqu|grille cible)/i
md.split(/\r?\n/).forEach((l, i) => {
  if (!/^>\s/.test(l)) return
  for (const f of eteints) {
    for (const re of MOTS[f]) {
      if (re.test(l)) {
        if (DEMENT.test(l)) console.log(`ℹ️  POST L${i + 1} · ${f} cité mais DÉMENTI dans la même phrase — accepté`)
        else { console.log(`⛔ POST L${i + 1} · ${f} est éteint · ${l.slice(0, 110)}`); fautes++ }
      }
    }
  }
})


// ── 3. Un prix ne s'affiche jamais nu — ajouté le 2026-09-13 ────────────────────────────────────
//
// Cinq des onze créneaux annonçaient un montant en € sans la mention de TVA, et deux cartons vidéo
// affichaient « 59 € » tout court. Presti est en franchise en base (art. 293 B) : un prix sans
// cette mention est une publicité incomplète pour un abonnement. Règle : dans un POST, tout bloc
// cité (une variante) qui porte un « € » doit porter « 293 B » ; dans une VIDÉO, tout carton avec
// « € » doit dire « /mois » ou « par mois » (la mention TVA vit sur le plan de marque).
for (const [num, p] of Object.entries(PUBLICATIONS)) {
  for (const x of p.plans) {
    for (const champ of ['kicker', 'titre', 'legende', 'note']) {
      const v = x[champ]
      if (v && /\d\s*€/.test(v) && !/(\/mois|par mois)/i.test(v)) { console.log(`⛔ VIDÉO pub-${num} · prix nu · « ${v} »`); fautes++ }
    }
  }
}
{
  const blocs = md.split(/^##\s+Variante/m).slice(1)
  for (const b of blocs) {
    const tete = b.split('\n')[0].trim()
    const cite = b.split(/\r?\n/).filter((l) => /^>\s/.test(l)).join('\n')
    if (/\d\s*€/.test(cite) && !/293\s*B/.test(cite)) { console.log(`⛔ POST Variante ${tete.slice(0, 40)} · un prix sans la mention TVA (art. 293 B)`); fautes++ }
  }
}
console.log('─'.repeat(92))
console.log(fautes ? `✗ ${fautes} promesse(s) de vente sur une fonctionnalité éteinte.` : '✓ Aucune promesse de vente sur une fonctionnalité éteinte.')
process.exit(fautes ? 1 : 0)
