// 026-092 — adapté de la référence contractuelle 026-067, sans import de fixture à l'exécution.
import { sourcer, nonMesure, type Sourcee } from '@/lib/direction/fraicheur'
import { pauseGenerale } from '@/lib/agents/pause'
import { barre, nuit, prochaineReunion } from './barre'
import { equipage, positions, CLES_SALLE } from './equipage'
import { cartesAttention } from './attention'
type SourceAttention = NonNullable<Parameters<typeof cartesAttention>[0]>[string]
import { bulles, bandeau, TYPES_BANDEAU } from './fil'
import { tapis, lignes } from './tapis'
import { commandement, palierSalle } from './missions'
import { etatExperience } from './experience'
import { envoisDesAgents } from './envois'
import { bilan, entonnoir } from './entonnoir'
import { validerSnapshot, resumeCode } from './code'
import * as lecteurs from './salles/index'

export const VUES = ['direct', 'fil', 'salle', 'agent'] as const
export type Vue = typeof VUES[number]
export const SALLES_PANNEAU = ['recettes', 'tresorerie', 'usine', 'atelier', 'reunion', 'envois', 'experience', 'standard', 'redaction', 'machines'] as const
export { CLES_SALLE }
export const LANCEMENT: { date: string | null; source: string } = { date: '2026-10-05', source: 'posée par 026-140 à la levée du drapeau pilotage (05/10/2026, heure de Paris)' }
export const DUREE_LIEN_APERCU_S = 600
export const HORS = { valeur: null, nonMesure: true, raison: 'hors périmètre' } as const
const ARRIVE = 'arrive avec sa fiche'
const RESERVEE = 'Branche e-commerce réservée : rien n’est construit.'

// ── La garde par sous-partie : chaque objet sous son domaine (table fermée) ──────────────────────────────────────────────
export type Domaine = 'sante' | 'comptabilite' | 'clients' | 'securite' | 'audience' | 'support'
export const DOMAINE_DE: Readonly<Record<string, Domaine>> = Object.freeze({
  'direct': 'sante',
  'direct.barre': 'sante', 'direct.barre.version': 'sante', 'direct.barre.sante': 'sante', 'direct.barre.erreurs': 'sante',
  'direct.barre.commandes_mois': 'comptabilite', 'direct.barre.sites_en_ligne': 'clients',
  'direct.equipage': 'sante', 'direct.equipage.couts': 'comptabilite',
  'direct.attention': 'sante',
  'direct.commandement': 'sante', 'direct.commandement.argent': 'comptabilite',
  'direct.tapis': 'sante', 'direct.tapis.paye': 'comptabilite',
  'direct.bandeau': 'comptabilite',
  'direct.carte': 'sante', 'direct.carte.lignes': 'sante', 'direct.carte.lignes.contenu': 'sante', 'direct.carte.lignes.sites': 'clients',
  'direct.carte.lignes.packs': 'comptabilite', 'direct.carte.experience': 'comptabilite', 'direct.carte.paliers': 'sante',
  'direct.carte.nuit': 'sante', 'direct.carte.egaliseur': 'sante', 'direct.carte.departements': 'sante',
  'direct.carte.paliers.commandement': 'comptabilite',
  'fil': 'sante',
  'agent': 'sante', 'agent.argent': 'comptabilite',
  'salle.recettes': 'comptabilite', 'salle.recettes.packs': 'comptabilite',
  'salle.tresorerie': 'comptabilite', 'salle.tresorerie.parNature': 'comptabilite',
  'salle.usine': 'clients', 'salle.atelier': 'sante', 'salle.reunion': 'sante', 'salle.envois': 'sante',
  'salle.experience': 'comptabilite', 'salle.standard': 'sante', 'salle.redaction': 'sante',
  'salle.machines': 'sante', 'salle.machines.usine': 'sante', 'salle.machines.ia': 'sante',
  'salle.machines.ia.cout_jour_eur': 'comptabilite',
  'salle.commandement': 'sante', 'salle.commandement.argent': 'comptabilite',
  'salle.radar': 'sante', 'salle.crieur': 'sante', 'salle.studio': 'sante', 'salle.studio.montants': 'comptabilite',
  'salle.chantier': 'sante', 'salle.audience': 'audience', 'salle.securite': 'securite',
  'salle.presti': 'clients', 'salle.presti.mrr': 'comptabilite', 'salle.presti.tickets': 'support',
  'salle.observatoire': 'sante', 'salle.repos': 'sante', 'salle.ecommerce': 'sante',
})
export const objetDe = (vue: string, salle?: string | null): string => (vue === 'salle' ? `salle.${salle ?? ''}` : vue)

