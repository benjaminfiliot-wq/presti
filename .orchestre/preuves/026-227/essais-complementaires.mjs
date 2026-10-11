// Essais complémentaires de 026-227 (au-delà du juge) : reprises, accord, coût, données personnelles, registre coupé.
// Données fictives, horloge figée, aucune connexion. Usage : node essais-complementaires.mjs <chemin/lancer-experience.mjs>
import { pathToFileURL } from 'node:url'
import path from 'node:path'
const mod = await import(pathToFileURL(path.resolve(process.argv[2] || 'scripts/chef/lancer-experience.mjs')).href)
const T = Date.parse('2026-10-05T10:00:00.000Z')
const iso = (t) => new Date(t).toISOString()
const OBJ = 'réduire les abandons de devis sur mobile (essai)'
const VENTE = { id: 'vente-essai', statut: 'encaisse', confirme: true, test: false, source: 'stripe:evt_essai (fictif)' }
const FAUX_MAIL = ['contact', 'presti-test.invalid'].join('@') // adresse fictive, assemblée à l'exécution
const FAUX_TEL = ['06', '12', '34', '56', '78'].join(' ')
const FAUX_SECRET = ['sk', 'ESSAI-abcdef0123456789xyz'].join('-')
const demande = (p = {}) => ({ id: 'exp-essai-x', version: 1, source: 'decision-benj', objectif: OBJ, metrique: { nom: 'abandon', depart: 0.4, sens: 'baisse' }, horizon_jours: 14,
  population: 'artisans fictifs', seuil_arret: 'abandon > 0,5', cout_max_eur: 10, touche: ['site'], accord_benj: { id: 'acc-1', objectif: OBJ, date: iso(T) }, ...p })
