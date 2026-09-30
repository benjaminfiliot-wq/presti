// scripts/fixtures/026-pilotage/s/contrat-vues.mjs — le schéma exécutable des réponses de GET /api/controle/station?vue=…
// (tableau « Contrat des vues » de 026-092, décision Claw3D du 25/09, contre-revue du 25/09 au soir), écrit par Claude Code
// en 026-067. Un seul contrat, importé par station-route-qa (026-067) et par le juge d'écran (026-104, 026-172).
//
//   validerVue(reponse, { vue, salle?, nom?, verdict? }) → string[]   (vide : conforme)
//   validerReglages(reponse) → string[]                               (GET /api/controle/station/reglages, §5.5)
//   PIEGES : [{ nom, raison, fabriquer(jeux) → { reponse, opts } }] — chacun doit être refusé (JS-3 de la preuve)
//
// La forme d'une réponse : { vue, role: 'direction' | 'lecture', a, source, cache?, valeur, erreur?, manque? }. Quand
// `valeur` est null, `erreur` ou `manque` dit pourquoi. Jamais un nombre sans source, jamais une valeur numérique nue à la
// place d'une enveloppe.
//
// L'enveloppe : { valeur, source, a, cache?, erreur?, manque? }. La garde par sous-partie (DOMAINE_DE de
// lib/pilotage/station.ts, recopiée ici en DOMAINES_ATTENDUS) range chaque objet sous son domaine ; une sous-partie
// refusée devient EXACTEMENT { valeur: null, nonMesure: true, raison: 'hors périmètre' } — jamais 0, jamais [] ; une vue
// entière refusée garde en plus `source` et `a`. Les chemins suivent les clés des objets, `valeur` sauté : la sous-partie
// `version` de `barre` dans `direct` est « direct.barre.version », la sous-partie `argent` de la salle Commandement est
// « salle.commandement.argent ».
//
// Ce que 026-092 laisse ouvert et que ce contrat FIXE (pour que trier puisse refuser l'argent sans vider l'écran) :
//   · direct.equipage.valeur = { agents, reunionEnCours, couts } : le coût de chaque agent sort des cartes (aucune carte
//     ne porte cout_mois_eur) et va dans l'enveloppe `couts` (comptabilite) ;
//   · direct.commandement.valeur = { objectif, missions (hors encaisse_eur), succes, tousSucces, compteRendu, argent } :
//     le niveau et la mission en euros vont dans l'enveloppe `argent` (comptabilite) ;
//   · direct.tapis.valeur = { etapes (hors paye), rejet, paye } : l'étape PAYÉ va dans l'enveloppe `paye` (comptabilite) ;
//   · direct.carte.valeur = { lignes, experience, paliers, nuit, egaliseur, departements }, et lignes.valeur =
//     { contenu, sites, packs }, chacune une enveloppe ;
//   · agent.valeur porte `argent` (enveloppe, comptabilite) : cout_mois_eur et coutParTache ;
//   · salle=recettes : `packs` est une enveloppe ; salle=tresorerie : `parNature` est une enveloppe ; salle=machines :
//     `usine` et `ia` sont des enveloppes ; salle=presti : `mrr` (comptabilite) et `tickets` (support : { nombre } seul) ;
//     salle=studio : `montants` (comptabilite) ; salle=commandement : `argent` (comptabilite) ;
//   · chaque vue de salle PEUT porter `active_auj` (ACTIVE AUJ., enveloppe { minutes }, 026-178).
// Les salles sans lecteur rendent { valeur: null, source: 'a_venir', manque: 'arrive avec sa fiche' } jusqu'à 026-178,
// puis leur forme ; `ecommerce` rend { valeur: null, source: 'reservee', manque: 'Branche e-commerce réservée : rien
// n’est construit.' }, et rien d'autre, jamais.
// Le texte de prospect (texte_recu, reponse_envoyee, reponses) n'est permis que dans salle=standard et agent&nom=repondeur.
// Nulle part un champ nommé texte_brut, destinataire, entreprise, email ou telephone ; nulle part une adresse e-mail hors de
// ces deux vues ; un texte de bulle, de bandeau, de fil ou de carte (texte, titre, activite, lignes) ne porte ni « @ », ni
// 9 chiffres de suite, ni « http ».

