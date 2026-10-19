#!/usr/bin/env node
// scripts/refonte-pages-publiques-qa.mjs — juge de la tâche R18-01 (refonte 18/10, étape 6.2) : les pages publiques /offres et
// /comparatif, où partent le tableau « qui a quoi » et le comparatif des concurrents (plans/refonte-1018/INVENTAIRE-CONTENU.md
// §12 et §13). Lecture du code seulement : aucun serveur, aucune base, aucun réseau.
//
// Ce qui est exigé (chaque ligne peut rougir ; `--prouver-rouge` le montre sur des copies altérées) :
//   • les deux pages existent, derrière le drapeau landingV2 (404 en production tant qu'il est baissé), et sont absentes du
//     plan du site tant qu'il est baissé ;
//   • /comparatif monte ComparatifConcurrents (tableau, cartes, « là où les autres sont devant », mention de date, précaution,
//     sources : tout vit dans ce composant) et garde le titre, le chapeau et la phrase « Une information inexacte… » ;
//   • /offres monte les offres de lib/plans.ts (OFFRES, jamais un prix recopié), OffreDetail INTÉGRAL par offre, la mention
//     « TVA non applicable, art. 293 B du CGI », les jours d'essai (ESSAI_JOURS), le paiement direct (data-payer-direct),
//     le tableau Comparatif DÉPLIÉ (pas dans un <details>), les trois explications des crédits, la note des crédits, l'essai,
//     et le site à 300 € sous siteCommandeVente ;
//   • aucune couleur bleue ou violette, aucun texte en dur de prix (« 29 € », « 59 € », « 99 € ») ;
//   • les pages sont des pages publiques Presti (PublicNav, PublicPied, globals.css), jamais AppShell.
import fs from 'node:fs'
import path from 'node:path'

const RACINE = process.cwd()
const lire = (f) => { try { return fs.readFileSync(path.join(RACINE, f), 'utf8') } catch { return null } }
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`PASS ${n}`) } else { ko++; console.log(`FAIL ${n}${d ? ' — ' + d : ''}`) } }

