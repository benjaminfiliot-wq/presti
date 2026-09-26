// scripts/fixtures/026-pilotage/a/jeux.mjs — l'auto-contrôle des jeux d'essai du lot a (fiche 026-012), écrit par Claude Code.
//
// Chaque fonction relit un jeu d'essai et rend la liste de ses défauts (vide = conforme). Les attendus écrits dans les jeux
// (ordre des décisions, tranches de l'entonnoir, verdicts du bilan, états des agents) sont RECALCULÉS ici par un calcul
// indépendant : un attendu recopié faux ferait passer un module faux. Servent :
//   - le témoin de chaque juge (pilotage-logique-qa --temoin, pilotage-push-qa --temoin) ;
//   - le critère JA-3 de la preuve (juges-026-pilotage-preuve --lot=a), par controleJeux ;
//   - le critère JA-6 de la preuve, par controlePartieLot (--partie=lot refusée en code 2) ;
//   - le critère JA-4 de la preuve, par controleSecrets (aucun juge du lot ne lit .env.local ni presti-secrets, lu dans le
//     source puis vérifié à l'exécution sous un piège des lectures) ; verifierJetons (aucun jeton réel dans un jeu d'essai)
//     fait partie de JA-3.
// Les jeux d'essai eux-mêmes ont été produits une fois par un générateur déterministe ; ce module ne les écrit jamais.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { A, R, LOADER, TRAVAIL, jeu, jourParis, listerFichiers, lancer, sansCommentaires, importsDe, sous, exigerSousTravail, court } from './commun.mjs'

const H = 3_600_000, MIN = 60_000, J = 24 * H
const ms = (d) => Date.parse(d)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