// ── Listes fermées ───────────────────────────────────────────────────────────────────────────────────────────────────────
export const CLES_SALLES = ['commandement', 'reunion', 'radar', 'redaction', 'envois', 'standard', 'atelier', 'usine', 'recettes', 'tresorerie', 'crieur', 'studio', 'experience', 'machines', 'chantier', 'audience', 'securite', 'presti', 'observatoire', 'repos']
export const CLES_SALLE = [...CLES_SALLES, 'ecommerce']
export const SALLES_PANNEAU = ['recettes', 'tresorerie', 'usine', 'atelier', 'reunion', 'envois', 'experience', 'standard', 'redaction', 'machines']
export const SANS_LECTEUR = ['commandement', 'radar', 'crieur', 'studio', 'chantier', 'audience', 'securite', 'presti', 'observatoire', 'repos']
export const ARRIVE = 'arrive avec sa fiche'
export const MANQUE_RESERVEE = 'Branche e-commerce réservée : rien n’est construit.'
export const HORS = Object.freeze({ valeur: null, nonMesure: true, raison: 'hors périmètre' })
export const CLES_REGLAGES = ['theme', 'mise_en_page', 'nuit', 'equipage', 'salles', 'couleurs', 'affichage']
export const CHAMPS_INTERDITS = ['texte_brut', 'destinataire', 'entreprise', 'email', 'telephone']
export const COULEURS = ['rouge', 'orange', 'jaune', 'bleu']
export const TYPES_BANDEAU = ['commande_payee', 'pack_paye', 'reponse_oui']
const D = (x) => x
export const DOMAINES_ATTENDUS = Object.freeze({
  'direct': 'sante',
  'direct.barre': 'sante', 'direct.barre.version': 'sante', 'direct.barre.sante': 'sante', 'direct.barre.erreurs': 'sante',
  'direct.barre.commandes_mois': 'comptabilite', 'direct.barre.sites_en_ligne': 'clients',
  'direct.equipage': 'sante', 'direct.equipage.couts': 'comptabilite',
  'direct.attention': 'sante',
  'direct.commandement': 'sante', 'direct.commandement.argent': 'comptabilite',
  'direct.tapis': 'sante', 'direct.tapis.paye': 'comptabilite',
  'direct.bandeau': 'comptabilite',
  'direct.carte': 'sante', 'direct.carte.lignes': 'sante', 'direct.carte.lignes.contenu': 'sante', 'direct.carte.lignes.sites': 'clients',
  'direct.carte.lignes.packs': 'comptabilite', 'direct.carte.experience': 'comptabilite', 'direct.carte.paliers': 'sante', 'direct.carte.nuit': 'sante',
  'direct.carte.paliers.commandement': 'comptabilite',
  'direct.carte.egaliseur': 'sante', 'direct.carte.departements': 'sante',
  'fil': 'sante', 'agent': 'sante', 'agent.argent': 'comptabilite',
  'salle.recettes': 'comptabilite', 'salle.recettes.packs': 'comptabilite', 'salle.tresorerie': 'comptabilite', 'salle.tresorerie.parNature': 'comptabilite',
  'salle.usine': 'clients', 'salle.atelier': 'sante', 'salle.reunion': 'sante', 'salle.envois': 'sante', 'salle.experience': 'comptabilite',
  'salle.standard': 'sante', 'salle.redaction': 'sante', 'salle.machines': 'sante', 'salle.machines.usine': 'sante', 'salle.machines.ia': 'sante',
  'salle.machines.ia.cout_jour_eur': 'comptabilite',
  'salle.commandement': 'sante', 'salle.commandement.argent': 'comptabilite', 'salle.radar': 'sante', 'salle.crieur': 'sante',
  'salle.studio': 'sante', 'salle.studio.montants': 'comptabilite', 'salle.chantier': 'sante', 'salle.audience': 'audience', 'salle.securite': 'securite',
  'salle.presti': 'clients', 'salle.presti.mrr': 'comptabilite', 'salle.presti.tickets': 'support',
  'salle.observatoire': 'sante', 'salle.repos': 'sante', 'salle.ecommerce': 'sante',
})
/** Les sous-parties d'argent et de clients de `direct` (SV-16) : sous « santé sans comptabilité », toutes hors périmètre. */
export const ARGENT_DIRECT = ['direct.barre.commandes_mois', 'direct.equipage.couts', 'direct.commandement.argent', 'direct.tapis.paye', 'direct.bandeau', 'direct.carte.lignes.packs', 'direct.carte.experience', 'direct.carte.paliers.commandement']
export const CLIENTS_DIRECT = ['direct.barre.sites_en_ligne', 'direct.carte.lignes.sites']
export const objetDe = (vue, salle) => (vue === 'salle' ? `salle.${salle ?? ''}` : vue)
/** Le domaine d'un chemin : le sien, sinon celui de son parent le plus proche. */
export function domaineDe(chemin) {
  for (let c = chemin; c; c = c.includes('.') ? c.slice(0, c.lastIndexOf('.')) : '') if (DOMAINES_ATTENDUS[c]) return DOMAINES_ATTENDUS[c]
  return 'sante'
}