function juger(src) {
  const off = src.offres, comp = src.comparatif, plan = src.sitemap
  const res = []
  const t = (n, c) => res.push([n, !!c])
  t('/offres existe (app/offres/page.tsx)', off)
  t('/comparatif existe (app/comparatif/page.tsx)', comp)
  for (const [nom, s] of [['/offres', off], ['/comparatif', comp]]) {
    if (!s) continue
    t(`${nom} : derrière landingV2 (notFound en production si baissé)`, /actif\(\s*['"]landingV2['"]\s*\)/.test(s) && /notFound\(\)/.test(s) && /VERCEL_ENV\s*===\s*['"]production['"]/.test(s))
    t(`${nom} : page publique (PublicNav + PublicPied + globals.css), jamais AppShell`, /PublicNav/.test(s) && /PublicPied/.test(s) && /app\/globals\.css/.test(s) && !/AppShell/.test(s))
    t(`${nom} : métadonnées (title, description, canonique)`, /title\s*:/.test(s) && /description\s*:/.test(s) && new RegExp(`canonical\\s*:\\s*['"]${nom}['"]`).test(s))
    t(`${nom} : aucun bleu ni violet`, !/#6C8CFF|#8A6BFF|#3EE0F0|#2451a6|\bblue\b|\bviolet\b|\bpurple\b/i.test(s))
    t(`${nom} : aucun prix recopié à la main`, !/\b(29|59|99)\s?€/.test(s))
  }
  if (comp) {
    t('/comparatif : monte ComparatifConcurrents', /import ComparatifConcurrents from ['"]@\/app\/ComparatifConcurrents['"]/.test(comp) && /<ComparatifConcurrents\s*\/>/.test(comp))
    t('/comparatif : titre « Presti et les autres logiciels de devis et factures. »', /Presti et les autres logiciels de devis et factures\./.test(comp))
    t('/comparatif : chapeau « Les mêmes critères pour tous, lus sur le site de chaque éditeur. »', /Les mêmes critères pour tous, lus sur le site de chaque éditeur\./.test(comp))
    t('/comparatif : lien vers /offres', /href=["']\/offres["']/.test(comp))
  }
  if (off) {
    t('/offres : OFFRES lu dans lib/plans.ts', /from ['"]@\/lib\/plans['"]/.test(off) && /OFFRES\.map/.test(off))
    t('/offres : OffreDetail intégral pour chaque offre', /<OffreDetail\b[^>]*id=\{o\.id\}/.test(off))
    t('/offres : mention TVA art. 293 B sur chaque carte', /TVA non applicable, art\. 293 B du CGI/.test(off))
    t('/offres : jours d’essai lus dans ESSAI_JOURS', /ESSAI_JOURS\[o\.id\]/.test(off))
    t('/offres : paiement direct gardé (data-payer-direct)', /data-payer-direct=\{o\.id\}/.test(off) && /\/signup\?abonnement=\$\{o\.id\}/.test(off))
    t('/offres : tableau « qui a quoi » DÉPLIÉ (Comparatif hors de tout <details>)', /<Comparatif\s*\/>/.test(off) && !/<details[\s\S]{0,400}<Comparatif\s*\/>/.test(off))
    t('/offres : « 1 crédit = 1 génération »', /1 crédit = 1 génération/.test(off))
    t('/offres : « Modèle Expert = 3 crédits »', /Modèle Expert = 3 crédits/.test(off))
    t('/offres : « Rechargés chaque mois »', /Rechargés chaque mois/.test(off))
    t('/offres : note des crédits (« crédits de l’essai proportionnels à sa durée »)', /crédits de l[’']essai proportionnels à sa durée/.test(off))
    t('/offres : bandeau d’essai (« L’essai n’inclut pas la plateforme »)', /L(&apos;|[’'])essai n(&apos;|[’'])inclut pas la plateforme/.test(off))
    t('/offres : site à 300 € sous siteCommandeVente (SITE_A_LA_DEMANDE)', /actif\(['"]siteCommandeVente['"]\)/.test(off) && /SITE_A_LA_DEMANDE/.test(off))
    t('/offres : lien vers /comparatif', /href=["']\/comparatif["']/.test(off))
  }
  t('plan du site : /offres et /comparatif seulement si landingV2 est levé', !!plan && /landingV2/.test(plan) && /\/offres/.test(plan) && /\/comparatif/.test(plan))
  return res
}

const sources = { offres: lire('app/offres/page.tsx'), comparatif: lire('app/comparatif/page.tsx'), sitemap: lire('app/sitemap.ts') }
for (const [n, c] of juger(sources)) T(n, c)

// Preuve que le juge peut rougir : chaque altération doit faire tomber au moins un contrôle.
if (process.argv.includes('--prouver-rouge') && sources.offres && sources.comparatif) {
  const alterations = [
    ['sans drapeau', { ...sources, offres: sources.offres.replace(/landingV2/g, 'xx') }],
    ['tableau replié', { ...sources, offres: sources.offres.replace(/<Comparatif\s*\/>/, '<details><summary>x</summary><Comparatif /></details>') }],
    ['prix recopié', { ...sources, offres: sources.offres + '\n// 59 €' }],
    ['sans sources', { ...sources, comparatif: sources.comparatif.replace(/<ComparatifConcurrents\s*\/>/g, '') }],
    ['bleu', { ...sources, comparatif: sources.comparatif + '\n/* #6C8CFF */' }],
  ]
  for (const [nom, s] of alterations) T(`le juge rougit : ${nom}`, juger(s).some(([, c]) => !c))
}

console.log(`\n${ok} vert(s), ${ko} rouge(s)`)
process.exitCode = ko ? 1 : 0