// ── Décisions, commandes, appels, liens ──────────────────────────────────────────────────────────────────────────────────
const CLES_DECISION = ['id', 'question', 'contexte', 'options', 'option_defaut', 'montant_cents', 'portee', 'echeance', 'cree_le', 'creee_par']
/** Validité d'une décision au sens de 026-014 (calcul indépendant du module jugé). → raison ou null */
export function fauteDecision(d) {
  const o = d.options
  if (!Array.isArray(o) || o.length < 2 || o.length > 7) return `${Array.isArray(o) ? o.length : 0} option(s)`
  const cles = o.map((x) => x.cle)
  if (cles.some((c) => typeof c !== 'string' || !c)) return 'clé vide'
  if (new Set(cles).size !== cles.length) return 'clés en double'
  if (o.some((x) => typeof x.libelle !== 'string' || x.libelle.length < 1 || x.libelle.length > 80)) return 'libellé hors de 1 à 80 signes'
  if (!cles.includes(d.option_defaut)) return 'défaut hors des clés'
  if (o.filter((x) => x.recommandee).length > 1) return 'deux options recommandées'
  return null
}
export function trierDecisionsOracle(ds) {
  const e = (x) => (x == null ? Infinity : ms(x))
  return ds.map((d, i) => ({ d, i })).sort((a, b) => ((b.d.montant_cents ?? 0) - (a.d.montant_cents ?? 0)) || (e(a.d.echeance) - e(b.d.echeance)) || (ms(a.d.cree_le) - ms(b.d.cree_le)) || (a.i - b.i)).map((x) => x.d)
}
export function verifierDecisions() {
  const d = jeu('decisions.json'), e = []
  if (d.valides?.length !== 8) e.push(`decisions.json : ${d.valides?.length} décisions valides, 8 attendues`)
  if (d.fautives?.length !== 6) e.push(`decisions.json : ${d.fautives?.length} fautives, 6 attendues`)
  for (const x of [...(d.valides ?? []), ...(d.fautives ?? [])]) {
    const cles = Object.keys(x).sort().join(',')
    if (cles !== [...CLES_DECISION].sort().join(',')) e.push(`décision ${x.id} : clés ${cles} hors contrat`)
    if (!UUID.test(x.id)) e.push(`décision ${x.id} : id qui n'est pas un UUID en minuscules`)
  }
  for (const x of d.valides ?? []) { const f = fauteDecision(x); if (f) e.push(`décision valide ${x.id} fautive : ${f}`) }
  for (const x of d.fautives ?? []) { if (!fauteDecision(x)) e.push(`décision fautive ${x.id} (${d.fautes?.[x.id]}) jugée valide par l'oracle`) }
  const nbOpt = (id) => d.valides.find((x) => x.id === id)?.options.length
  if (nbOpt(d.roles?.deux_options) !== 2 || nbOpt(d.roles?.trois_options) !== 3 || nbOpt(d.roles?.sept_options) !== 7) e.push('rôles : il faut une décision valide à 2, à 3 et à 7 options')
  if (!(d.fautives ?? []).some((x) => x.options.length === 8)) e.push('aucune décision fautive à 8 options (revue du 25/09)')
  if (!(d.fautives ?? []).some((x) => x.options.length === 1)) e.push('aucune décision fautive à 1 option')
  const par = (id) => d.valides.find((x) => x.id === id)
  if (par(d.roles?.argent)?.portee !== 'argent') e.push('rôle argent : portée ≠ argent')
  if (par(d.roles?.securite)?.portee !== 'securite') e.push('rôle securite : portée ≠ securite')
  if (!(par(d.roles?.sans_enjeu)?.portee === 'aucune' && !par(d.roles?.sans_enjeu)?.montant_cents)) e.push('rôle sans enjeu : portée ou montant')
  if (par(d.roles?.lire_standard)?.creee_par !== 'standardiste') e.push('rôle lire_standard : pas une carte du Standard')
  const ordre = trierDecisionsOracle(d.valides ?? []).map((x) => x.id)
  if (ordre.join() !== (d.ordre_attendu ?? []).join()) e.push(`ordre_attendu ≠ ordre recalculé (${ordre.map((x) => x.slice(7, 8)).join('')})`)
  if (d.epinglee !== ordre[6]) e.push('epinglee n’est pas la 7e décision de l’ordre')
  if (ordre.slice(0, 7).join() === (d.valides ?? []).slice(0, 7).map((x) => x.id).join()) e.push('les décisions valides sont déjà rangées : le tri ne serait pas éprouvé')
  return e
}
export function verifierCommandes() {
  const c = jeu('commandes.json'), e = []
  if (c.commandes?.length !== 4) e.push(`commandes.json : ${c.commandes?.length} commandes, 4 attendues`)
  const par = (id) => c.commandes.find((x) => x.id === c.roles?.[id])
  if (!(par('complete')?.etat === 'payee' && par('complete')?.manques.length === 0)) e.push('rôle complete')
  if (!(par('brouillon')?.etat === 'brouillon' && par('brouillon')?.manques.length > 0)) e.push('rôle brouillon')
  if (!(par('incomplete')?.etat === 'payee' && par('incomplete')?.manques.length >= 2 && par('incomplete')?.tel)) e.push('rôle incomplete (payée, deux manques au moins, un téléphone)')
  if (!(['payee', 'generee'].includes(par('sans_telephone')?.etat) && par('sans_telephone')?.manques.length > 0 && par('sans_telephone')?.tel === null)) e.push('rôle sans_telephone')
  if (!(par('incomplete')?.manques[0]?.length > 80)) e.push('le premier manque de la commande incomplète doit dépasser 80 signes (coupure éprouvée)')
  for (const x of c.commandes ?? []) if (!/Témoin/.test(x.nom)) e.push(`commande ${x.id} : nom sans « Témoin »`)
  return e
}
export function verifierAppels() {
  const a = jeu('appels.json'), e = []
  const par = (r) => a.lignes?.find((x) => x.id === a.roles?.[r])
  const rdv = par('rdv'), rep = par('reponse'), inc = par('inconnue')
  if (!(rdv?.source === 'rdv' && rdv.creneau === '2026-10-30T13:30:00.000Z')) e.push('rôle rdv : réservation du 30/10 à 13 h 30 UTC attendue')
  if (!(rep?.source === 'reponse' && rep.creneau === null && rep.contexte.length > 140)) e.push('rôle reponse : contexte de plus de 140 signes attendu')
  if (rep && /@/.test(rep.contexte.slice(0, 140))) e.push('rôle reponse : une adresse dans les 140 premiers signes (hors contrat de 0108)')
  if (!(inc && !['rdv', 'reponse'].includes(inc.source))) e.push('rôle inconnue : source hors contrat attendue')
  if (new Date('2026-10-30T13:30:00.000Z').toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' }).slice(0, 5) !== '14:30') e.push('horloge : 13 h 30 UTC le 30/10 ne donne pas 14 h 30 à Paris sur cette machine')
  for (const x of a.lignes ?? []) if (!/Témoin/.test(x.prospect)) e.push(`appel ${x.id} : prospect sans « Témoin »`)
  return e
}
export function verifierLiensFuzz() {
  const f = jeu('liens-fuzz.json'), e = []
  const n = (f.piegees?.length ?? 0) + (f.neutres?.length ?? 0)
  if (n !== 200) e.push(`liens-fuzz.json : ${n} chaînes, 200 attendues`)
  const sansPiege = (f.piegees ?? []).filter((s) => !(/@/.test(s) || /\d{9}/.test(s) || /:/.test(s)))
  if (sansPiege.length) e.push(`${sansPiege.length} chaîne(s) « piégée(s) » sans @, sans 9 chiffres de suite et sans « : » : ${sansPiege.slice(0, 3).map((s) => JSON.stringify(s)).join(', ')}`)
  if (!(f.piegees ?? []).some((s) => /@/.test(s)) || !(f.piegees ?? []).some((s) => /\d{9}/.test(s)) || !(f.piegees ?? []).some((s) => /^javascript:/i.test(s))) e.push('il manque une famille de pièges (adresse, numéro, injection javascript:)')
  if (!(f.neutres ?? []).some((s) => UUID.test(s))) e.push('aucun UUID valide parmi les chaînes neutres')
  return e
}

// ── Envois, compteurs, technologies ─────────────────────────────────────────────────────────────────────────────────────
export const CLES_ENVOI = ['id', 'canal', 'technologie', 'type', 'statut', 'envoyeur', 'metier', 'commune', 'variante', 'froid', 'verdicts', 'prepare_le', 'envoye_le']
export const CHAMPS_INTERDITS_ENVOI = ['texte', 'destinataire', 'entreprise', 'profil', 'identifiant']
const CANAUX = ['formulaire_site', 'email_sollicite', 'reponse_privee', 'messagerie']
/** Les envois du jour à Paris (calcul indépendant), du plus récent au plus ancien. */
export function envoisDuJourOracle(lignes, maintenant) {
  const jour = jourParis(maintenant)
  return lignes.filter((l) => jourParis(l.envoye_le ?? l.prepare_le) === jour).sort((a, b) => ms(b.envoye_le ?? b.prepare_le) - ms(a.envoye_le ?? a.prepare_le))
}
export function verifierEnvois() {
  const v = jeu('envois.json'), e = []
  if (v.envois?.length !== 40) e.push(`envois.json : ${v.envois?.length} envois, 40 attendus`)
  for (const l of v.envois ?? []) {
    const cles = Object.keys(l)
    const interdits = cles.filter((k) => CHAMPS_INTERDITS_ENVOI.includes(k))
    if (interdits.length) e.push(`envoi ${l.id} : champ(s) interdit(s) ${interdits.join(', ')}`)
    if (cles.sort().join() !== [...CLES_ENVOI].sort().join()) e.push(`envoi ${l.id} : clés hors contrat de pilotage_envois_du_jour (${cles.join(',')})`)
    if (typeof l.metier !== 'string' || !l.metier || typeof l.commune !== 'string' || !l.commune) e.push(`envoi ${l.id} : metier ou commune manquant`)
    if (!CANAUX.includes(l.canal)) e.push(`envoi ${l.id} : canal ${l.canal} hors des quatre canaux`)
    if ((l.canal === 'formulaire_site') !== (l.technologie !== null)) e.push(`envoi ${l.id} : technologie ${l.technologie} sur ${l.canal}`)
    if (l.technologie !== null && !['contact_form_7', 'wpforms'].includes(l.technologie)) e.push(`envoi ${l.id} : technologie ${l.technologie}`)
    for (const k of ['j1', 'j3', 'second']) if (![null, 'pass', 'refus'].includes(l.verdicts?.[k])) e.push(`envoi ${l.id} : verdict ${k} = ${l.verdicts?.[k]}`)
  }
  const par = (r) => v.envois.find((x) => x.id === v.cas?.[r])
  const sv = par('sans_verdict')
  if (!(sv?.statut === 'envoye' && Object.values(sv.verdicts).includes(null) && !Object.values(sv.verdicts).includes('refus'))) e.push('cas sans_verdict : un envoi « envoye » dont un verdict vaut null, attendu')
  if (par('refus_j3')?.verdicts.j3 !== 'refus') e.push('cas refus_j3')
  if (!(par('lien_maquette_email')?.type === 'lien_maquette' && par('lien_maquette_email')?.canal === 'email_sollicite')) e.push('cas lien_maquette_email')
  if (!(par('reponse_repondeur')?.type === 'reponse' && par('reponse_repondeur')?.envoyeur === 'repondeur')) e.push('cas reponse_repondeur')
  const t = new Date(v.maintenant)
  if (jourParis(par('hier')?.envoye_le) === jourParis(t)) e.push('cas hier : il tombe le jour même à Paris')
  const mn = par('minuit_paris')
  if (!(mn && jourParis(mn.envoye_le) === jourParis(t) && mn.envoye_le.slice(0, 10) !== t.toISOString().slice(0, 10))) e.push('cas minuit_paris : attendu le jour même à Paris mais la veille en UTC')
  const jour = envoisDuJourOracle(v.envois ?? [], t)
  if (jour.length !== v.attendu?.du_jour) e.push(`du_jour : ${jour.length} recalculés, ${v.attendu?.du_jour} écrits`)
  const rejets = jour.filter((l) => Object.values(l.verdicts).includes('refus')).length
  if (rejets !== v.attendu?.rejets) e.push(`rejets : ${rejets} recalculés, ${v.attendu?.rejets} écrits`)
  const anomalies = jour.filter((l) => l.statut === 'envoye' && !['j1', 'j3', 'second'].every((k) => l.verdicts[k] === 'pass')).map((l) => l.id)
  if (anomalies.join() !== (v.attendu?.anomalies ?? []).join()) e.push(`anomalies : ${anomalies.length} recalculée(s), ${v.attendu?.anomalies?.length} écrite(s)`)
  if (!jour.some((l) => l.froid)) e.push('aucun envoi froid du jour : la phrase « vide » ne serait pas éprouvée à l’envers')
  for (const [id, p] of Object.entries(v.pieges ?? {})) {
    if (!v.envois.some((x) => x.id === id)) e.push(`piège sur un envoi inconnu ${id}`)
    if (!CHAMPS_INTERDITS_ENVOI.every((k) => typeof p[k] === 'string' && p[k])) e.push(`piège ${id} : il manque un des champs ${CHAMPS_INTERDITS_ENVOI.join(', ')}`)
    if (!/Témoin SARL/.test(p.entreprise) || !/@/.test(p.destinataire)) e.push(`piège ${id} : entreprise « Témoin SARL » et destinataire avec @ attendus`)
  }
  if (Object.keys(v.pieges ?? {}).length < 3) e.push('moins de trois lignes piégées')
  return e
}
export function verifierCompteurs() {
  const c = jeu('compteurs-canaux.json'), t = jeu('technologies.json'), e = []
  const CLES = ['canal', 'palier', 'plafond', 'utilises', 'plaintes_7j', 'avis_abus', 'stop_100', 'echecs_affilee', 'reponses_positives']
  if ((c.canaux ?? []).map((x) => x.canal).sort().join() !== [...CANAUX].sort().join()) e.push('compteurs-canaux.json : les quatre canaux attendus, une ligne chacun')
  for (const x of c.canaux ?? []) if (Object.keys(x).sort().join() !== [...CLES].sort().join()) e.push(`compteur ${x.canal} : clés hors contrat`)
  const f = c.canaux?.find((x) => x.canal === 'formulaire_site')
  if (!(f?.palier === 'P1' && f.plafond === 10 && f.utilises === 10)) e.push('formulaire_site : P1 à 10/10 attendu')
  if (c.canaux?.find((x) => x.canal === c.roles?.plafond_null)?.plafond !== null) e.push('aucun canal au plafond null')
  const CT = ['technologie', 'envois_jour', 'echecs_affilee', 'etat', 'pause_motif', 'envois_300', 'reponses_300']
  for (const x of t.technologies ?? []) if (Object.keys(x).sort().join() !== [...CT].sort().join()) e.push(`technologie ${x.technologie} : clés hors contrat`)
  const p = t.technologies?.find((x) => x.technologie === t.roles?.pause), a = t.technologies?.find((x) => x.technologie === t.roles?.active)
  if (!(p?.etat === 'pause' && p.echecs_affilee >= 3 && p.pause_motif)) e.push('technologie en pause après 3 échecs, avec motif, attendue')
  if (!(a?.etat === 'active' && a.pause_motif === null)) e.push('technologie saine attendue')
  return e
}

// ── Entonnoir et bilan ────────────────────────────────────────────────────────────────────────────────────────────────────
export function trancheOracle(lignes, maintenant, jours) {
  const fin = ms(maintenant), debut = fin - jours * J
  const dans = lignes.filter((l) => ms(l.envoye_le) > debut && ms(l.envoye_le) <= fin)
  const f = dans.filter((l) => l.froid === true)
  const ventesConnues = f.filter((l) => l.vente !== null)
  return { contacts: f.length, reponses: f.filter((l) => l.repondu).length, oui: f.filter((l) => l.oui).length, appels: f.filter((l) => l.appel).length, ventes: ventesConnues.length ? f.filter((l) => l.vente === true).length : null, chauds: dans.filter((l) => l.froid !== true).length }
}
export function verifierEntonnoir() {
  const n = jeu('entonnoir.json'), e = []
  if (n.lignes?.length !== 60) e.push(`entonnoir.json : ${n.lignes?.length} lignes, 60 attendues`)
  const chauds = new Set(n.chauds ?? [])
  if (chauds.size !== 10) e.push(`${chauds.size} contacts chauds, 10 attendus`)
  for (const l of n.lignes ?? []) {
    if (chauds.has(l.id) && l.froid !== false) e.push(`ligne chaude ${l.id} sans froid: false`)
    if (!chauds.has(l.id) && l.froid !== true) e.push(`ligne ${l.id} non listée chaude mais froid ≠ true`)
    if (l.canal === 'email') e.push(`ligne ${l.id} : canal email`)
  }
  const hf = n.lignes?.find((l) => l.id === n.hors_fenetre)
  if (!(hf && ms(n.maintenant) - ms(hf.envoye_le) > 31 * J && hf.froid === true && hf.oui)) e.push('hors_fenetre : une ligne froide de plus de 31 jours, qui a dit oui, attendue')
  for (const jours of [7, 30]) {
    const calc = trancheOracle(n.lignes ?? [], n.maintenant, jours), ecrit = n.attendu?.[`j${jours}`]
    if (JSON.stringify(calc) !== JSON.stringify(ecrit)) e.push(`j${jours} recalculé ${JSON.stringify(calc)} ≠ écrit ${JSON.stringify(ecrit)}`)
  }
  const bord = (n.lignes ?? []).filter((l) => [7, 30].some((j) => Math.abs(ms(n.maintenant) - j * J - ms(l.envoye_le)) < H))
  if (bord.length) e.push(`${bord.length} ligne(s) à moins d’une heure d’une borne de fenêtre (ambiguë)`)
  return e
}
export function bilanOracle(lignes) {
  const f = lignes.filter((l) => l.froid === true).sort((a, b) => ms(a.envoye_le) - ms(b.envoye_le)).slice(0, 100)
  const oui = f.filter((l) => l.oui).length, ventes = f.filter((l) => l.vente === true).length
  const verdict = ventes >= 1 || oui >= 4 ? 'P3' : f.length < 100 ? 'en_cours' : oui >= 1 ? 'nouveau_message' : 'arret_froid'
  return { contacts: f.length, oui, ventes, verdict }
}
export function verifierBilan() {
  const b = jeu('bilan.json'), e = []
  if (b.date?.bilan_le !== '2026-11-02') e.push('date.bilan_le : 2026-11-02 attendu (pilotage_bilan_date(), 0108)')
  if (!b.sansDate || b.sansDate.bilan_le !== null) e.push('le cas sans date doit porter bilan_le nul')
  const attendus = { 'une-vente': 'P3', 'quatre-oui': 'P3', 'deux-oui': 'nouveau_message', 'zero-oui': 'arret_froid' }
  if ((b.scenarios ?? []).map((s) => s.nom).sort().join() !== Object.keys(attendus).sort().join()) e.push('les quatre scénarios attendus : une-vente, quatre-oui, deux-oui, zero-oui')
  for (const s of b.scenarios ?? []) {
    const froids = s.lignes.filter((l) => l.froid === true)
    if (froids.length !== 100 || s.lignes.length !== 100) e.push(`${s.nom} : ${froids.length} contacts froids sur ${s.lignes.length} lignes, exactement 100 attendus`)
    const tri = [...froids].sort((x, y) => ms(x.envoye_le) - ms(y.envoye_le))
    if (jourParis(tri[0]?.envoye_le) !== '2026-10-12') e.push(`${s.nom} : premier contact le ${jourParis(tri[0]?.envoye_le)}, 12/10/2026 attendu`)
    if (jourParis(tri[99]?.envoye_le) !== '2026-10-27') e.push(`${s.nom} : 100e contact le ${jourParis(tri[99]?.envoye_le)}, 27/10/2026 attendu`)
    const parJour = {}
    for (const l of tri) parJour[jourParis(l.envoye_le)] = (parJour[jourParis(l.envoye_le)] ?? 0) + 1
    const rythme = ['12', '13', '14', '15', '16'].every((d) => parJour[`2026-10-${d}`] === 5) && ['19', '20', '21', '22', '23'].every((d) => parJour[`2026-10-${d}`] === 10) && parJour['2026-10-26'] === 20
    if (!rythme) e.push(`${s.nom} : rythme 5/jour puis 10/jour puis 20/jour non respecté (${JSON.stringify(parJour)})`)
    const o = bilanOracle(s.lignes)
    if (o.verdict !== s.attendu || s.attendu !== attendus[s.nom]) e.push(`${s.nom} : verdict recalculé ${o.verdict}, écrit ${s.attendu}`)
    if (tri.map((l) => l.id).join() === s.lignes.map((l) => l.id).join()) e.push(`${s.nom} : lignes déjà triées, le tri ne serait pas éprouvé`)
  }
  const q = b.scenarios?.find((s) => s.nom === 'quatre-oui')
  if (q && bilanOracle([...q.lignes].sort((x, y) => ms(x.envoye_le) - ms(y.envoye_le)).slice(0, 60)).verdict !== 'P3') e.push('quatre-oui : les 4 « oui » doivent tomber dans les 60 premiers contacts (P3 avant le 100e)')
  const z = b.scenarios?.find((s) => s.nom === 'zero-oui')
  if (z && bilanOracle([...z.lignes].sort((x, y) => ms(x.envoye_le) - ms(y.envoye_le)).slice(0, 60)).verdict !== 'en_cours') e.push('zero-oui : 60 contacts sans oui doivent rester en_cours')
  if (!(ms(b.apres_bilan) > ms(`${b.date?.bilan_le}T00:00:00Z`) + J)) e.push('apres_bilan doit dépasser la date du bilan')
  return e
}

// ── Agents, relevé du code, faux orchestre ───────────────────────────────────────────────────────────────────────────────
export function etatAgentOracle(a, maintenant) {
  if (a.disjoncteur_ouvert_le) return 'disjoncteur'
  if (a.en_pause) return 'pause'
  if (!a.battement_le) return 'jamais'
  const age = ms(maintenant) - ms(a.battement_le), p = a.periode_minutes * MIN
  return age > 2 * p + 2 * H ? 'panne' : age > 2 * p ? 'muet' : 'actif'
}
export function verifierAgents() {
  const g = jeu('agents.json'), e = []
  if (g.agents?.length !== 6) e.push(`agents.json : ${g.agents?.length} agents, 6 attendus`)
  const CLES = ['nom', 'libelle', 'en_pause', 'pause_motif', 'battement_le', 'periode_minutes', 'disjoncteur_ouvert_le', 'cout_mois_eur']
  for (const a of g.agents ?? []) {
    if (Object.keys(a).sort().join() !== [...CLES].sort().join()) e.push(`agent ${a.nom} : clés hors contrat de pilotage_agents()`)
    const calc = etatAgentOracle(a, g.maintenant)
    if (calc !== g.attendu?.etats?.[a.nom]) e.push(`agent ${a.nom} : état recalculé ${calc}, écrit ${g.attendu?.etats?.[a.nom]}`)
  }
  const etats = new Set(Object.values(g.attendu?.etats ?? {}))
  if (etats.size !== 6) e.push('les six états (actif, muet, panne, jamais, pause, disjoncteur) doivent être représentés, un chacun')
  const rang = ['panne', 'disjoncteur', 'muet', 'pause', 'jamais', 'actif']
  const ordre = [...(g.agents ?? [])].sort((x, y) => rang.indexOf(g.attendu.etats[x.nom]) - rang.indexOf(g.attendu.etats[y.nom]) || x.nom.localeCompare(y.nom)).map((a) => a.nom)
  if (ordre.join() !== (g.attendu?.ordre ?? []).join()) e.push(`ordre écrit ${g.attendu?.ordre} ≠ ordre recalculé ${ordre}`)
  const v = g.agents?.find((a) => a.nom === g.attendu?.cout_3_2), s = g.agents?.find((a) => a.nom === g.attendu?.cout_nul)
  if (v?.cout_mois_eur !== 3.2 || s?.cout_mois_eur !== null) e.push('coûts : un agent à 3,2 € et un agent au coût nul attendus')
  const f = g.agents?.find((a) => a.nom === 'facteur')
  if (f && ms(g.maintenant) - ms(f.battement_le) !== 131 * MIN) e.push('facteur : battement de 2 h 11 attendu')
  return e
}
export const CLES_SNAPSHOT = ['version', 'genere_le', 'file', 'en_cours', 'fait', 'refusees', 'derniers', 'prs', 'prs_raison', 'attention']
export function verifierSnapshot() {
  const s = jeu('snapshot-code.json'), e = []
  const r = s.releve ?? {}
  const hors = Object.keys(r).filter((k) => !CLES_SNAPSHOT.includes(k))
  if (hors.length) e.push(`relevé : clé(s) hors du type SnapshotCode : ${hors.join(', ')}`)
  if (r.version !== 1) e.push('relevé : version 1 attendue')
  if (!Array.isArray(r.attention) || r.attention.length !== 3) e.push('relevé : 3 lignes d’attention attendues')
  for (const l of r.attention ?? []) if (!/`[^`]+`\s*$/.test(l)) e.push(`attention sans commande finale entre accents graves : ${l}`)
  const vieux = r.en_cours?.find((x) => x.id === s.verrou_vieux)
  if (!(vieux && ms(s.maintenant) - ms(vieux.depuis) === 75 * MIN)) e.push('verrou_vieux : une tâche en cours depuis 75 min attendue')
  if (r.en_cours?.some((x) => x.id !== s.verrou_vieux && ms(s.maintenant) - ms(x.depuis) > 60 * MIN)) e.push('une seconde tâche en cours depuis plus de 60 min (ambigu)')
  if (ms(s.maintenant) - ms(s.publie_le_vieux) !== 3 * H) e.push('publie_le_vieux : 3 h avant maintenant attendu')
  if (ms(s.maintenant) - ms(s.publie_le_frais) > 60 * MIN) e.push('publie_le_frais : moins d’une heure attendue')
  const chaines = JSON.stringify(r).match(/"(?:[^"\\]|\\.)*"/g) ?? []
  if (chaines.some((c) => c.length - 2 > 200)) e.push('relevé : une chaîne de plus de 200 signes')
  return e
}
export const ORCHESTRE_ESSAI = path.join(A, 'orchestre')
/** Le bloc « ## Attention (n) » d'un digest : { n, lignes } (lignes sans leur puce « - »), ou null. */
export function blocAttention(digest) {
  const m = /^## Attention \((\d+)\)\s*$/m.exec(digest)
  if (!m) return null
  const suite = digest.slice(m.index + m[0].length).split(/\r?\n/)
  const lignes = []
  for (const l of suite) { if (/^#{1,2} /.test(l)) break; if (l.trim()) lignes.push(l.replace(/^\s*[-*]\s+/, '').trim()) }
  return { n: Number(m[1]), lignes }
}
export function verifierOrchestre() {
  const O = ORCHESTRE_ESSAI, e = []
  const md = (d) => (fs.existsSync(path.join(O, d)) ? fs.readdirSync(path.join(O, d)).filter((f) => f.endsWith('.md')) : [])
  if (md('file').length !== 2) e.push(`file/ : ${md('file').length} fiches, 2 attendues`)
  if (md('en-cours').length !== 1) e.push(`en-cours/ : ${md('en-cours').length} fiches, 1 attendue`)
  if (md('fait').length !== 3) e.push(`fait/ : ${md('fait').length} fiches, 3 attendues`)
  if (md('refuse').length !== 1) e.push(`refuse/ : ${md('refuse').length} fiche, 1 attendue`)
  const locks = fs.existsSync(path.join(O, 'en-cours')) ? fs.readdirSync(path.join(O, 'en-cours')).filter((f) => f.endsWith('.lock')) : []
  if (locks.length !== 1) e.push(`${locks.length} verrou(s), 1 attendu`)
  else {
    const l = fs.readFileSync(path.join(O, 'en-cours', locks[0]), 'utf8')
    if (!/^agent: \S+$/m.test(l) || !/^depuis: \d{4}-\d\d-\d\dT[\d:]+Z$/m.test(l)) e.push('verrou : lignes « agent: » et « depuis: <ISO> » attendues (scripts/orchestre.mjs:256)')
  }
  const v = fs.readFileSync(path.join(O, 'verdicts.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean)
  if (v.length !== 7) e.push(`verdicts.jsonl : ${v.length} lignes, 7 attendues`)
  try { v.forEach((x) => JSON.parse(x)) } catch { e.push('verdicts.jsonl : une ligne illisible') }
  if (!v.slice(-5).some((x) => JSON.parse(x).ligne.length > 160)) e.push('aucune des 5 dernières lignes de verdict ne dépasse 160 signes (coupure non éprouvée)')
  const b = blocAttention(fs.readFileSync(path.join(O, 'digest.md'), 'utf8'))
  if (!b || b.n !== 3 || b.lignes.length !== 3) e.push(`digest.md : bloc « ## Attention (3) » de trois lignes attendu (${b ? `${b.n}, ${b.lignes.length} ligne(s)` : 'absent'})`)
  else for (const l of b.lignes) if (!/`[^`]+`\s*$/.test(l)) e.push(`digest.md : ligne sans commande finale entre accents graves : ${l}`)
  const s = jeu('snapshot-code.json')
  if (b && JSON.stringify(b.lignes) !== JSON.stringify(s.releve.attention)) e.push('digest.md et snapshot-code.json ne portent pas les mêmes lignes d’attention')
  return e
}

// ── Alertes du Web Push ───────────────────────────────────────────────────────────────────────────────────────────────────
export function verifierAlertesPush() {
  const p = jeu('alertes-push.json'), e = []
  const pieges = Object.values(p.pieges ?? {})
  if (pieges.length !== 4) e.push('pieges : nom, téléphone, adresse et montant attendus')
  for (const a of p.alertes ?? []) {
    const texte = `${a.sujet}\n${a.corps}`
    for (const x of pieges) if (!texte.includes(x)) e.push(`alerte ${a.cle} : piège « ${x} » absent du sujet et du corps`)
    if (!pieges.some((x) => a.sujet.includes(x))) e.push(`alerte ${a.cle} : aucun piège dans le sujet`)
    if (!/\d{6}/.test(texte)) e.push(`alerte ${a.cle} : pas de 6 chiffres de suite`)
  }
  for (const m of [...(p.pousses ?? []), ...(p.non_pousses ?? [])]) if (!(p.alertes ?? []).some((a) => a.motif === m && a.a === 'entreprise')) e.push(`motif ${m} : aucune alerte d’entreprise`)
  if (!(p.alertes ?? []).some((a) => a.a !== 'entreprise' && a.a?.artisanId && a.a?.email)) e.push('aucune alerte adressée à un artisan')
  if ((p.pousses ?? []).join() !== 'paiement,appel,panne_agent,argent_bloque,coupe_circuit,digest') e.push('pousses : les six motifs de 026-051, dans l’ordre')
  return e
}

// ── Transverse : mots interdits, noms témoins ────────────────────────────────────────────────────────────────────────────
/** Les jeux d'essai (tout fichier du lot a sauf les modules .mjs) : ni boite_, ni chauffe, ni sequenceur, ni canal email. */
export function verifierMotsInterdits() {
  const e = []
  const fichiers = [...listerFichiers(A)].filter((f) => !f.endsWith('.mjs'))
  for (const f of fichiers) {
    const t = fs.readFileSync(path.join(A, f), 'utf8')
    for (const m of ['boite_', 'chauffe', 'sequenceur']) if (t.toLowerCase().includes(m)) e.push(`${f} contient « ${m} »`)
    if (f.endsWith('.json')) {
      const canaux = []
      const rec = (o) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'canal') canaux.push(v); rec(v) } }
      rec(JSON.parse(t))
      if (canaux.includes('email')) e.push(`${f} porte le canal « email »`)
    }
  }
  if (fichiers.length < 12) e.push(`${fichiers.length} fichier(s) de jeu d’essai seulement`)
  return e
}

// ── Secrets : aucun jeton réel dans un jeu d'essai (JA-3) ; aucun juge du lot ne lit .env.local ni presti-secrets (JA-4) ──
// Fiche 026-012, « Ce qu'il faut faire » §1 (le juge ne lit ni .env.local ni presti-secrets) et §6 (aucun jeton réel dans
// une fixture). Aucune valeur trouvée n'est jamais affichée : seulement le fichier, la ligne et le genre de clé.
/** Motifs de clés réelles. Les fausses clés que les juges tirent au hasard portent « temoin » et ne sont pas prises. */
export const MOTIFS_JETONS = [
  ['clé secrète Supabase', /\bsb_secret_(?!temoin_)[\w-]{8,}/],
  ['clé publique Supabase', /\bsb_publishable_(?!temoin_)[\w-]{8,}/],
  ['JWT (clé Supabase historique, jeton de session)', /\beyJ[\w-]{8,}\.eyJ[\w-]{8,}\.[\w-]{8,}/],
  ['clé sk- (Anthropic, OpenAI…)', /\bsk-(?!temoin)[\w-]{20,}/],
  ['clé Stripe', /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{10,}|\bwhsec_[A-Za-z0-9]{10,}/],
  ['clé Google', /\bAIza[\w-]{30,}/],
  ['jeton Slack', /\bxox[abposr]-[\w-]{10,}/],
  ['jeton GitHub', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_\w{20,})/],
  ['clé Resend', /\bre_[A-Za-z0-9]{6,}_[A-Za-z0-9]{16,}/],
  ['clé AWS', /\bAKIA[0-9A-Z]{16}\b/],
  ['jeton Apify', /\bapify_api_[A-Za-z0-9]{10,}/],
  ['clé privée', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
]
/** → [{ nom, ligne }] : les genres de clés réelles présents dans `texte` (jamais la valeur). */
export function jetonsDans(texte) {
  const out = []
  for (const [nom, re] of MOTIFS_JETONS) { const m = re.exec(texte); if (m) out.push({ nom, ligne: texte.slice(0, m.index).split('\n').length }) }
  return out
}
// Échantillons de l'auto-test, assemblés à l'exécution : écrits d'un bloc, ils feraient de ce module un porteur de jetons.
const Q = (n) => 'Q7wZ'.repeat(n)
const JETONS_FAUX_POSITIFS = () => [['sb_secret_', Q(10)], ['sb_publishable_', Q(10)], [`eyJ${Q(3)}.eyJ${Q(3)}.`, Q(3)], ['sk-ant-api03-', Q(10)], ['sk_live_', Q(6)], ['AIza', Q(9)], ['xoxb-', Q(5)], ['ghp_', Q(9)], [`re_${Q(3)}_`, Q(5)], ['AKIA', 'Q7WZ'.repeat(4)], ['apify_api_', Q(6)], ['-----BEGIN RSA PRIVATE', ' KEY-----']].map((p) => p.join(''))
const JETONS_TEMOINS = ['sb_' + 'secret_temoin_0123456789abcdef0123456789abcdef', 'temoin-cle-vapid-privee-factice', 'BTemoinCleVapidPubliqueFactice', 'e0000014-0000-4000-8000-000000000014', 'task-force-temoin-du-lundi-12-octobre', 'pilotage_envois_du_jour', 'sb_' + 'secret_temoin_${crypto.randomBytes(24)}']
/** Le détecteur prouve qu'il sait voir : chaque motif prend son échantillon, aucun ne prend un témoin. → défauts */
function autoTestJetons() {
  const e = []
  for (const [i, x] of JETONS_FAUX_POSITIFS().entries()) if (!MOTIFS_JETONS[i][1].test(x)) e.push(`auto-test : le motif « ${MOTIFS_JETONS[i][0]} » ne prend pas son échantillon`)
  for (const t of JETONS_TEMOINS) for (const j of jetonsDans(t)) e.push(`auto-test : le motif « ${j.nom} » prend le témoin « ${t} »`)
  return e
}
/** JA-3 : aucun fichier du lot a (jeux d'essai, doublures, faux orchestre, modules) ne porte une clé réelle. */
export function verifierJetons() {
  const e = autoTestJetons()
  for (const f of listerFichiers(A)) for (const j of jetonsDans(fs.readFileSync(path.join(A, f), 'utf8'))) e.push(`${f}:${j.ligne} porte une clé réelle (${j.nom})`)
  return e
}

/** Chemin de secret : .env, .env.local, .env.<x>, agents.env (hors .example et .sample), ou tout chemin sous presti-secrets. */
export const RE_CHEMIN_SECRET = /(?:^|[\\/=])(?:\.env|agents\.env)(?:\.(?!example$|sample$)[\w-]+)*$|(?:^|[\\/=])presti[-_]secrets(?:[\\/]|$)/i
const RE_SPEC_ENV = /(?:^|\/)dotenv(?:\/|$)|(?:^|\/)lib\/capture(?:\.mjs)?$/
const RE_CODE_ENV = /\b(?:loadEnvFile|chargerEnv)\s*\(/
/**
 * Les lectures de secrets d'un source, lues dans le texte (commentaires ôtés) : une chaîne sans espace qui désigne un chemin
 * de secret ou `--env-file` (une chaîne avec espaces est une phrase : un message qui nomme .env.local ne le lit pas ; une
 * expression régulière qui le cherche non plus) ; un import de dotenv ou de scripts/lib/capture.mjs (chargerEnv) ; un appel
 * à loadEnvFile ou chargerEnv. Complété à l'exécution par le piège des lectures. → [{ ligne, quoi }]
 */
export function lecturesDeSecrets(src) {
  const chaines = [], out = []
  sansCommentaires(src, chaines)
  // Le code seul : chaînes et morceaux de gabarits blanchis (même longueur, fins de ligne gardées), puis commentaires ôtés.
  const blanchi = src.split('')
  for (const { texte, pos } of chaines) for (let k = 0; k < texte.length; k++) if (blanchi[pos + k] !== '\n') blanchi[pos + k] = ' '
  const code = sansCommentaires(blanchi.join(''))
  const ligneDe = (pos) => src.slice(0, pos).split('\n').length
  for (const { texte, pos } of chaines) {
    if (/\s/.test(texte)) continue
    if (RE_CHEMIN_SECRET.test(texte) || /^--env-file\b/.test(texte)) out.push({ ligne: ligneDe(pos), quoi: `chaîne « ${court(texte, 80)} » (un fichier de secrets)` })
  }
  for (const { spec } of importsDe(src)) if (spec && RE_SPEC_ENV.test(spec)) out.push({ ligne: 0, quoi: `import de « ${spec} » (chargement de .env.local)` })
  for (const [n, l] of code.split('\n').entries()) if (RE_CODE_ENV.test(l)) out.push({ ligne: n + 1, quoi: `appel « ${court(RE_CODE_ENV.exec(l)[0], 40)} » (chargement de .env.local)` })
  return out
}
/** Le lecteur de source prouve qu'il sait voir : une vraie lecture est prise, une simple mention ne l'est pas. → défauts */
function autoTestLectures() {
  const env = ['', 'env', 'local'].join('.'), sec = ['presti', 'secrets'].join('-') // assemblés : ce module est lu lui aussi
  const lectures = [
    `const t = fs.readFileSync(path.join(R, '${env}'), 'utf8')`,
    `const d = path.join(R, '..', '${sec}', 'cles.json')`,
    `const f = \`\${R}/${env}\``,
    `spawnSync(process.execPath, ['--env-${'file'}=x', 'a.mjs'])`,
    `import { chargerEnv } from './lib/capture.mjs'`,
    `process.loadEnvFile()`,
  ]
  const mentions = [
    `// ce juge ne lit ni ${env} ni ${sec}`,
    `/* ${env} */ const x = 1`,
    `e.push('le source lit ${sec}')`,
    `if (/${sec}|\\${env}/.test(src)) e.push("mention de ${env} dans un message")`,
    `const n = process.env.TZ`,
  ]
  const e = []
  for (const x of lectures) if (!lecturesDeSecrets(x).length) e.push(`auto-test : lecture non vue « ${court(x, 60)} »`)
  for (const x of mentions) { const l = lecturesDeSecrets(x); if (l.length) e.push(`auto-test : simple mention prise pour une lecture « ${court(x, 60)} » (${l[0].quoi})`) }
  return e
}