const estEnveloppe = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x) && 'valeur' in (x as object) && ('source' in (x as object) || 'nonMesure' in (x as object))

/** Pure : chaque enveloppe dont le domaine est refusé devient « hors périmètre » (jamais 0 ni []), les autres restent. */
export function trier<T>(enveloppe: T, peut: (d: Domaine) => boolean, objet = 'direct'): T {
  const marcher = (x: unknown, chemin: string, tete: boolean): unknown => {
    // Une absence brute ne contient aucune donnée à masquer ; conserver le contrat nullable.
    if (x === null || x === undefined) return x
    const d = DOMAINE_DE[chemin]
    if (d && !peut(d)) return tete && estEnveloppe(x) ? { ...HORS, source: x.source, a: x.a, cache: false } : { ...HORS }
    if (!estEnveloppe(x)) {
      if (!x || typeof x !== 'object' || Array.isArray(x)) return x
      const y: Record<string, unknown> = {}
      for (const [k, valeur] of Object.entries(x)) y[k] = marcher(valeur, `${chemin}.${k}`, false)
      return y
    }
    const v = x.valeur
    if (!v || typeof v !== 'object' || Array.isArray(v)) return x
    const w: Record<string, unknown> = {}
    for (const [k, y] of Object.entries(v as Record<string, unknown>)) w[k] = marcher(y, `${chemin}.${k}`, false)
    return { ...x, valeur: w }
  }
  return marcher(enveloppe, objet, true) as T
}

// ── La base, passée par la route ─────────────────────────────────────────────────────────────────────────────────────────
type Reponse = { data: unknown; error: { message: string } | null; count?: number | null }
export type Base = {
  rpc: (nom: string, args?: Record<string, unknown>) => PromiseLike<Reponse>
  from: (table: string) => any
  storage: { from: (bucket: string) => { createSignedUrl: (chemin: string, secondes: number) => PromiseLike<{ data: { signedUrl: string } | null; error: unknown }> } }
}
/** Les lectures du Poste dont la station a aussi besoin (lib/controle/lectures, 026-174) : la route les passe, `station.ts` n'importe jamais la base. */
export type Lectures = {
  santeService: () => Promise<Sourcee<{ etat: string; detail?: string }>>
  cronsDuService: () => Promise<Sourcee<{ nom: string; dernier: string | null; reussi: boolean | null; enRetard: boolean }[]>>
  audience: (periode: 'jour' | 'historique') => Promise<{ direct: Sourcee<Record<string, unknown>>; inscriptions: Sourcee<number>; saturee: boolean | null }>
  bans: () => Promise<{ bans: { actif: boolean }[]; abus24h: unknown[] } | null>
  clients: () => Promise<{ indisponible: string } | { lignes: { suppression_demandee_le: string | null }[]; resume: { total: number; payants: number } }>
  cerveaux: () => unknown[] | Promise<unknown[]>
  ticketsOuverts: () => Promise<{ nombre: number }>
}
export type Deps = {
  db: Base
  ventesSites: (l: { etat: string; prix_cents: number | null }[]) => { payee: number; generee: number; validee: number; en_ligne: number; retiree: number; encaisseCents: number }
  lectures: Lectures
  mrr: () => Promise<Sourcee<{ mrr: number }>>
  version: string | null
  maintenant?: Date
}
export type Contexte = {
  deps: Deps
  maintenant: Date
  rpc: (nom: string, args?: Record<string, unknown>) => Promise<any>
  env: <T>(cle: string, f: () => Promise<T>) => Promise<Sourcee<T>>
  depuisMinuit: string
  debutDuMois: string
  commandement: (objet: string) => Promise<unknown>
  agents: () => Promise<any[]>
}

const PARIS = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
function minuitParis(d: Date): string {
  const p = Object.fromEntries(PARIS.formatToParts(d).map((x) => [x.type, x.value]))
  const mur = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second))
  const decalage = mur - (d.getTime() - d.getMilliseconds())
  return new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)) - decalage).toISOString()
}
function debutDuMoisParis(d: Date): string {
  const minuit = new Date(minuitParis(d))
  const p = Object.fromEntries(PARIS.formatToParts(d).map((x) => [x.type, x.value]))
  return new Date(minuit.getTime() - (Number(p.day) - 1) * 86_400_000).toISOString()
}

