// Le comparatif avec les concurrents (lib/comparatifConcurrents.ts) tient la règle de la publicité comparative (art. L122-1 du
// Code de la consommation) : faits vérifiables et DATÉS, mêmes critères pour tous, sources, aucun dénigrement, pas d'absence affirmée.
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/comparatif-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const RACINE = process.cwd()
const C = await import(pathToFileURL(path.join(RACINE, 'lib/comparatifConcurrents.ts')).href)
const F = await import(pathToFileURL(path.join(RACINE, 'lib/flags.ts')).href)
const P = await import(pathToFileURL(path.join(RACINE, 'lib/plans.ts')).href)
const echecs = []; let n = 0
const ok = (c, m) => { n++; if (!c) echecs.push(m) }

ok(/^\d{2}\/\d{2}\/\d{4}$/.test(C.COMPARATIF_DATE), 'COMPARATIF_DATE doit être JJ/MM/AAAA')
const [j, m, a] = C.COMPARATIF_DATE.split('/').map(Number)
const age = (Date.now() - new Date(a, m - 1, j).getTime()) / 864e5
ok(age >= 0 && age <= 183, `comparatif vieux de ${Math.round(age)} jours : relire les sites des éditeurs et mettre COMPARATIF_DATE à jour`)
ok(C.COMPARATIF_DATE_ISO === `${a}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`, 'COMPARATIF_DATE_ISO ≠ COMPARATIF_DATE')
ok(C.COMPARATIF_MENTION.includes(C.COMPARATIF_DATE) && /d’après les sites des éditeurs/.test(C.COMPARATIF_MENTION), 'la mention « Comparatif établi le … d’après les sites des éditeurs » est absente')
ok(C.CONCURRENTS.length >= 3, 'au moins 3 concurrents')
ok(C.CONCURRENTS.some((c) => c.id === 'henrri'), 'Henrri doit figurer (demande de Benj)')

const MOTS_DENIGRANT = /\b(nul|nulle|mauvais|mauvaise|arnaque|médiocre|pire|catastroph|inutile|dépassé|obsolète|lent|bâclé|honteux)\b/i
for (const cr of C.CRITERES) ok(typeof C.PRESTI[cr.id] === 'string' && C.PRESTI[cr.id].length > 1, `colonne Presti vide pour « ${cr.id} »`)
for (const c of C.CONCURRENTS) {
  const urls = new Set(c.sources.map((s) => s.url))
  ok(c.sources.length >= 2, `${c.nom} : au moins 2 pages sources`)
  for (const s of c.sources) ok(/^https:\/\/[^ ]+$/.test(s.url), `${c.nom} : source illisible ${s.url}`)
  for (const cr of C.CRITERES) {
    const cell = c.cellules[cr.id]
    ok(!!cell && cell.t.length > 1, `${c.nom} : critère « ${cr.id} » absent (mêmes critères pour tous)`)
    if (!cell) continue
    ok(urls.has(cell.url), `${c.nom} / ${cr.id} : l'URL ${cell.url} n'est pas dans les sources listées`)
    ok(!/^non\.?$/i.test(cell.t.trim()), `${c.nom} / ${cr.id} : « Non » affirme une absence ; écrire « Non indiqué »`)
    ok(!MOTS_DENIGRANT.test(cell.t), `${c.nom} / ${cr.id} : terme dénigrant`)
  }
}
ok(!MOTS_DENIGRANT.test(Object.values(C.PRESTI).join(' ')), 'terme dénigrant dans la colonne Presti')
// Les composants affichent la mention, la précaution, les sources.
const comp = fs.readFileSync(path.join(RACINE, 'app/ComparatifConcurrents.tsx'), 'utf8')
for (const k of ['COMPARATIF_MENTION', 'COMPARATIF_PRECAUTION', 'Sources du comparatif', 'c.sources']) ok(comp.includes(k), `app/ComparatifConcurrents.tsx n'affiche pas ${k}`)
ok(/<ComparatifConcurrents\b/.test(fs.readFileSync(path.join(RACINE, 'app/page.tsx'), 'utf8')), 'la landing ne rend pas le comparatif')
// Presti honnête : la colonne dit ce qu'elle ne fait pas.
ok(/pas de plateforme agréée/.test(C.PRESTI.facture_electronique), 'Presti doit dire qu\'il n\'a pas de plateforme agréée intégrée')
// Les relances d'impayés : la ligne dit ce qui est livré, ni plus ni moins (drapeau lib/flags.ts relancesImpayes).
if (F.FLAGS.relancesImpayes) ok(/relances automatiques à cocher/.test(C.PRESTI.relances) && /J\+3, J\+10, J\+21/.test(C.PRESTI.relances) && /assistant/.test(C.PRESTI.relances), "Presti : relances automatiques d'impayés (à cocher) ET relance préparée par l'assistant")
else ok(/pas de relance automatique des impayés/.test(C.PRESTI.relances), "drapeau relancesImpayes baissé : Presti doit dire qu'il ne relance pas les impayés tout seul")
ok(!/pas de relance automatique des impayés/.test(C.PRESTI.relances) || !F.FLAGS.relancesImpayes, "la phrase « pas de relance automatique » ne reste pas quand la fonction est livrée")