/** Les sources des juges du lot : commandes et chargeur de lot.mjs, la preuve, tout module .mjs du lot, et leurs imports
 *  relatifs de proche en proche tant qu'ils restent dans le dépôt. */
async function sourcesDuLot(L) {
  const file = [
    ...L.juges.map((j) => path.join(R, j.commande)),
    ...L.juges.flatMap((j) => (j.loader === true ? [LOADER] : typeof j.loader === 'string' ? [path.join(R, j.loader)] : [])),
    path.join(R, 'scripts', 'juges-026-pilotage-preuve.mjs'),
    ...[...listerFichiers(A)].filter((f) => f.endsWith('.mjs')).map((f) => path.join(A, f)),
  ]
  const vus = new Set()
  while (file.length) {
    const f = path.resolve(file.shift())
    if (vus.has(f)) continue
    vus.add(f)
    for (const { spec } of importsDe(fs.readFileSync(f, 'utf8'))) {
      if (!spec || !spec.startsWith('.')) continue
      const g = path.resolve(path.dirname(f), spec)
      if (sous(R, g) && /\.m?js$/.test(g) && fs.existsSync(g)) file.push(g)
    }
  }
  return [...vus]
}

/** Le piège des lectures, chargé par NODE_OPTIONS (hérité par chaque enfant) : il refuse et consigne toute ouverture, lecture,
 *  copie ou liste d'un chemin de secret, loadEnvFile, et tout processus lancé avec un tel chemin ou --env-file. */