function contexte(deps: Deps): Contexte {
  const maintenant = deps.maintenant ?? new Date()
  const memo = new Map<string, Promise<any>>()
  const rpc = (nom: string, args: Record<string, unknown> = {}) => {
    const cle = `${nom}:${JSON.stringify(args)}`
    if (!memo.has(cle)) memo.set(cle, Promise.resolve(deps.db.rpc(nom, args)).then((r) => { if (r.error) throw new Error(`${nom} : ${r.error.message}`); return r.data }))
    return memo.get(cle) as Promise<any>
  }
  const c: Contexte = {
    deps, maintenant, rpc, env: (cle, f) => sourcer(`station:${cle}`, 'supabase', f), depuisMinuit: minuitParis(maintenant), debutDuMois: debutDuMoisParis(maintenant),
    commandement: (objet) => lireCommandement(c, objet),
    agents: async () => lignesDe(await rpc('pilotage_agents')),
  }
  return c
}
const lignesDe = (x: unknown): any[] => (Array.isArray(x) ? x : x ? [x] : [])
const premiere = (x: unknown): any => (Array.isArray(x) ? x[0] ?? null : x ?? null)
const aVenir = <T>(): Sourcee<T> => ({ ...nonMesure<T>('supabase', ARRIVE), source: 'a_venir' as never })

// ── Les lectures partagées d'une réponse ─────────────────────────────────────────────────────────────────────────────────
async function sitesEnLigne(c: Contexte): Promise<number> {
  const r = await c.deps.db.from('sites_commandes').select('id', { count: 'exact', head: true }).eq('etat', 'en_ligne')
  if (r.error) throw new Error(`sites_commandes : ${r.error.message}`)
  return r.count ?? 0
}
async function sitesParEtat(c: Contexte) {
  const r = await c.deps.db.from('sites_commandes').select('id, etat').neq('etat', 'brouillon')
  if (r.error) throw new Error(`sites_commandes : ${r.error.message}`)
  const n: Record<string, number> = {}
  for (const l of lignesDe(r.data)) n[l.etat] = (n[l.etat] ?? 0) + 1
  return Object.entries(n).map(([etape, jour]) => ({ etape, jour }))
}
async function evenementsRecents(c: Contexte) { return lignesDe(await c.rpc('pilotage_evenements', { p_apres: null, p_limite: 100, p_agent: null, p_types: null })) }
async function cartesEquipage(c: Contexte) { return equipage(lignesDe(await c.rpc('pilotage_agents')), await evenementsRecents(c), c.maintenant) }
async function derniereReunion(c: Contexte) { return premiere(await c.rpc('station_reunion_lire', { p_limite: 1 })) }