// ── Petits validateurs ───────────────────────────────────────────────────────────────────────────────────────────────────
const objet = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const estIso = (x) => typeof x === 'string' && Number.isFinite(Date.parse(x))
const RE_EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
const TEXTE_PIEGE = (t) => (t.includes('@') ? '« @ »' : /\d{9}/.test(t) ? '9 chiffres de suite' : /http/i.test(t) ? '« http »' : null)
export const estHors = (x) => objet(x) && x.valeur === null && x.nonMesure === true && x.raison === 'hors périmètre'
const T = {
  texte: ({ vide = false, sur = false, max = null } = {}) => (c, x, E) => {
    if (typeof x !== 'string') return E.push(`${c} : texte attendu (${x === null ? 'null' : typeof x})`)
    if (!vide && !x.trim()) E.push(`${c} : texte vide`)
    if (max !== null && x.length > max) E.push(`${c} : ${x.length} signes, ${max} au plus`)
    if (sur) { const p = TEXTE_PIEGE(x); if (p) E.push(`${c} : texte qui porte ${p}`) }
  },
  nombre: ({ entier = false, min = null } = {}) => (c, x, E) => {
    if (typeof x !== 'number' || !Number.isFinite(x)) return E.push(`${c} : nombre attendu (${JSON.stringify(x)})`)
    if (entier && !Number.isInteger(x)) E.push(`${c} : entier attendu`)
    if (min !== null && x < min) E.push(`${c} : ${x} < ${min}`)
  },
  booleen: () => (c, x, E) => { if (typeof x !== 'boolean') E.push(`${c} : booléen attendu`) },
  iso: () => (c, x, E) => { if (!estIso(x)) E.push(`${c} : date ISO attendue (${JSON.stringify(x)})`) },
  nul: () => (c, x, E) => { if (x !== null) E.push(`${c} : null attendu`) },
  parmi: (l) => (c, x, E) => { if (!l.includes(x)) E.push(`${c} : « ${x} » hors de ${l.join(', ')}`) },
  quelconque: () => () => {},
  ou: (...ss) => (c, x, E, ctx) => {
    let premier = null
    for (const s of ss) { const e = []; s(c, x, e, ctx); if (!e.length) return; premier ??= e }
    E.push(...premier)
  },
  liste: (s, { max = null, min = 0 } = {}) => (c, x, E, ctx) => {
    if (!Array.isArray(x)) return E.push(`${c} : liste attendue`)
    if (max !== null && x.length > max) E.push(`${c} : ${x.length} éléments, ${max} au plus`)
    if (x.length < min) E.push(`${c} : ${x.length} éléments, ${min} au moins`)
    x.forEach((y, i) => s(`${c}[${i}]`, y, E, ctx))
  },
  objet: (props, facultatifs = {}, { exclus = [] } = {}) => (c, x, E, ctx) => {
    if (!objet(x)) return E.push(`${c} : objet attendu (${Array.isArray(x) ? 'liste' : typeof x === 'number' ? 'valeur numérique nue' : JSON.stringify(x)?.slice(0, 30)})`)
    for (const [k, s] of Object.entries(props)) { if (!(k in x)) E.push(`${c}.${k} absent`); else s(`${c}.${k}`, x[k], E, ctx) }
    for (const [k, s] of Object.entries(facultatifs)) if (k in x && x[k] !== undefined) s(`${c}.${k}`, x[k], E, ctx)
    for (const k of exclus) if (k in x) E.push(`${c}.${k} : clé exclue par le contrat`)
  },
  dico: (s) => (c, x, E, ctx) => { if (!objet(x)) return E.push(`${c} : objet attendu`); for (const [k, v] of Object.entries(x)) s(`${c}.${k}`, v, E, ctx) },
}
const NULL_OU = (s) => T.ou(T.nul(), s)
/** Une enveloppe au chemin `c` (qui est aussi son objet dans DOMAINES_ATTENDUS). */
const ENV = (s) => (c, x, E, ctx) => {
  if (typeof x === 'number') return E.push(`${c} : valeur numérique nue à la place d'une enveloppe`)
  if (!objet(x)) return E.push(`${c} : enveloppe attendue`)
  const refuse = ctx.verdict && ctx.verdict[domaineDe(c)] !== true
  if (estHors(x)) {
    const cles = Object.keys(x).filter((k) => !['valeur', 'nonMesure', 'raison'].includes(k))
    if (cles.length) E.push(`${c} : « hors périmètre » avec des clés en trop (${cles.join(', ')})`)
    if (ctx.verdict && !refuse) E.push(`${c} : « hors périmètre » alors que le domaine ${domaineDe(c)} est permis`)
    return
  }
  if (refuse) {
    const v = x.valeur
    return E.push(`${c} : domaine ${domaineDe(c)} refusé : { valeur: null, nonMesure: true, raison: 'hors périmètre' } attendu${v === 0 || (Array.isArray(v) && !v.length) ? ` (un ${JSON.stringify(v)} servi à la place d'une sous-partie refusée)` : ''}`)
  }
  if (typeof x.source !== 'string' || !x.source) E.push(`${c} : enveloppe sans source`)
  if (!estIso(x.a)) E.push(`${c} : enveloppe sans a (date ISO)`)
  if (!('valeur' in x)) return E.push(`${c} : enveloppe sans valeur`)
  if (x.valeur === null) { if (!(String(x.erreur ?? '').trim() || String(x.manque ?? '').trim())) E.push(`${c} : valeur nulle sans erreur ni manque`); return }
  if (typeof x.valeur === 'number' && s !== NOMBRE && s !== ENTIER) return E.push(`${c} : valeur numérique nue`)
  s(c, x.valeur, E, ctx)
}
const NOMBRE = T.nombre(), ENTIER = T.nombre({ entier: true, min: 0 })
const SUR = T.texte({ sur: true, vide: true, max: 400 })
const SUR_NOM = T.texte({ sur: true })

/** Une valeur brute financière conserve son type pour le fondateur ; HORS est exact et réservé au domaine refusé.
 * Une absence null reste une absence, sans inventer de mesure ni de droit supplémentaire. */
const BRUT_PROTEGE = (schema) => (c, x, E, ctx) => {
  const refuse = ctx.verdict && ctx.verdict[domaineDe(c)] !== true
  if (x === null) return schema(c, x, E, ctx)
  if (estHors(x)) {
    const cles = Object.keys(x).filter((k) => !['valeur', 'nonMesure', 'raison'].includes(k))
    if (cles.length) E.push(`${c} : « hors périmètre » avec des clés en trop (${cles.join(', ')})`)
    if (ctx.verdict && !refuse) E.push(`${c} : « hors périmètre » alors que le domaine ${domaineDe(c)} est permis`)
    return
  }
  if (refuse) return E.push(`${c} : domaine ${domaineDe(c)} refusé : « hors périmètre » attendu`)
  schema(c, x, E, ctx)
}

// ── Les formes ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const COMPTEUR = T.objet({ cle: T.texte(), libelle: T.texte(), texte: SUR, ton: T.parmi(['alerte', 'normal', 'muet']), source: T.texte() })
const BARRE = T.objet({
  compteurs: T.liste(COMPTEUR), auto: T.objet({ actif: T.booleen(), texte: T.texte() }), cloche: NULL_OU(ENTIER), heure: T.texte(), jour: T.texte(), nuit: T.booleen(),
  version: ENV((c, x, E) => { if (typeof x !== 'string' || !(x === 'dev' || /^[0-9a-f]{7}$/i.test(x))) E.push(`${c} : 7 caractères du commit ou « dev » attendus (${JSON.stringify(x)})`) }),
  sante: ENV(T.objet({ etat: T.parmi(['en ligne', 'dégradée', 'hors ligne']), raison: NULL_OU(T.texte({ sur: true })) })),
  erreurs: ENV(ENTIER), commandes_mois: ENV(ENTIER), sites_en_ligne: ENV(ENTIER),
})
const POSITION = T.objet({ salle: T.parmi(CLES_SALLES), motif: T.parmi(['porte', 'tache', 'reunion', 'pause', 'panne']) })
const MODELE = T.objet({ texte: T.texte(), source: T.parmi(['vu', 'prevu', 'aucun']) })
const AGENT_CARTE = (c, x, E, ctx) => {
  if (objet(x) && !('salle' in x) && !('point' in x)) return E.push(`${c} : agent sans salle ni point`)
  T.objet({ nom: T.texte(), libelle: T.texte(), etat: T.texte(), point: T.parmi(['cyan', 'jaune', 'rouge', 'gris']), salle: T.parmi(CLES_SALLES), position: POSITION, modele: MODELE, activite: SUR }, {}, { exclus: ['cout_mois_eur'] })(c, x, E, ctx)
}
const EQUIPAGE = T.objet({ agents: T.liste(AGENT_CARTE), reunionEnCours: T.booleen(), couts: ENV(T.liste(T.objet({ nom: T.texte(), cout_mois_eur: NULL_OU(NOMBRE) }))) })
const GESTE = T.objet({ type: T.parmi(['decisions', 'appels', 'ouvrir']) })
const CARTE_AT = T.objet({ cle: T.texte(), couleur: T.parmi(COULEURS), nombre: ENTIER, titre: SUR_NOM, geste: GESTE, agent: NULL_OU(T.texte()) })
const ATTENTION = T.objet({ cartes: T.liste(CARTE_AT, { max: 7 }), total: ENTIER, vide: NULL_OU(T.texte()) })
const MISSION = T.objet({ cle: T.texte(), libelle: T.texte(), valeur: NOMBRE, cible: NOMBRE, texte: T.texte(), atteinte: T.booleen() })
const SUCCES = T.objet({ cle: T.texte(), libelle: T.texte(), debloque: T.booleen(), le: NULL_OU(T.iso()) })
const OBJECTIF = NULL_OU(T.objet({ libelle: T.texte(), par: T.parmi(['PAR LE CHEF']), progression: NULL_OU(NOMBRE) }))
const COMMANDEMENT = T.objet({
  objectif: OBJECTIF, missions: (c, x, E, ctx) => { T.liste(MISSION)(c, x, E, ctx); if (Array.isArray(x) && x.some((m) => m?.cle === 'encaisse_eur')) E.push(`${c} : la mission en euros hors de l'enveloppe argent`) },
  succes: T.quelconque(), tousSucces: T.liste(SUCCES, { max: 4 }), compteRendu: T.liste(SUR, { max: 3 }),
  argent: ENV(T.objet({ niveau: T.objet({ lv: ENTIER, xp: ENTIER, texte: T.texte() }), missions: T.liste(MISSION) })),
}, {}, { exclus: ['niveau'] })
const ETAPE = T.objet({ cle: T.texte(), libelle: T.texte(), jour: ENTIER, source: T.texte() })
const TAPIS = T.objet({
  etapes: (c, x, E, ctx) => { T.liste(ETAPE)(c, x, E, ctx); if (Array.isArray(x) && x.some((e) => e?.cle === 'paye')) E.push(`${c} : l'étape PAYÉ hors de l'enveloppe paye`) },
  rejet: T.objet({ nombre: ENTIER, tauxPass: NULL_OU(NOMBRE) }), paye: ENV(NULL_OU(ETAPE)),
})
const BANDEAU = T.objet({ elements: T.liste(T.objet({ id: ENTIER, le: T.iso(), type: T.parmi(TYPES_BANDEAU), texte: SUR }), { max: 10 }) })
const LIGNE = T.objet({ etapes: T.liste(ETAPE) })
const XP = T.objet({ barre: NULL_OU(T.texte()), texte: T.texte(), sur: T.parmi([30]), statut: NULL_OU(T.texte()) })
const PALIER = NULL_OU(T.objet({ lv: ENTIER, texte: T.texte() }))
const DEPARTEMENT = T.objet({ departement: T.texte(), trouves: ENTIER, contactes: ENTIER, oui: ENTIER })
const DEPARTEMENTS = (c, x, E, ctx) => {
  T.liste(DEPARTEMENT)(c, x, E, ctx)
  if (Array.isArray(x)) for (const [i, d] of x.entries()) { const trop = objet(d) ? Object.keys(d).filter((k) => !['departement', 'trouves', 'contactes', 'oui'].includes(k)) : []; if (trop.length) E.push(`${c}[${i}] : colonnes en trop (${trop.join(', ')}) : agrégé, jamais nominatif`) }
}
const CARTE = T.objet({
  lignes: ENV(T.objet({ contenu: ENV(LIGNE), sites: ENV(LIGNE), packs: ENV(LIGNE) })), experience: ENV(XP), paliers: ENV(T.dico((c, x, E, ctx) => domaineDe(c) === 'comptabilite' ? BRUT_PROTEGE(PALIER)(c, x, E, ctx) : PALIER(c, x, E, ctx))), nuit: ENV(T.booleen()),
  egaliseur: ENV(T.liste(ENTIER, { min: 12, max: 12 })), departements: ENV(DEPARTEMENTS),
})
const DIRECT = T.objet({ barre: ENV(BARRE), equipage: ENV(EQUIPAGE), attention: ENV(ATTENTION), commandement: ENV(COMMANDEMENT), tapis: ENV(TAPIS), bandeau: ENV(BANDEAU), carte: ENV(CARTE) })
const BULLE = T.objet({ id: ENTIER, le: T.iso(), agent: T.texte(), pastille: T.texte(), type: T.texte(), texte: SUR }, { lignes: T.liste(SUR), cible: NULL_OU(T.texte()), cibleLibelle: NULL_OU(T.texte()) })
const FIL = T.objet({ bulles: T.liste(BULLE), dernier_id: NULL_OU(ENTIER) })
const APERCU = NULL_OU((c, x, E) => { if (typeof x !== 'string') return E.push(`${c} : lien attendu`); if (/\/object\/public\//.test(x)) E.push(`${c} : adresse publique de bucket`) })
const PROSPECT = (c, x, E, ctx) => { if (!ctx.prospect) E.push(`${c} : texte de prospect hors de salle=standard et agent&nom=repondeur`) }
const ACTIVE = { active_auj: ENV(T.objet({ minutes: ENTIER })) }
const SALLE = {
  recettes: T.objet({ jours: T.liste(T.objet({ jour: T.texte(), agents_eur: NOMBRE, hors_agents_eur: NOMBRE }), { max: 31 }), sites: T.objet({ agents: T.objet({ commandes: ENTIER, montant_eur: NOMBRE }), hors_agents: T.objet({ commandes: ENTIER, montant_eur: NOMBRE }) }), packs: ENV(T.quelconque()) }, ACTIVE),
  tresorerie: T.objet({ parAgent: T.liste(T.objet({ nom: T.texte(), cout_mois_eur: NOMBRE, appels: ENTIER })), parTache: T.liste(T.quelconque(), { max: 20 }), modeles: T.liste(T.objet({ fournisseur: T.texte(), modele: T.texte(), appels: ENTIER, eur: NOMBRE })), total_modeles_eur: NOMBRE, abonnements: T.liste(T.objet({ fournisseur: T.texte(), libelle: T.texte(), ttc_eur: NOMBRE, date_facture: T.texte() })), parNature: ENV(T.dico(NOMBRE)) }, ACTIVE, { exclus: ['credit'] }),
  usine: T.objet({ commandes: T.liste(T.objet({ id: T.texte(), etape: T.parmi(['payee', 'generee', 'validee', 'en_ligne', 'retiree']), depuis: T.iso(), apercu: APERCU }), { max: 20 }), aValider: ENTIER }, ACTIVE),
  atelier: T.objet({ maquettes: T.liste(T.objet({ id: T.texte(), statut: T.texte(), le: T.iso(), apercu: APERCU })), rejet: ENTIER, tauxPass: NULL_OU(NOMBRE) }, ACTIVE),
  reunion: T.objet({ prochaine_le: T.iso(), enCours: T.booleen(), derniere: NULL_OU(T.objet({ jour: T.texte(), statut: T.texte(), lignes: T.liste(SUR, { max: 5 }) })), idees: T.liste(T.objet({ cle: T.texte(), question: SUR_NOM, statut: T.texte() }), { max: 3 }) }, ACTIVE),
  envois: T.objet({ palier: NULL_OU(T.texte()), parCanal: T.liste(T.quelconque()), parTechnologie: T.liste(T.quelconque()), envois: T.liste(T.quelconque()), rejets: ENTIER, anomalies: T.liste(T.quelconque()), vide: NULL_OU(T.texte()), gestes: T.objet({ envoi_froid: T.booleen(), epreuve_passee: T.booleen(), epreuve_le: NULL_OU(T.iso()), mesure_a_sec: T.booleen(), notice_verifiee_le: NULL_OU(T.iso()), technologies_pause: T.liste(T.texte()), modeles_suspendus: T.liste(T.texte()) }, {}, { exclus: ['boites_pause'] }) }, ACTIVE, { exclus: ['parBoite'] }),
  experience: T.objet({ barre: NULL_OU(T.texte()), texte: T.texte(), sur: T.parmi([30]) }, ACTIVE),
  standard: T.objet({ parClasse: T.liste(T.objet({ classe: T.texte(), nombre: ENTIER })), reponses: T.liste(T.objet({ id: T.texte(), recu_le: T.iso(), classe: T.texte() }), { max: 10 }) }, ACTIVE),
  redaction: T.objet({ variantes: T.dico(T.objet({ contacts: ENTIER, oui: ENTIER })), envois: T.liste(T.objet({ id: T.texte(), canal: T.texte(), verdicts: T.quelconque() })), rejets: ENTIER, modeles_suspendus: T.liste(T.texte()) }, ACTIVE),
  machines: T.objet({
    agents: T.liste(T.objet({ nom: T.texte(), etat: T.texte() })), crons: T.liste(T.objet({ nom: T.texte(), ok: T.booleen() })),
    usine: ENV(T.objet({ mesure: T.texte(), le: T.iso() })),
    ia: ENV(T.objet({ fournisseurs: T.liste(T.objet({ objet: T.texte(), resume: SUR, le: T.iso() })), bascules: T.liste(T.objet({ resume: SUR, le: T.iso() }), { max: 20 }), cout_jour_eur: BRUT_PROTEGE(NOMBRE), le: T.iso() })),
  }, ACTIVE),
  // Salles lues à partir de 026-178 (forme propre) :
  commandement: T.objet({ objectif: OBJECTIF, missions: T.liste(MISSION), tousSucces: T.liste(SUCCES, { max: 4 }), compteRendu: T.liste(SUR, { max: 3 }), consignes: T.liste(T.objet({ id: ENTIER, le: T.iso(), texte: SUR, cible: NULL_OU(T.texte()) })), argent: ENV(T.quelconque()) }, ACTIVE, { exclus: ['niveau'] }),
  radar: T.objet({ annonceurs: T.liste(T.objet({ categorie: NULL_OU(T.texte()), pubs: ENTIER })), requetes: ENTIER, egaliseur: T.liste(ENTIER, { min: 12, max: 12 }) }, { ...ACTIVE, crons: T.liste(T.quelconque()) }),
  crieur: T.objet({ publie_mois: NULL_OU(ENTIER), programmees: NULL_OU(ENTIER), brouillons: NULL_OU(ENTIER) }, ACTIVE, { exclus: ['texte'] }),
  studio: T.objet({ packs: T.liste(T.objet({ id: T.texte(), etape: T.texte() })), montants: ENV(T.quelconque()) }, ACTIVE, { exclus: ['prix_eur'] }),
  chantier: T.objet({ file: T.liste(T.texte()), enCours: T.liste(T.quelconque()), derniers: T.liste(T.quelconque()) }, ACTIVE),
  audience: T.objet({ pages: T.liste(T.quelconque()), campagnes: T.liste(T.quelconque()) }, ACTIVE, { exclus: ['abonnes'] }),
  securite: T.objet({ bans: ENTIER, disjoncteurs: T.liste(T.objet({ nom: T.texte() })), pause: T.objet({ active: T.booleen() }), erreurs: ENTIER }, ACTIVE),
  presti: T.objet({ artisans_actifs: ENTIER, cerveaux: T.liste(T.quelconque()), mrr: ENV(NOMBRE), tickets: ENV((c, x, E) => { if (!objet(x) || Object.keys(x).join() !== 'nombre' || !Number.isInteger(x.nombre)) E.push(`${c} : { nombre } seul attendu (un compte, jamais un contenu)`) }) }, ACTIVE),
  observatoire: T.objet({ departements: DEPARTEMENTS }, ACTIVE),
  repos: T.objet({ agents: T.liste(T.objet({ nom: T.texte() })), vide: NULL_OU(T.texte()) }, ACTIVE),
}
const AGENT = (c, x, E, ctx) => T.objet({
  nom: T.texte(), libelle: T.texte(), etat: T.texte(), point: T.parmi(['cyan', 'jaune', 'rouge', 'gris']), cadence: T.texte(), modele: MODELE,
  taches: T.liste(T.objet({ numero: NOMBRE, type: T.texte(), statut: T.parmi(['FAIT', 'REJETÉ', 'ANNULÉ', 'BLOQUÉ', 'EN COURS']), le: T.iso() })),
  argent: ENV(T.objet({ cout_mois_eur: NULL_OU(NOMBRE), coutParTache: T.liste(T.quelconque()) })),
}, { consignes: T.liste(T.quelconque()), technologies: T.liste(T.quelconque()), reponses: (cc, y, EE, cx) => { PROSPECT(cc, y, EE, cx); T.liste(T.quelconque())(cc, y, EE, cx) } }, { exclus: ['cout_mois_eur', 'coutParTache'] })(c, x, E, ctx)

// ── Parcours communs : clés interdites, e-mails, texte de prospect ──────────────────────────────────────────────────────
function parcourir(x, c, E, ctx) {
  if (typeof x === 'string') { if (!ctx.prospect && RE_EMAIL.test(x)) E.push(`${c} : une adresse e-mail`); return }
  if (!x || typeof x !== 'object') return
  for (const [k, v] of Object.entries(x)) {
    const cc = Array.isArray(x) ? `${c}[${k}]` : `${c}.${k}`
    if (CHAMPS_INTERDITS.includes(k)) E.push(`${cc} : champ interdit « ${k} »`)
    if (['texte_recu', 'reponse_envoyee'].includes(k)) PROSPECT(cc, v, E, ctx)
    parcourir(v, cc, E, ctx)
  }
}

/** Les défauts d'une réponse de la route de la station ; vide si elle est conforme. */
export function validerVue(rep, { vue, salle = null, nom = null, verdict = null } = {}) {
  const E = []
  const ctx = { verdict, prospect: (vue === 'salle' && salle === 'standard') || (vue === 'agent' && nom === 'repondeur') }
  if (!objet(rep)) return ['réponse : objet attendu']
  if (!['direct', 'fil', 'salle', 'agent'].includes(vue)) return [`vue « ${vue} » inconnue`]
  if (vue === 'salle' && !CLES_SALLE.includes(salle)) return [`salle « ${salle} » hors des 20 clés et d'ecommerce`]
  const objetV = objetDe(vue, salle)
  if (rep.vue !== vue) E.push(`vue : « ${rep.vue} », « ${vue} » attendue`)
  if (!['direction', 'lecture'].includes(rep.role)) E.push(`role : « ${rep.role} »`)
  if (typeof rep.source !== 'string' || !rep.source || !estIso(rep.a)) E.push('vue sans source ni a')
  if (typeof rep.valeur === 'number') E.push('valeur numérique nue')
  parcourir(rep, objetV, E, ctx)
  if (E.length) return E
  if (verdict && verdict[domaineDe(objetV)] !== true) {
    if (!(rep.valeur === null && rep.nonMesure === true && rep.raison === 'hors périmètre')) E.push(`${objetV} : domaine ${domaineDe(objetV)} refusé, « hors périmètre » attendu${rep.valeur === 0 || (Array.isArray(rep.valeur) && !rep.valeur.length) ? ' (un 0 ou [] servi à la place)' : ''}`)
    return E
  }
  if (vue === 'salle' && salle === 'ecommerce') {
    if (rep.valeur !== null || rep.source !== 'reservee' || rep.manque !== MANQUE_RESERVEE) E.push(`salle.ecommerce : { valeur: null, source: 'reservee', manque: '${MANQUE_RESERVEE}' } attendu, rien d'autre (reçu valeur ${JSON.stringify(rep.valeur)?.slice(0, 30)}, source ${rep.source})`)
    return E
  }
  if (rep.valeur === null) {
    if (!(String(rep.erreur ?? '').trim() || String(rep.manque ?? '').trim())) E.push(`${objetV} : valeur nulle sans erreur ni manque`)
    if (vue === 'salle' && rep.manque === ARRIVE && rep.source !== 'a_venir') E.push(`${objetV} : « arrive avec sa fiche » sans la source a_venir`)
    if (vue === 'salle' && rep.manque === ARRIVE && !SANS_LECTEUR.includes(salle)) E.push(`${objetV} : « arrive avec sa fiche » pour une salle qui a son lecteur depuis 026-092`)
    return E
  }
  const forme = vue === 'direct' ? DIRECT : vue === 'fil' ? FIL : vue === 'agent' ? AGENT : SALLE[salle]
  forme(objetV, rep.valeur, E, ctx)
  return E
}

/** GET /api/controle/station/reglages (§5.5) : { version, reglages, modifie_par, modifie_le }, clés de la liste fermée. */
export function validerReglages(rep) {
  const E = []
  T.objet({ version: ENTIER, reglages: T.dico(T.quelconque()), modifie_par: NULL_OU(T.texte()), modifie_le: NULL_OU(T.iso()) })('reglages', rep, E, {})
  if (objet(rep?.reglages)) for (const k of Object.keys(rep.reglages)) if (!CLES_REGLAGES.includes(k)) E.push(`reglages.${k} : clé hors de la liste fermée (${CLES_REGLAGES.join(', ')})`)
  return E
}

// ── Les pièges (JS-3) : chacun doit être refusé, pour la raison dite ────────────────────────────────────────────────────
const cl = (x) => JSON.parse(JSON.stringify(x))
const FOND = D({ sante: true, comptabilite: true, clients: true, securite: true, audience: true, support: true })
export const PIEGES = [
  { nom: 'vue-sans-source', raison: 'une vue sans source ni a', fabriquer: (j) => { const r = cl(j.direct); delete r.source; delete r.a; return { reponse: r, opts: { vue: 'direct' } } } },
  { nom: 'valeur-numerique-nue', raison: 'un valeur numérique nu', fabriquer: (j) => { const r = cl(j.direct); r.valeur.barre = 12; return { reponse: r, opts: { vue: 'direct' } } } },
  { nom: 'vue-valeur-nombre', raison: 'un valeur numérique nu (la vue entière)', fabriquer: (j) => { const r = cl(j.direct); r.valeur = 7; return { reponse: r, opts: { vue: 'direct' } } } },
  { nom: 'bulle-arobase', raison: 'un texte de bulle qui porte un @', fabriquer: (j) => { const r = cl(j.fil); r.valeur.bulles[0].texte = 'écrire à quelqu’un@exemple'; return { reponse: r, opts: { vue: 'fil' } } } },
  { nom: 'bulle-neuf-chiffres', raison: 'un texte de bulle qui porte 9 chiffres de suite', fabriquer: (j) => { const r = cl(j.fil); r.valeur.bulles[0].texte = 'rappeler le 0612345678'; return { reponse: r, opts: { vue: 'fil' } } } },
  { nom: 'bulle-http', raison: 'un texte de bulle qui porte http', fabriquer: (j) => { const r = cl(j.fil); r.valeur.bulles[0].texte = 'voir http://exemple.invalid'; return { reponse: r, opts: { vue: 'fil' } } } },
  { nom: 'bandeau-arobase', raison: 'un texte de bandeau qui porte un @', fabriquer: (j) => { const r = cl(j.direct); r.valeur.bandeau.valeur.elements[0].texte = 'payé par x@exemple'; return { reponse: r, opts: { vue: 'direct' } } } },
  { nom: 'activite-http', raison: 'un texte de fil (activité d’un agent) qui porte http', fabriquer: (j) => { const r = cl(j.direct); r.valeur.equipage.valeur.agents[0].activite = 'lu https://exemple.invalid'; return { reponse: r, opts: { vue: 'direct' } } } },
  { nom: 'couleur-violette', raison: 'une carte Attention d’une couleur hors des quatre', fabriquer: (j) => { const r = cl(j.direct); r.valeur.attention.valeur.cartes[0].couleur = 'violet'; return { reponse: r, opts: { vue: 'direct' } } } },
  { nom: 'huit-cartes', raison: 'plus de 7 cartes Attention', fabriquer: (j) => { const r = cl(j.direct); const c = r.valeur.attention.valeur.cartes; while (c.length < 8) c.push(cl(c[0])); return { reponse: r, opts: { vue: 'direct' } } } },
  { nom: 'agent-sans-salle-ni-point', raison: 'un agent sans salle ni point', fabriquer: (j) => { const r = cl(j.direct); delete r.valeur.equipage.valeur.agents[0].salle; delete r.valeur.equipage.valeur.agents[0].point; return { reponse: r, opts: { vue: 'direct' } } } },
  ...CHAMPS_INTERDITS.map((k) => ({ nom: `champ-${k}`, raison: `un champ nommé ${k}`, fabriquer: (j) => { const r = cl(j.direct); r.valeur.equipage.valeur.agents[0][k] = 'x'; return { reponse: r, opts: { vue: 'direct' } } } })),
  { nom: 'zero-hors-perimetre', raison: 'un 0 servi à la place d’une sous-partie refusée', fabriquer: (j) => { const r = cl(j.direct); r.valeur.barre.valeur.commandes_mois = { valeur: 0, source: 'supabase', a: r.a }; return { reponse: r, opts: { vue: 'direct', verdict: { ...FOND, comptabilite: false } } } } },
  { nom: 'tableau-vide-hors-perimetre', raison: 'un [] servi à la place d’une sous-partie refusée', fabriquer: (j) => { const r = cl(j.direct); r.valeur.equipage.valeur.couts = { valeur: [], source: 'supabase', a: r.a }; return { reponse: r, opts: { vue: 'direct', verdict: { ...FOND, comptabilite: false } } } } },
  { nom: 'ecommerce-chiffre', raison: 'un chiffre pour la salle réservée', fabriquer: (j) => ({ reponse: { ...cl(j.ecommerce), valeur: 3 }, opts: { vue: 'salle', salle: 'ecommerce' } }) },
  { nom: 'ecommerce-tableau', raison: 'un tableau pour la salle réservée', fabriquer: (j) => ({ reponse: { ...cl(j.ecommerce), valeur: [] }, opts: { vue: 'salle', salle: 'ecommerce' } }) },
  { nom: 'ecommerce-autre-manque', raison: 'une autre valeur pour la salle réservée', fabriquer: (j) => ({ reponse: { ...cl(j.ecommerce), manque: 'Bientôt' }, opts: { vue: 'salle', salle: 'ecommerce' } }) },
  { nom: 'salle-inconnue', raison: 'une clé de salle hors des 20 et d’ecommerce', fabriquer: (j) => ({ reponse: cl(j.ecommerce), opts: { vue: 'salle', salle: 'cuisine' } }) },
  { nom: 'prospect-hors-place', raison: 'du texte de prospect ailleurs que dans salle=standard ou agent&nom=repondeur', fabriquer: (j) => { const r = cl(j.standard); return { reponse: { ...r, vue: 'salle' }, opts: { vue: 'salle', salle: 'redaction' } } } },
  { nom: 'tickets-contenu', raison: 'un contenu de ticket dans la salle Presti', fabriquer: (j) => { const r = cl(j.presti); r.valeur.tickets.valeur = { nombre: 3, sujet: 'contenu' }; return { reponse: r, opts: { vue: 'salle', salle: 'presti' } } } },
  { nom: 'departements-nominatifs', raison: 'une colonne nominative dans l’Observatoire', fabriquer: (j) => { const r = cl(j.observatoire); r.valeur.departements[0].nom_affiche = 'Témoin'; return { reponse: r, opts: { vue: 'salle', salle: 'observatoire' } } } },
  { nom: 'reglage-cle-inconnue', raison: 'une clé de réglage hors de la liste fermée de §5.3', fabriquer: (j) => ({ reponse: { ...cl(j.reglages), reglages: { ...cl(j.reglages).reglages, vitesse: 2 } }, opts: { reglages: true } }) },
]