const PIEGE_LECTURES = (journal) => String.raw`// Piège des lectures de secrets de 026-012 (JA-4 du lot a), écrit par scripts/fixtures/026-pilotage/a/jeux.mjs.
import fs from 'node:fs'
import path from 'node:path'
import cp from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
import { fileURLToPath } from 'node:url'
const JOURNAL = ${JSON.stringify(journal)}
const ecrire = fs.appendFileSync
const noter = (quoi) => { try { ecrire(JOURNAL, process.pid + ' ' + quoi + '\n') } catch { /* journal indisponible */ } }
const RE_CHEMIN = ${RE_CHEMIN_SECRET}
const RE_ARG = /(?:^|[\s"'=\\/])(?:\.env|agents\.env)(?:\.[\w-]+)*(?=$|[\s"'])|presti[-_]secrets|--env-file/i
const chemin = (p) => { try { if (p instanceof URL) return fileURLToPath(p); if (Buffer.isBuffer(p)) return p.toString('utf8'); if (typeof p === 'string') return p.startsWith('file:') ? fileURLToPath(p) : p } catch { /* illisible */ } return null }
const refus = (nom, c) => { noter(nom + ' ' + c); return Object.assign(new Error('lecture d’un secret refusée (piège de 026-012) : ' + c), { code: 'EACCES' }) }
function garder(obj, nom, mode) {
  const f = obj && obj[nom]
  if (typeof f !== 'function') return
  const g = function (p, ...reste) {
    const c = chemin(p)
    if (c !== null && RE_CHEMIN.test(path.resolve(c))) {
      const e = refus(nom, c)
      if (mode === 'rappel') { const cb = reste[reste.length - 1]; if (typeof cb === 'function') { process.nextTick(cb, e); return } }
      if (mode === 'promesse') return Promise.reject(e)
      if (mode === 'booleen') return false
      throw e
    }
    return f.call(this, p, ...reste)
  }
  obj[nom] = Object.assign(g, f) // garde les propriétés de l'original (realpathSync.native…)
}
const OPS = ['readFile', 'open', 'readdir', 'opendir', 'stat', 'lstat', 'access', 'copyFile', 'cp', 'readlink', 'realpath']
for (const n of OPS) garder(fs, n + 'Sync', 'leve')
garder(fs, 'createReadStream', 'leve')
garder(fs, 'existsSync', 'booleen')
for (const n of OPS) garder(fs, n, 'rappel')
for (const n of OPS) garder(fs.promises, n, 'promesse')
garder(fs.realpathSync, 'native', 'leve')
garder(fs.realpath, 'native', 'rappel')
if (typeof process.loadEnvFile === 'function') process.loadEnvFile = function (p) { throw refus('loadEnvFile', String(p ?? '.env')) }
for (const n of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) {
  const f = cp[n]
  if (typeof f !== 'function') continue
  cp[n] = function (...args) {
    const t = args.slice(0, 2).flatMap((a) => (Array.isArray(a) ? a : [a])).filter((a) => typeof a === 'string').join(' ')
    if (RE_ARG.test(t)) throw refus(n, t.slice(0, 200))
    return f.apply(this, args)
  }
}
syncBuiltinESMExports()
`