async function sourcesAttention(c: Contexte) {
  const s: Record<string, SourceAttention | null> = {}
  const al = await c.deps.db.from('alertes').select('motif, cree_le').is('acquittee_le', null)
  if (al.error) throw new Error(`alertes : ${al.error.message}`)
  for (const a of lignesDe(al.data)) {
    const x = s[a.motif]
    s[a.motif] = { nombre: (x?.nombre ?? 0) + 1, depuis: x?.depuis && x.depuis < a.cree_le ? x.depuis : a.cree_le }
  }
  const base = premiere(await c.rpc('pilotage_attention_sources')) ?? {}
  for (const [k, v] of Object.entries(base as Record<string, SourceAttention | null>)) s[k] = v
  const appels = lignesDe(await c.rpc('pilotage_appels', { p_limite: 20 }))
  s.appel = appels.length ? { nombre: appels.length, rdv: appels.filter((x) => x.source === 'rdv').length } : null
  const g = await c.deps.db.from('sites_commandes').select('id, cree_le').eq('etat', 'generee')
  if (g.error) throw new Error(`sites_commandes : ${g.error.message}`)
  s.site_a_valider = lignesDe(g.data).length ? { nombre: lignesDe(g.data).length } : null
  const env = envoisDesAgents(lignesDe(await c.rpc('pilotage_envois_du_jour')), lignesDe(await c.rpc('pilotage_compteurs_du_jour')), lignesDe(await c.rpc('pilotage_compteurs_technologies')), c.maintenant)
  s.envoi_sans_verdicts = env.anomalies.length ? { nombre: env.anomalies.length } : null
  const code = premiere(await c.rpc('pilotage_code_lire'))
  const snap = validerSnapshot(code?.etat ?? null)
  s.orchestre = snap?.attention.length ? { nombre: snap.attention.length } : null
  const p = await pauseGenerale()
  s.pause_generale = p.active ? { nombre: 1, depuis: c.maintenant.toISOString() } : null
  return s
}
async function mesures(c: Contexte) {
  const recettes = lignesDe(await c.rpc('pilotage_recettes_agents', { p_depuis: new Date(c.maintenant.getTime() - 30 * 86_400_000).toISOString() }))
  let encaisse = 0
  for (const r of recettes) encaisse += Number(r.agents_eur ?? 0)
  const date = premiere(await c.rpc('pilotage_bilan_date')) ?? { bilan_le: null }
  const b = bilan(lignesDe(await c.rpc('pilotage_bilan', { p_n: 100 })), c.maintenant, { bilan_le: date.bilan_le ?? null })
  return { encaisse_eur: encaisse, oui: b.oui, contacts_froids: b.contacts, sites_en_ligne: await sitesEnLigne(c), bilan: b }
}
export async function lireCommandement(c: Contexte, objet: string) {
  const m = await mesures(c)
  const objectif = premiere(await c.rpc('station_objectif_actif'))
  const reunion = await derniereReunion(c)
  const cm = commandement({ mesures: { encaisse_eur: m.encaisse_eur, oui: m.oui, contacts_froids: m.contacts_froids, sites_en_ligne: m.sites_en_ligne }, objectif: objectif ? { libelle: objectif.libelle, mesure: objectif.mesure ?? null, cible: objectif.cible ?? null } : null, compteRendu: reunion?.statut === 'close' ? lignesDe(reunion.lignes) : [], bilan: m.bilan, succesDates: {} })
  return {
    objectif: cm.objectif, missions: cm.missions.filter((x) => x.cle !== 'encaisse_eur'), succes: cm.succes, tousSucces: cm.tousSucces, compteRendu: cm.compteRendu,
    argent: await c.env(`${objet}.argent`, async () => ({ niveau: cm.niveau, missions: cm.missions.filter((x) => x.cle === 'encaisse_eur') })),
  }
}

// ── vue=direct : sept sous-parties indépendantes ─────────────────────────────────────────────────────────────────────────
async function lireDirect(c: Contexte) {
  const { deps, maintenant, rpc, env } = c
  const attention = await env('direct.attention', async () => cartesAttention(await sourcesAttention(c), maintenant))
  const [barreE, equipageE, commandementE, tapisE, bandeauE, carteE] = await Promise.all([
    env('direct.barre', async () => {
      const cartes = await cartesEquipage(c).catch(() => null)
      const chef = premiere(await rpc('pilotage_chef').catch(() => null))
      const reunion = await derniereReunion(c).catch(() => null)
      const experience = premiere(await rpc('station_experience_etat').catch(() => null))
      const b = barre({
        cartes: cartes ?? undefined, chef: chef ? { prochain_le: chef.prochain_le ?? null, modele: chef.modele ?? null } : undefined, cycles: chef?.cycles_jour ?? null,
        reunion: reunion ? { jour: reunion.jour, statut: reunion.statut } : null, quotas: undefined,
        compteurs: lignesDe(await rpc('pilotage_compteurs_du_jour')),
        palier: premiere(await rpc('pilotage_etat_envoi').catch(() => null))?.palier ?? null,
        experience, pause: await pauseGenerale().catch(() => undefined), attention: attention.valeur ? { total: attention.valeur.total } : undefined, lancement: LANCEMENT.date,
      }, maintenant)
      return {
        ...b,
        version: await env('direct.barre.version', async () => (deps.version ? deps.version.slice(0, 7) : 'dev')),
        sante: await env('direct.barre.sante', async () => lecteurs.sante(await deps.lectures.santeService(), await c.agents())),
        erreurs: await env('direct.barre.erreurs', async () => {
          const r = await deps.db.from('app_errors').select('id', { count: 'exact', head: true }).gte('created_at', new Date(maintenant.getTime() - 24 * 3_600_000).toISOString())
          if (r.error) throw new Error(`app_errors : ${r.error.message}`)
          return r.count ?? 0
        }),
        commandes_mois: await env('direct.barre.commandes_mois', async () => {
          const r = await deps.db.from('sites_commandes').select('etat, prix_cents').gte('cree_le', debutDuMoisParis(maintenant))
          if (r.error) throw new Error(`sites_commandes : ${r.error.message}`)
          const v = deps.ventesSites(lignesDe(r.data))
          return v.payee + v.generee + v.validee + v.en_ligne + v.retiree
        }),
        sites_en_ligne: await env('direct.barre.sites_en_ligne', () => sitesEnLigne(c)),
      }
    }),
    env('direct.equipage', async () => {
      const cartes = await cartesEquipage(c)
      const reunion = await derniereReunion(c).catch(() => null)
      const lignesAgents = lignesDe(await rpc('pilotage_agents'))
      return {
        agents: cartes.map(({ cout_mois_eur, ...x }) => x),
        reunionEnCours: reunion?.statut === 'ouverte',
        couts: await env('direct.equipage.couts', async () => lignesAgents.map((l) => ({ nom: l.nom, cout_mois_eur: l.cout_mois_eur ?? null }))),
      }
    }),
    env('direct.commandement', () => lireCommandement(c, 'direct.commandement')),
    env('direct.tapis', async () => {
      const t = tapis(lignesDe(await rpc('pilotage_tapis', { p_depuis: c.depuisMinuit })))
      return { etapes: t.etapes.filter((x) => x.cle !== 'paye'), rejet: t.rejet, paye: await env('direct.tapis.paye', async () => t.etapes.find((x) => x.cle === 'paye') ?? null) }
    }),
    env('direct.bandeau', async () => {
      const evenements = lignesDe(await rpc('pilotage_evenements', { p_apres: null, p_limite: 50, p_agent: null, p_types: [...TYPES_BANDEAU] }))
      return { elements: bandeau(evenements).map((element) => ({ ...element, le: evenements.find((e) => e.id === element.id)?.le ?? null })) }
    }),
    env('direct.carte', () => lireCarte(c)),
  ])
  return { barre: barreE, equipage: equipageE, attention, commandement: commandementE, tapis: tapisE, bandeau: bandeauE, carte: carteE }
}