// ─── Ce que Presti fait de plus : chaque avantage cite un critère et une preuve dans le code ───────────────────────────────
const A = C.AVANTAGES
ok(C.AVANTAGES_VISIBLES.length >= 4 && C.AVANTAGES_VISIBLES.length <= 6, `4 à 6 avantages montrés (${C.AVANTAGES_VISIBLES.length})`)
const SUPERLATIFS = /(le meilleur|la meilleure|les meilleurs|meilleur(e|s)? que|n°\s?1|numéro 1|numero 1|incomparable|imbattable|révolutionn|le seul|la seule|les seuls|seul logiciel|seul outil|unique sur le marché|sans équivalent|aucun concurrent|tous les autres|moins cher que|plus rapide que|plus complet)/i
const NEGATIFS_AUTRES = /(les autres (sont|font) (mal|mauvais)|ne savent pas|incapables?)/i
const ids = new Set()
for (const av of A) {
  ok(!ids.has(av.id), `avantage ${av.id} en double`); ids.add(av.id)
  ok(C.CRITERES.some((c) => c.id === av.critere), `avantage ${av.id} : critère ${av.critere} absent du tableau`)
  ok(av.preuves.length >= 1, `avantage ${av.id} : au moins une preuve dans le code`)
  for (const pr of av.preuves) {
    const fp = path.join(RACINE, pr.fichier)
    const existe = fs.existsSync(fp)
    ok(existe, `avantage ${av.id} : fichier de preuve introuvable ${pr.fichier}`)
    if (existe) ok(new RegExp(pr.motif).test(fs.readFileSync(fp, 'utf8')), `avantage ${av.id} : le motif /${pr.motif}/ est absent de ${pr.fichier}`)
  }
  const tout = [av.titre, av.texte, C.phraseAutres(av) ?? ''].join(' ')
  ok(!SUPERLATIFS.test(tout), `avantage ${av.id} : superlatif invérifiable (${tout.match(SUPERLATIFS)?.[0]})`)
  ok(!MOTS_DENIGRANT.test(tout) && !NEGATIFS_AUTRES.test(tout), `avantage ${av.id} : terme dénigrant`)
  ok(av.titre.length >= 12 && av.texte.length >= 80 && av.texte.length <= 520, `avantage ${av.id} : texte trop court ou trop long`)
  // La comparaison avec les éditeurs : 'aucun' seulement si les quatre cellules du critère sont « Non indiqué ».
  if (av.autres === 'aucun') ok(C.CONCURRENTS.every((c) => /^Non indiqué$/.test(c.cellules[av.critere].t)), `avantage ${av.id} : « aucun des quatre éditeurs » faux — une cellule du critère ${av.critere} dit autre chose que « Non indiqué »`)
  else if (av.autres) for (const m of av.autres.motsCellule) ok(C.CONCURRENTS.find((c) => c.id === m.editeur)?.cellules[av.critere].t.includes(m.mot), `avantage ${av.id} : « ${m.mot} » absent de la cellule ${m.editeur}/${av.critere}`)
}
// Les offres citées viennent de lib/plans.ts (jamais retapées) : si une offre change, le texte suit — le juge relit les prix.
const impayes = A.find((x) => x.id === 'impayes')
if (impayes && F.FLAGS.relancesImpayes) ok(impayes.texte.includes(`${P.PLANS[P.offreMinimale('factures.relances')].prixMois} €`) && /Dès l’offre Studio/.test(impayes.texte) && impayes.texte.includes(P.PLANS[P.offreMinimale('factures.relances')].label), "avantage impayés : l'offre et le prix viennent de lib/plans.ts")
// Un avantage dont la fonction n'est pas livrée (drapeau baissé) ne s'affiche pas.
ok(C.AVANTAGES_VISIBLES.every((x) => !x.flag || F.FLAGS[x.flag]), 'aucun avantage dont le drapeau est baissé')
ok(C.AVANTAGES_VISIBLES.every((x) => C.CRITERES_VISIBLES.some((c) => c.id === x.critere)), 'aucun avantage rattaché à un critère masqué')
// La transparence reste : la ligne facture électronique est là et les limites suivent les avantages, courtes et neutres.
ok(C.COMPARATIF_LIMITES_LIGNES.length >= 2 && C.COMPARATIF_LIMITES_LIGNES.length <= 4, 'les limites tiennent en 2 à 4 lignes')
ok(C.COMPARATIF_LIMITES_LIGNES.some((l) => /plateforme agréée/.test(l) && /Factur-X/.test(l)), 'les limites disent la facture électronique (plateforme agréée, Factur-X)')
ok(C.COMPARATIF_LIMITES_LIGNES.every((l) => l.length <= 190 && !MOTS_DENIGRANT.test(l)), 'limites courtes et neutres')
ok(C.CRITERES_VISIBLES.some((c) => c.id === 'facture_electronique'), 'la ligne « Facture électronique » reste dans le tableau')
ok(C.COMPARATIF_LIMITES.startsWith(C.COMPARATIF_LIMITES_TITRE), 'COMPARATIF_LIMITES est construit depuis les mêmes lignes')
// Composant : les avantages viennent AVANT les limites, qui viennent AVANT la mention ; rien n'est retapé.
{
  const i1 = comp.indexOf('Ce que Presti fait de plus'), i2 = comp.indexOf('COMPARATIF_LIMITES_TITRE}</h3>'), i3 = comp.indexOf('<p className="cc-mention">')
  ok(i1 > 0 && i2 > i1 && i3 > i2, 'ordre de la page : tableau, « Ce que Presti fait de plus », « Là où les autres sont devant », mention')
  ok(/AVANTAGES_VISIBLES\.map/.test(comp) && /phraseAutres/.test(comp), 'le composant rend AVANTAGES_VISIBLES')
}