/**
 * JA-4 (partie lot a) : aucun juge du lot ne lit .env.local ni presti-secrets, et aucun de leurs sources ne porte une clé
 * réelle. 1) lu dans le source de chaque juge, de son chargeur, de la preuve et de chaque module du lot (auto-test du lecteur
 * d'abord) ; 2) à l'exécution : le piège des lectures prouve qu'il refuse et consigne (leurres sous .orchestre/travail/),
 * puis chaque juge est relancé sous lui, en témoin et sur la référence, avec un sous-lancement de la preuve ; le journal
 * doit rester vide. ctx : { lancerNode, racine, lot, reference } (026-012, lot.mjs). → { echecs, detail }
 */
export async function controleSecrets(ctx) {
  const e = [...autoTestLectures()]
  const L = await import(pathToFileURL(path.join(A, 'lot.mjs')).href)
  const rel = (f) => path.relative(R, f).split(path.sep).join('/')
  // 1) Lu dans le source.
  const sources = await sourcesDuLot(L)
  for (const f of sources) {
    const src = fs.readFileSync(f, 'utf8')
    for (const l of lecturesDeSecrets(src)) e.push(`${rel(f)}${l.ligne ? `:${l.ligne}` : ''} lit un secret : ${l.quoi}`)
    for (const j of jetonsDans(src)) e.push(`${rel(f)}:${j.ligne} porte une clé réelle (${j.nom})`)
  }
  // 2) À l'exécution, sous le piège des lectures.
  const d = exigerSousTravail(path.join(TRAVAIL, 'juges-026-pilotage', `lectures-${ctx.lot}`))
  fs.rmSync(d, { recursive: true, force: true })
  const leurres = path.join(d, 'leurres')
  const leurreEnv = path.join(leurres, ['', 'env', 'local'].join('.')), leurreSec = path.join(leurres, ['presti', 'secrets'].join('-'), 'leurre.txt')
  fs.mkdirSync(path.dirname(leurreSec), { recursive: true })
  fs.writeFileSync(leurreEnv, 'LEURRE_TEMOIN=1\n'); fs.writeFileSync(leurreSec, 'leurre témoin\n')
  const journal = path.join(d, 'journal.log'), piege = path.join(d, 'piege-lectures.mjs')
  fs.writeFileSync(piege, PIEGE_LECTURES(journal))
  const env = (plus = {}) => ({ ...plus, NODE_OPTIONS: `--import=${pathToFileURL(piege).href}` })
  const lu = () => { try { return fs.readFileSync(journal, 'utf8').trim() } catch { return '' } }
  // 2a) Le piège prouve qu'il refuse et consigne, sans gêner une lecture ordinaire.
  const essai = String.raw`import fs from 'node:fs'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import cp from 'node:child_process'
const [env, sec, permis] = JSON.parse(process.argv[1])
const r = {}
const tenter = async (k, f) => { try { await f(); r[k] = 'lu' } catch (x) { r[k] = /piège de 026-012/.test(String(x && x.message)) ? 'refuse' : 'erreur ' + String(x && x.message).slice(0, 80) } }
await tenter('readFileSync', () => fs.readFileSync(env))
await tenter('import nommé', () => readFileSync(sec))
await tenter('fs/promises', () => readFile(env))
r.existsSync = fs.existsSync(sec) ? 'lu' : 'refuse'
await tenter('realpathSync.native', () => fs.realpathSync.native(env))
await tenter('spawnSync --env-file', () => { const x = cp.spawnSync(process.execPath, ['--env-file=' + env, '-e', '0']); if (x.error) throw x.error })
await tenter('permis', () => fs.readFileSync(permis))
console.log(JSON.stringify(r))`
  const t = ctx.lancerNode(['--input-type=module', '-e', essai, JSON.stringify([leurreEnv, leurreSec, path.join(A, 'lot.mjs')])], { nom: 'piege-lectures-temoin', env: env(), timeout: 60_000 })
  let r = {}
  try { r = JSON.parse(t.stdout.trim().split(/\r?\n/).pop()) } catch { e.push(`le témoin du piège des lectures n'a rien rendu (code ${t.code}, « ${court(t.sortie, 120)} »)`) }
  for (const k of ['readFileSync', 'import nommé', 'fs/promises', 'existsSync', 'realpathSync.native', 'spawnSync --env-file']) if (r[k] !== 'refuse') e.push(`piège des lectures : ${k} sur un leurre → ${r[k] ?? 'non tenté'}, un refus attendu`)
  if (r.permis !== 'lu') e.push(`piège des lectures : une lecture ordinaire (lot.mjs) → ${r.permis ?? 'non tentée'}, permise attendue`)
  const jt = lu()
  if (!jt.includes(leurreEnv) || !jt.includes(leurreSec)) e.push('piège des lectures : les leurres ne sont pas consignés au journal')
  if (jt.includes('lot.mjs')) e.push('piège des lectures : une lecture ordinaire est consignée')
  fs.rmSync(journal, { force: true })
  // 2b) Chaque juge sous le piège : en témoin, puis sur la référence ; et un sous-lancement de la preuve.
  const lances = []
  for (const j of L.juges) {
    const base = [...(j.loader === true ? ['--import', `./${rel(LOADER)}`] : typeof j.loader === 'string' ? ['--import', j.loader] : []), j.commande, ...j.arguments]
    const nom = `${path.basename(j.commande, '.mjs')}${j.arguments.map((a) => `-${a.replace(/^--/, '').replace(/[^\w-]+/g, '-')}`).join('')}`
    const x = ctx.lancerNode([...base, '--temoin'], { nom: `lectures-${nom}.temoin`, env: env() })
    lances.push(`${nom} --temoin → ${x.code}`)
    if (x.code !== 0) e.push(`${nom} --temoin sous le piège des lectures : code ${x.code}, 0 attendu (« ${court(x.sortie.trim().split(/\r?\n/).filter((l) => l.startsWith('❌'))[0] ?? x.sortie.trim().split(/\r?\n/).pop(), 120)} »)`)
    if (ctx.reference) {
      const y = ctx.lancerNode([...base, `--racine=${ctx.reference}`], { nom: `lectures-${nom}.reference`, env: env() })
      lances.push(`${nom} sur la référence → ${y.code}`)
      if (y.code !== 1 && y.code !== 2) e.push(`${nom} sur la référence sous le piège des lectures : code ${y.code}, 1 ou 2 attendu`)
    }
  }
  const p = ctx.lancerNode([path.join('scripts', 'juges-026-pilotage-preuve.mjs'), `--lot=${ctx.lot}`], { nom: 'lectures-preuve-sous', env: env({ JUGES_026_PILOTAGE_SOUS: '1' }), timeout: 60_000 })
  lances.push(`preuve (sous-lancement) → ${p.code}`)
  if (p.code !== 0) e.push(`sous-lancement de la preuve sous le piège des lectures : code ${p.code}, 0 attendu`)
  const fuites = lu()
  if (fuites) for (const l of fuites.split('\n').slice(0, 6)) e.push(`lecture de secret refusée pendant les lancements : ${court(l, 140)}`)
  if (!ctx.reference) e.push('la preuve n’a pas transmis l’arbre de référence (ctx.reference) : les juges n’y sont pas relancés sous le piège des lectures')
  return {
    echecs: e,
    detail: `aucune lecture de .env.local ni de presti-secrets : lu dans ${sources.length} sources (${sources.map(rel).map((f) => path.basename(f)).join(', ')}), aucune clé réelle, lecteur auto-testé ; piège des lectures prouvé (leurres refusés et consignés par readFileSync, import nommé, fs/promises, existsSync, realpathSync.native, spawnSync --env-file ; lecture ordinaire permise), puis ${lances.length} lancements sous lui (${lances.join(', ')}) : journal vide`,
  }
}