async function lireCarte(c: Contexte) {
  const { env, maintenant, rpc } = c
  const xp = premiere(await rpc('station_experience_etat'))
  const lignesE = await env('direct.carte.lignes', async () => ({
    contenu: await env('direct.carte.lignes.contenu', async () => lignes({ contenu: await lecteurs.crieur.etapesContenu(c) }).contenu),
    sites: await env('direct.carte.lignes.sites', async () => lignes({ sites: await sitesParEtat(c) }).sites),
    packs: await env('direct.carte.lignes.packs', async () => lignes({ packs: await lecteurs.studio.etapesPacks(c) }).packs),
  }))
  return {
    lignes: lignesE,
    experience: await env('direct.carte.experience', async () => etatExperience(xp, maintenant)),
    paliers: await env('direct.carte.paliers', async () => {
      const etat = premiere(await rpc('pilotage_etat_envoi'))
      const n = await sitesEnLigne(c)
      const cm = await lireCommandement(c, 'direct.carte.paliers.commandement')
      const niveau = cm.argent.valeur?.niveau?.lv ?? null
      return { envois: palierSalle('envois', { palier: etat?.palier ?? null }), usine: palierSalle('usine', { sites_en_ligne: n }), commandement: palierSalle('commandement', { niveau }) }
    }),
    nuit: await env('direct.carte.nuit', async () => nuit(maintenant)),
    egaliseur: await lecteurs.radar.egaliseur(c),
    departements: await env('direct.carte.departements', () => lecteurs.observatoire.lireDepartements(c)),
  }
}

// ── vue=fil ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function lireFil(c: Contexte, apres: number | null, agent: string | null) {
  const evs = lignesDe(await c.rpc('pilotage_evenements', { p_apres: apres, p_limite: 100, p_agent: agent, p_types: null }))
  let dernier: number | null = apres
  for (const e of evs) if (dernier === null || e.id > dernier) dernier = e.id
  return { bulles: bulles(evs, agent ? { agent } : {}), dernier_id: dernier }
}