const fab = (o = {}) => {
  const c = { ev: [], ecr: 0, drap: 0 }; const m = new Map()
  const deps = { ventes: async () => [VENTE], magasin: { lire: async (k) => (m.has(k) ? structuredClone(m.get(k)) : null), ecrire: async (k, v) => { c.ecr++; m.set(k, structuredClone(v)) } },
    horloge: { maintenant: () => T }, evenements: { emettre: async (e) => { c.ev.push(e) } }, drapeaux: { basculer: async () => { c.drap++ } }, ...o }
  return { c, m, deps }
}
let n = 0, ko = 0
const ok = (cond, nom) => { n++; if (!cond) { ko++; console.log(`FAIL ${nom}`) } else console.log(`PASS ${nom}`) }
{ // proposée puis accord : démarre une seule fois
  const x = fab(); const a = await mod.lancerExperience(demande({ accord_benj: undefined }), x.deps)
  ok(a.experience?.etat === 'proposée' && !x.c.ev.length, 'sans accord : proposée, aucun événement')
  const b = await mod.lancerExperience(demande(), x.deps)
  ok(b.experience?.etat === 'en cours' && x.c.ev.length === 1 && x.c.ev[0].type === 'demarrage', 'accord ensuite : en cours, un événement de démarrage')
  const c = await mod.lancerExperience(demande(), x.deps)
  ok(c.deja === true && x.c.ev.length === 1, 'reprise identique : deja, pas de second événement')
}
{ // coupure entre approuvée et en cours : reprise avec la même clé
  const x = fab({ evenements: { emettre: async () => { throw new Error('bus coupé') } } })
  const a = await mod.lancerExperience(demande(), x.deps)
  ok(a.refus === 'evenement_indisponible' && x.m.get('experience-exp-essai-x').etat === 'approuvée', 'bus coupé : approuvée reprenable')
  const evs = []; x.deps.evenements = { emettre: async (e) => { evs.push(e) } }
  const b = await mod.lancerExperience(demande(), x.deps)
  ok(b.experience?.etat === 'en cours' && evs.length === 1 && /demarrage$/.test(evs[0].cle), "reprise : en cours, une clé d'idempotence")
}
{ // accords refusés
  for (const [nom, acc, crit] of [['autre objectif', { id: 'a', objectif: 'autre', date: iso(T) }, 'accord_autre_objectif'], ['date future', { id: 'a', objectif: OBJ, date: iso(T + 86400000) }, 'accord_invalide'],
    ['expiré', { id: 'a', objectif: OBJ, date: iso(T - 1000), expire_le: iso(T - 1) }, 'accord_perime'], ['sans id', { objectif: OBJ, date: iso(T) }, 'accord_invalide']]) {
    const x = fab(); const r = await mod.lancerExperience(demande({ accord_benj: acc }), x.deps)
    ok(r.refus === crit && !x.c.ev.length && !x.c.ecr, `accord ${nom} : ${crit}, rien écrit`)
  }
}
{ // cadre modifié = nouvel accord (chaque champ)
  for (const [nom, plus] of [['coût', { cout_max_eur: 99 }], ['horizon', { horizon_jours: 60 }], ['population', { population: 'tout le monde' }], ['seuil', { seuil_arret: 'jamais' }], ['version', { version: 2 }], ['portée', { touche: ['site', 'prix'] }], ['métrique', { metrique: { nom: 'abandon', depart: 0.9, sens: 'baisse' } }]]) {
    const x = fab(); await mod.lancerExperience(demande(), x.deps)
    const r = await mod.lancerExperience(demande(plus), x.deps)
    ok(r.refus === 'nouvel_accord' && x.c.ev.length === 1, `${nom} modifié : nouvel_accord`)
  }
}
{ // données personnelles, secret, id piégé, portée inconnue
  for (const [nom, plus, crit] of [['e-mail', { population: `contacter ${FAUX_MAIL}` }, 'donnee_personnelle'], ['téléphone', { objectif: `appeler le ${FAUX_TEL}`, accord_benj: undefined }, 'donnee_personnelle'],
    ['secret', { population: `clé ${FAUX_SECRET}` }, 'secret'], ['id piégé', { id: '../../evasion' }, 'cadre'], ['portée inconnue', { touche: ['tout'] }, 'cadre'], ['sans départ', { metrique: { nom: 'x' } }, 'cadre'], ['version 0', { version: 0 }, 'cadre']]) {
    const x = fab(); const r = await mod.lancerExperience(demande(plus), x.deps)
    ok(r.refus === crit && !x.c.ev.length && !x.c.ecr, `${nom} : ${crit}`)
  }
}
{ // service de vente coupé / liste illisible : fermé
  const x = fab({ ventes: async () => { throw new Error('stripe indisponible') } }); const r = await mod.lancerExperience(demande(), x.deps)
  ok(r.refus === 'premiere_vente_inconnue' && !x.c.ecr, 'ventes indisponibles : fermé')
  const y = fab({ ventes: async () => ({ pas: 'une liste' }) }); const s = await mod.lancerExperience(demande(), y.deps)
  ok(s.refus === 'premiere_vente_inconnue' && !y.c.ecr, 'ventes illisibles : fermé')
  const z = fab({ evenements: undefined }); const t = await mod.lancerExperience(demande(), z.deps)
  ok(t.refus === 'dependances', 'doublure manquante : fermé')
}
{ // registre coupé : ni événement ni succès
  const x = fab(); x.deps.magasin.ecrire = async () => { throw new Error('disque plein') }
  const r = await mod.lancerExperience(demande(), x.deps)
  ok(r.refus === 'magasin_indisponible' && !x.c.ev.length, 'écriture impossible : aucun événement')
}
{ // conclusion : mesure complète, période absente, coût dépassé, non démarrée, arrêt forcé
  const x = fab(); await mod.lancerExperience(demande(), x.deps)
  const r = await mod.conclureExperience({ id: 'exp-essai-x', mesure: { valeur: 0.3, source: 'mesure fictive', periode: '2026-10', cout_eur: 2 } }, x.deps)
  const b = r.experience?.bilan
  ok(r.experience?.etat === 'conclue' && r.experience.succes === null && b?.inference?.jugement === 'amélioration' && b.observation.periode === '2026-10' && b.limites.length >= 2, 'mesure complète : conclue, amélioration jugée, succès non décidé, limites')
  ok(!x.c.drap, 'aucun drapeau basculé')
  const r2 = await mod.conclureExperience({ id: 'exp-essai-x', mesure: { valeur: 0.9, source: 's', periode: 'p' } }, x.deps)
  ok(r2.deja === true && r2.experience.bilan.observation.valeur === 0.3, 'conclue : plus modifiée')
  const y = fab(); await mod.lancerExperience(demande(), y.deps)
  const p = await mod.conclureExperience({ id: 'exp-essai-x', mesure: { valeur: 0.3, source: 'mesure fictive' } }, y.deps)
  ok(p.experience?.conclusion === 'non mesuré' && p.experience.etat === 'arrêtée' && p.experience.succes === false && p.experience.suspendue === true && /période/.test(p.experience.arret.motif), 'période absente : non mesuré, suspendue')
  ok(y.c.ev.at(-1)?.type === 'suspension', 'suspension signalée')
  const z = fab(); await mod.lancerExperience(demande(), z.deps)
  const q = await mod.conclureExperience({ id: 'exp-essai-x', mesure: { valeur: 0.3, source: 's', periode: 'p', cout_eur: 50 } }, z.deps)
  ok(q.experience?.etat === 'arrêtée' && /coût/.test(q.experience.conclusion) && q.experience.bilan, 'coût dépassé : arrêtée, bilan gardé')
  const w = fab(); await mod.lancerExperience(demande({ accord_benj: undefined }), w.deps)
  const v = await mod.conclureExperience({ id: 'exp-essai-x', mesure: { valeur: 0.3, source: 's', periode: 'p' } }, w.deps)
  ok(v.refus === 'non_demarree' && w.m.get('experience-exp-essai-x').etat === 'proposée', 'proposée : on ne conclut pas')
  const u = fab(); await mod.lancerExperience(demande(), u.deps)
  const f = await mod.arreterExperience({ id: 'exp-essai-x', motif: 'ordre de Benj (essai)' }, u.deps)
  ok(f.experience?.etat === 'arrêtée' && f.experience.conclusion === 'non mesuré' && f.experience.succes === false, 'arrêt forcé : arrêtée, non mesuré')
  const f2 = await mod.arreterExperience({ id: 'exp-essai-x', motif: 'encore' }, u.deps)
  ok(f2.deja === true, 'arrêt répété : deja')
  const f3 = await mod.arreterExperience({ id: 'exp-essai-x', motif: 'ordre (essai)' }, fab().deps)
  ok(f3.refus === 'inconnue', 'id inconnu : refusé')
  const g = fab(); await mod.lancerExperience(demande(), g.deps)
  const h = await mod.arreterExperience({ id: 'exp-essai-x', motif: `écrire à ${FAUX_MAIL}` }, g.deps)
  ok(h.refus === 'motif' && g.m.get('experience-exp-essai-x').etat === 'en cours', 'motif contenant une adresse : refusé, rien changé')
  const t1 = mod.bilanEnTexte(r.experience), t2 = mod.bilanEnTexte(p.experience)
  ok(/## Observation/.test(t1) && /## Inférence/.test(t1) && /## Décision/.test(t1) && /Rien de mesuré/.test(t2), 'bilan en texte : trois sections, ou « rien de mesuré »')
}
console.log(`\n${n - ko}/${n} essais complémentaires verts`)
process.exitCode = ko ? 1 : 0