// 15/10 (Benj) : « Ma plateforme » et « Mes chiffres » commencent avec Studio. Le comparatif ne dit rien d'Essentiel qui ne l'est plus : aucune cellule
// Presti ne nomme ces écrans ni leur personnalisation, et chaque niveau d'automatisation cité (dès Studio / complète en Signature) est celui de lib/plans.ts.
{
  const textes = [...Object.values(C.PRESTI), ...C.AVANTAGES.flatMap((a) => [a.titre, a.texte])].join(' ')
  ok(!/Ma plateforme|Mes chiffres|compta/i.test(textes), 'le comparatif ne doit pas annoncer « Ma plateforme » ni « Mes chiffres » (écrans Studio) comme acquis à toutes les offres')
  ok(C.PRESTI.automatisation.includes('dès Studio') && /complète en Signature/.test(C.PRESTI.automatisation), "la cellule d'automatisation doit dire « dès Studio » puis « complète en Signature »")
  ok(!/dès Essentiel/.test(C.PRESTI.automatisation.replace(/relances automatiques dès Essentiel/, '')), "l'automatisation ne commence pas avec Essentiel (hors les relances)")
}

if (echecs.length) { console.log(`❌ comparatif-qa : ${echecs.length} échec(s) sur ${n}`); for (const e of echecs) console.log('  - ' + e); process.exit(1) }
console.log(`✅ comparatif-qa : ${n}/${n} contrôles — ${C.CONCURRENTS.length} éditeurs, ${C.CRITERES_VISIBLES.length} critères, daté du ${C.COMPARATIF_DATE}`)