// ── vue=agent ────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function lireAgent(c: Contexte, nom: string) {
  const { rpc, env, maintenant } = c
  const cartes = await cartesEquipage(c)
  const carte = cartes.find((x) => x.nom === nom)
  if (!carte) throw new Error(`agent inconnu : ${nom}`)
  const ligne = lignesDe(await rpc('pilotage_agents')).find((l) => l.nom === nom)
  const pos = positions(cartes.map((x) => ({ nom: x.nom, etat: x.etat })), await evenementsRecents(c))
  const taches = lignesDe(await rpc('pilotage_taches_agent', { p_nom: nom, p_limite: 15 }))
  const STATUT: Record<string, string> = { faite: 'FAIT', rejetee: 'REJETÉ', annulee: 'ANNULÉ', bloquee: 'BLOQUÉ', en_cours: 'EN COURS' }
  const v: Record<string, unknown> = {
    nom, libelle: carte.libelle, role: carte.role, etat: carte.etat, point: carte.point, cadence: carte.cadence, position: pos[nom] ?? carte.position,
    battement_le: ligne?.battement_le ?? null, prochain_le: carte.prochain_le, modele: carte.modele, fournisseur: ligne?.fournisseur ?? null, modele_le: ligne?.modele_le ?? null,
    taches: taches.map((t) => ({ numero: t.numero, type: t.type, statut: STATUT[t.statut] ?? 'EN COURS', resultat: t.resultat ?? null, le: t.le })),
    argent: await env('agent.argent', async () => ({ cout_mois_eur: ligne?.cout_mois_eur ?? null, coutParTache: lignesDe(await rpc('pilotage_couts_taches', { p_depuis: debutDuMoisParis(maintenant), p_limite: 20 })).filter((x) => x.agent === nom) })),
  }
  if (nom === 'chef') v.consignes = bulles(lignesDe(await rpc('pilotage_evenements', { p_apres: null, p_limite: 20, p_agent: null, p_types: ['consigne', 'consigne_lue'] })))
  if (nom === 'facteur' || nom === 'facteur_usine') v.technologies = lignesDe(await rpc('pilotage_compteurs_technologies'))
  if (nom === 'repondeur') v.reponses = lignesDe(await rpc('pilotage_reponses_recentes', { p_limite: 10 }))
  return v
}