/** JA-3 : tout l'auto-contrôle, pour la preuve. → { echecs, detail } */
export function controleJeux() {
  const parts = { decisions: verifierDecisions, commandes: verifierCommandes, appels: verifierAppels, 'liens-fuzz': verifierLiensFuzz, envois: verifierEnvois, compteurs: verifierCompteurs, entonnoir: verifierEntonnoir, bilan: verifierBilan, agents: verifierAgents, 'snapshot-code': verifierSnapshot, orchestre: verifierOrchestre, 'alertes-push': verifierAlertesPush, 'mots interdits': verifierMotsInterdits, jetons: verifierJetons }
  const echecs = []
  for (const [nom, f] of Object.entries(parts)) { try { for (const x of f()) echecs.push(`${nom} : ${x}`) } catch (err) { echecs.push(`${nom} : illisible (${String(err.message).slice(0, 120)})`) } }
  const v = jeu('envois.json'), n = jeu('entonnoir.json'), b = jeu('bilan.json')
  return { echecs, detail: `${Object.keys(parts).length} contrôles verts : envois.json ${v.envois.length} lignes sans texte, destinataire, entreprise, profil ni identifiant, chacune avec metier et commune, l'envoi sans verdict a bien un null ; liens-fuzz ${jeu('liens-fuzz.json').piegees.length} pièges porteurs de @, 9 chiffres ou « : » ; entonnoir ${n.chauds.length} chauds en froid: false ; bilan ${b.scenarios.length} scénarios de 100 contacts froids du 12/10 au 27/10/2026, cas sans date à bilan_le nul ; ni boite_, ni chauffe, ni sequenceur, ni canal email ; aucune clé réelle dans les ${listerFichiers(A).size} fichiers du lot (${MOTIFS_JETONS.length} motifs, auto-testés)` }
}