// ── vue=salle ────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function apercu(c: Contexte, bucket: string, chemin: string | null): Promise<string | null> {
  if (!chemin) return null
  const r = await c.deps.db.storage.from(bucket).createSignedUrl(chemin, DUREE_LIEN_APERCU_S)
  return r.data?.signedUrl ?? null
}
const PANNEAUX: Record<string, (c: Contexte) => Promise<unknown>> = {
  recettes: async (c) => {
    const jours = lignesDe(await c.rpc('pilotage_recettes_agents', { p_depuis: new Date(c.maintenant.getTime() - 30 * 86_400_000).toISOString() }))
    let ac = 0, am = 0, hc = 0, hm = 0
    for (const j of jours) { ac += Number(j.agents_commandes ?? 0); am += Number(j.agents_eur ?? 0); hc += Number(j.hors_agents_commandes ?? 0); hm += Number(j.hors_agents_eur ?? 0) }
    return { jours: jours.map((j) => ({ jour: j.jour, agents_eur: j.agents_eur ?? 0, hors_agents_eur: j.hors_agents_eur ?? 0 })), sites: { agents: { commandes: ac, montant_eur: am }, hors_agents: { commandes: hc, montant_eur: hm } }, packs: nonMesure('supabase', 'les packs payés se lisent dans le Studio pubs (packs_pubs)') }
  },
  tresorerie: async (c) => {
    const mois = debutDuMoisParis(c.maintenant)
    const parAgent = lignesDe(await c.rpc('pilotage_couts_agents', { p_depuis: mois }))
    const modeles = lignesDe(await c.rpc('pilotage_couts_modeles', { p_debut: mois }))
    let total = 0
    for (const m of modeles) total += Number(m.eur ?? 0)
    const ach = await c.deps.db.from('achats').select('fournisseur, libelle, categorie, ttc_cents, date_facture').gte('date_facture', mois.slice(0, 10))
    if (ach.error) throw new Error(`achats : ${ach.error.message}`)
    const moisParis = PARIS.formatToParts(c.maintenant).filter((x) => x.type === 'year' || x.type === 'month').map((x) => x.value)
    const prefixe = `${moisParis[1]}-${moisParis[0]}`
    return {
      parAgent: parAgent.map((a) => ({ nom: a.agent ?? a.nom, libelle: a.libelle ?? a.agent ?? a.nom, cout_mois_eur: a.eur ?? 0, appels: a.appels ?? 0 })),
      parTache: lignesDe(await c.rpc('pilotage_couts_taches', { p_depuis: mois, p_limite: 20 })).map((t) => ({ tache: t.tache, type: t.type, agent: t.agent, eur: t.eur, le: t.le })),
      modeles: modeles.map((m) => ({ fournisseur: m.fournisseur, modele: m.modele, appels: m.appels ?? 0, eur: m.eur ?? 0 })),
      total_modeles_eur: total,
      abonnements: lignesDe(ach.data).filter((a) => String(a.date_facture).startsWith(prefixe)).map((a) => ({ fournisseur: a.fournisseur, libelle: a.libelle, categorie: a.categorie, ttc_eur: a.ttc_cents / 100, date_facture: a.date_facture })),
      parNature: await c.env('salle.tresorerie.parNature', () => lecteurs.natures.parNature(c, mois)),
    }
  },
  usine: async (c) => {
    const r = await c.deps.db.from('sites_commandes').select('id, etat, metier, communes, cree_le, apercu_chemin').neq('etat', 'brouillon').order('cree_le', { ascending: false }).limit(20)
    if (r.error) throw new Error(`sites_commandes : ${r.error.message}`)
    const commandes = []
    for (const l of lignesDe(r.data)) commandes.push({ id: l.id, etape: l.etat, metier: l.metier ?? null, commune: Array.isArray(l.communes) && l.communes.length ? l.communes.join(', ') : (l.commune ?? null), depuis: l.cree_le, apercu: await apercu(c, 'sites-generes', l.apercu_chemin ?? null) })
    return { commandes, aValider: commandes.filter((x) => x.etape === 'generee').length }
  },
  atelier: async (c) => {
    const ms = lignesDe(await c.rpc('pilotage_atelier', { p_depuis: c.depuisMinuit }))
    const t = tapis(lignesDe(await c.rpc('pilotage_tapis', { p_depuis: c.depuisMinuit })))
    const maquettes = []
    for (const m of ms) maquettes.push({ id: m.id, metier: m.metier ?? null, commune: m.commune ?? null, statut: m.statut, video: m.video ?? null, verdict: m.verdict ?? null, le: m.le, apercu: await apercu(c, 'maquettes', m.apercu_chemin ?? null) })
    return { maquettes, rejet: t.rejet.nombre, tauxPass: t.rejet.tauxPass }
  },
  reunion: async (c) => {
    const r = await derniereReunion(c)
    const cles = lignesDe(r?.idees)
    const idees = cles.length ? lignesDe(await c.rpc('pilotage_decisions_par_cles', { p_cles: cles })) : []
    return {
      prochaine_le: prochaineReunion(c.maintenant, r ? { jour: r.jour, statut: r.statut } : null).toISOString(),
      enCours: r?.statut === 'ouverte',
      derniere: r ? { jour: r.jour, statut: r.statut, lignes: lignesDe(r.lignes), objectif: r.objectif ?? null } : null,
      idees: idees.map((d) => ({ cle: d.cle_idempotence, question: d.question, statut: d.tranchee_le ? 'tranchee' : 'ouverte', choix: d.choix ?? null })),
    }
  },
  envois: async (c) => {
    const e = envoisDesAgents(lignesDe(await c.rpc('pilotage_envois_du_jour')), lignesDe(await c.rpc('pilotage_compteurs_du_jour')), lignesDe(await c.rpc('pilotage_compteurs_technologies')), c.maintenant)
    const g = premiere(await c.rpc('pilotage_etat_envoi')) ?? {}
    return { ...e, gestes: { envoi_froid: g.envoi_froid ?? false, epreuve_passee: g.epreuve_passee ?? false, epreuve_le: g.epreuve_le ?? null, mesure_a_sec: g.mesure_a_sec ?? false, notice_verifiee_le: g.notice_verifiee_le ?? null, technologies_pause: lignesDe(g.technologies_pause), modeles_suspendus: lignesDe(g.modeles_suspendus) } }
  },
  experience: async (c) => etatExperience(premiere(await c.rpc('station_experience_etat')), c.maintenant),
  standard: async (c) => ({
    parClasse: lignesDe(await c.rpc('pilotage_reponses_du_jour')).map((x) => ({ classe: x.classe, nombre: x.nombre })),
    reponses: lignesDe(await c.rpc('pilotage_reponses_recentes', { p_limite: 10 })).map((x) => ({ id: x.id, recu_le: x.recu_le, classe: x.classe, texte_recu: x.texte_recu, reponse_envoyee: x.reponse_envoyee ?? null })),
  }),
  redaction: async (c) => {
    const en = entonnoir(lignesDe(await c.rpc('pilotage_entonnoir', { p_depuis: new Date(c.maintenant.getTime() - 30 * 86_400_000).toISOString() })), c.maintenant)
    const e = envoisDesAgents(lignesDe(await c.rpc('pilotage_envois_du_jour')), [], [], c.maintenant)
    const g = premiere(await c.rpc('pilotage_etat_envoi')) ?? {}
    return { variantes: en.j30.parVariante, envois: e.envois.map((x) => ({ id: x.id, canal: x.canal, type: x.type, variante: x.variante, verdicts: x.verdicts })), rejets: e.rejets, modeles_suspendus: lignesDe(g.modeles_suspendus) }
  },
  machines: async (c) => {
    const cartes = await cartesEquipage(c)
    const lignesA = lignesDe(await c.rpc('pilotage_agents'))
    // passages_cron (0057) : une ligne par nom de cron, son dernier passage et s'il a réussi.
    const pc = await c.deps.db.from('passages_cron').select('nom, reussi, dernier_passage').limit(100)
    if (pc.error) throw new Error(`passages_cron : ${pc.error.message}`)
    const crons = lignesDe(pc.data).map((p) => ({ nom: p.nom, dernier_le: p.dernier_passage, ok: p.reussi === true }))
    const mesure = premiere(await c.rpc('pilotage_evenements', { p_apres: null, p_limite: 1, p_agent: 'usine', p_types: ['usine_mesure'] }))
    const iaEvts = lignesDe(await c.rpc('pilotage_evenements', { p_apres: null, p_limite: 50, p_agent: 'usine', p_types: ['ia_quota', 'ia_bascule'] }))
    const deuxHeures = c.maintenant.getTime() - 2 * 3_600_000, unJour = c.maintenant.getTime() - 24 * 3_600_000
    const recents = iaEvts.filter((x) => Date.parse(x.le) >= deuxHeures)
    const parObjet = new Map<string, any>()
    for (const x of iaEvts) if (x.type === 'ia_quota' && (!parObjet.has(x.objet) || x.id > parObjet.get(x.objet).id)) parObjet.set(x.objet, x)
    const couts = lignesDe(await c.rpc('pilotage_couts_modeles', { p_debut: c.depuisMinuit }))
    let coutJour = 0
    for (const m of couts) coutJour += Number(m.eur ?? 0)
    return {
      agents: cartes.map((x) => ({ nom: x.nom, etat: x.etat, battement_le: lignesA.find((l) => l.nom === x.nom)?.battement_le ?? null, periode_minutes: lignesA.find((l) => l.nom === x.nom)?.periode_minutes ?? null, prochain_le: x.prochain_le })),
      crons,
      usine: mesure ? { valeur: { mesure: mesure.resume, le: mesure.le }, source: 'supabase', a: c.maintenant.toISOString(), cache: false } : nonMesure('supabase', 'aucune mesure de l’usine'),
      ia: recents.length
        ? { valeur: { fournisseurs: [...parObjet.values()].map((x) => ({ objet: x.objet, resume: x.resume, le: x.le })), bascules: iaEvts.filter((x) => x.type === 'ia_bascule' && Date.parse(x.le) >= unJour).slice(0, 20).map((x) => ({ resume: x.resume, le: x.le })), cout_jour_eur: coutJour, le: recents[0].le }, source: 'supabase', a: c.maintenant.toISOString(), cache: false }
        : nonMesure('supabase', 'mesure des IA gratuites absente'),
    }
  },
}

async function lireSalle(c: Contexte, salle: string) {
  if (salle === 'ecommerce') return { valeur: null, source: 'reservee' as never, a: c.maintenant.toISOString(), cache: false, manque: RESERVEE }
  const lecteur = PANNEAUX[salle] ?? lecteurs.LECTEURS[salle]
  if (!lecteur) return aVenir()
  const r = await c.env(`salle.${salle}`, () => lecteur(c) as Promise<Record<string, unknown>>)
  // ACTIVE AUJ. : le temps actif du jour de la salle, sa propre sous-partie (une panne ne vide que cette ligne).
  if (r.valeur && typeof r.valeur === 'object') (r.valeur as Record<string, unknown>).active_auj = await c.env(`salle.${salle}.active_auj`, () => lecteurs.activiteDuJour(c, salle))
  return r
}

/** Une vue de la station, sourcée. Une lecture en panne ne vide que sa sous-partie ; jamais d'exception. */
export async function lireVue(vue: Vue, p: { apres?: number | null; agent?: string | null; salle?: string | null; nom?: string | null }, deps: Deps): Promise<Sourcee<unknown>> {
  const c = contexte(deps)
  if (vue === 'direct') return c.env('direct', () => lireDirect(c))
  if (vue === 'fil') return c.env('fil', () => lireFil(c, p.apres ?? null, p.agent ?? null))
  if (vue === 'agent') return c.env('agent', () => lireAgent(c, p.nom ?? ''))
  return lireSalle(c, p.salle ?? '')
}