/** JA-6 (partie lot a) : --partie=lot de pilotage-logique-qa répond code 2 et renvoie vers --partie=envois. */
export function controlePartieLot(ctx) {
  const r = ctx.lancerNode(['--import', `./${path.relative(R, LOADER).split(path.sep).join('/')}`, 'scripts/pilotage-logique-qa.mjs', '--partie=lot'], { nom: 'pilotage-logique-qa.partie-lot' })
  const e = []
  if (r.code !== 2) e.push(`--partie=lot : code ${r.code}, 2 attendu`)
  if (!/--partie=envois/.test(r.sortie)) e.push(`--partie=lot : aucun renvoi vers --partie=envois (« ${r.sortie.trim().slice(0, 160)} »)`)
  if (!/rectification du 24\/09/.test(r.sortie)) e.push('--partie=lot : la rectification du 24/09 n’est pas citée')
  return { echecs: e, detail: `--partie=lot de pilotage-logique-qa : code 2, « ${r.sortie.trim().split(/\r?\n/).pop()} »` }
}

// Témoins de chaque partie : les fonctions d'auto-contrôle qu'elle lance.
export const TEMOINS = {
  decider: { decisions: verifierDecisions, commandes: verifierCommandes, appels: verifierAppels, 'liens-fuzz': verifierLiensFuzz },
  envois: { envois: verifierEnvois, compteurs: verifierCompteurs, entonnoir: verifierEntonnoir, bilan: verifierBilan, 'mots interdits': verifierMotsInterdits },
  agents: { agents: verifierAgents, 'snapshot-code': verifierSnapshot, orchestre: verifierOrchestre },
  push: { 'alertes-push': verifierAlertesPush },
}
// Rappel des bornes du jeu : ces constantes ne servent qu'aux messages.
export const INSTANT = { T0: '2026-10-14T10:00:00.000Z', MIN, H, J }
