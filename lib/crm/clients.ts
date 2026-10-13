// CRM — qui est le client ? Le regroupement des pièces par personne, pour la fiche client 360°.
//
// La table `clients` (0002) existe mais aucun chemin ne la remplit : devis et factures portent le client EN CLAIR
// (client_nom, client_email), la demande porte nom_prospect et contact (e-mail ou téléphone). On regroupe donc :
//   1. par lien : une facture va avec son devis, un devis avec sa demande, un chantier avec son devis ;
//   2. par identifiant fort : même e-mail (casse ignorée) ou même téléphone (chiffres, +33 ramené à 0) ;
//   3. par NOM seulement entre pièces qui n'ont ni e-mail ni téléphone. Deux « M. Martin » aux e-mails différents restent
//      deux clients : un nom seul ne fusionne jamais deux identifiants forts différents.
// La clé d'un groupe est son identifiant le plus fort (e-mail, puis téléphone, puis nom), rangé : l'identifiant public
// du client (l'adresse de sa fiche, crm_notes.client_cle) en est l'empreinte — jamais l'adresse en clair. Depuis le 13/10
// (audit d'attaque), cette empreinte est un HMAC avec un secret SERVEUR et l'artisan (lib/crm/empreinte.ts) : elle ne se
// recalcule plus à partir d'une adresse devinée. Ce module ne la calcule pas lui-même : l'appelant donne `idDe`.
//
// Une demande effacée à la demande du client (app/api/donnees) porte le nom « (client supprimé) » : ce n'est pas un nom,
// et deux demandes effacées ne sont jamais regroupées en un faux client (audit RGPD du 12/10, point e).
//
// Fonctions pures, sans dépendance : utilisables à l'écran (exemple) comme sur le serveur. Rejoué par scripts/crm-qa.mjs.

export type DevisC = { id: string; artisan_id?: string | null; lead_id?: string | null; client_nom?: string | null; client_email?: string | null; client_adresse?: string | null; created_at?: string | null }
export type FactureC = { id: string; artisan_id?: string | null; devis_id?: string | null; client_nom?: string | null; client_email?: string | null; date_emission?: string | null }
export type LeadC = { id: string; artisan_id?: string | null; nom_prospect?: string | null; contact?: string | null; created_at?: string | null }
export type ChantierC = { id: string; artisan_id?: string | null; devis_id?: string | null; client_nom?: string | null; cree_le?: string | null }
export type ClientCarnet = { id: string; artisan_id?: string | null; nom?: string | null; email?: string | null; tel?: string | null; adresse?: string | null; code_postal?: string | null; ville?: string | null }

export type GroupeClient = {
  /** Empreinte de la clé (64 hex, lib/crm/empreinte.ts) : l'identifiant public du client. */
  id: string
  cle: string
  nom: string | null
  email: string | null
  telephone: string | null
  adresse: string | null
  devis: string[]
  factures: string[]
  leads: string[]
  chantiers: string[]
  carnet: string[]
  derniere: string | null
}

/** Le nom posé par l'effacement d'une conversation (app/api/donnees) : jamais une clé de regroupement. */
export const NOM_EFFACE = '(client supprimé)'

const RE_EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/
export function cleEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim().toLowerCase()
  return RE_EMAIL.test(t) ? t : null
}
export function cleTelephone(v: unknown): string | null {
  if (typeof v !== 'string' || /@/.test(v)) return null
  let d = v.replace(/[^\d+]/g, '')
  if (d.startsWith('+33')) d = '0' + d.slice(3)
  else if (d.startsWith('0033')) d = '0' + d.slice(4)
  d = d.replace(/\D/g, '')
  return d.length >= 9 && d.length <= 15 ? d : null
}
export function cleNom(v: unknown): string | null {
  if (typeof v !== 'string' || v.trim() === NOM_EFFACE) return null
  const t = v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return t.length >= 2 ? t : null
}
const texte = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim() : null)

type Noeud = { cle: string; type: 'devis' | 'facture' | 'lead' | 'chantier' | 'carnet'; id: string; forts: string[]; nom: string | null; nomAffiche: string | null; email: string | null; tel: string | null; adresse: string | null; date: string | null }

export type EntreesClients = {
  artisanId: string
  devis: readonly DevisC[]
  factures: readonly FactureC[]
  leads: readonly LeadC[]
  chantiers: readonly ChantierC[]
  carnet?: readonly ClientCarnet[]
  /** L'identifiant public d'une clé de groupe : l'empreinte HMAC sur le serveur (lib/crm/empreinte.ts). */
  idDe: (cle: string) => string
}

export function regrouperClients(e: EntreesClients): GroupeClient[] {
  const mien = <T extends { artisan_id?: string | null }>(l: readonly T[] | undefined) => (l ?? []).filter((x) => !!x && x.artisan_id === e.artisanId)
  const noeuds: Noeud[] = []
  const ajouter = (type: Noeud['type'], id: string, nom: unknown, email: unknown, tel: unknown, adresse: unknown, date: unknown) => {
    const em = cleEmail(email), te = cleTelephone(tel)
    noeuds.push({
      cle: `${type}:${id}`, type, id,
      forts: [em ? `e:${em}` : null, te ? `t:${te}` : null].filter((x): x is string => !!x),
      nom: cleNom(nom), nomAffiche: cleNom(nom) ? texte(nom) : null, email: em, tel: te, adresse: texte(adresse), date: typeof date === 'string' ? date : null,
    })
  }
  const devis = mien(e.devis), factures = mien(e.factures), leads = mien(e.leads), chantiers = mien(e.chantiers), carnet = mien(e.carnet)
  for (const d of devis) ajouter('devis', d.id, d.client_nom, d.client_email, null, d.client_adresse, d.created_at)
  for (const f of factures) ajouter('facture', f.id, f.client_nom, f.client_email, null, null, f.date_emission)
  for (const l of leads) ajouter('lead', l.id, l.nom_prospect, l.contact, l.contact, null, l.created_at)
  for (const c of chantiers) ajouter('chantier', c.id, c.client_nom, null, null, null, c.cree_le)
  for (const c of carnet) ajouter('carnet', c.id, c.nom, c.email, c.tel, [c.adresse, c.code_postal, c.ville].filter(Boolean).join(' '), null)

  // Union-find sur les nœuds.
  const parent = new Map<string, string>(noeuds.map((n) => [n.cle, n.cle]))
  const racine = (k: string): string => { let r = k; while (parent.get(r) !== r) r = parent.get(r)!; let x = k; while (parent.get(x) !== r) { const s = parent.get(x)!; parent.set(x, r); x = s } return r }
  const unir = (a: string, b: string) => { if (!parent.has(a) || !parent.has(b)) return; const ra = racine(a), rb = racine(b); if (ra !== rb) parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb) }
  // 1. Les liens.
  for (const f of factures) if (f.devis_id) unir(`facture:${f.id}`, `devis:${f.devis_id}`)
  for (const d of devis) if (d.lead_id) unir(`devis:${d.id}`, `lead:${d.lead_id}`)
  for (const c of chantiers) if (c.devis_id) unir(`chantier:${c.id}`, `devis:${c.devis_id}`)
  // 2. Les identifiants forts partagés.
  const parFort = new Map<string, string>()
  for (const n of noeuds) for (const k of n.forts) { const p = parFort.get(k); if (p) unir(p, n.cle); else parFort.set(k, n.cle) }
  // 3. Le nom, seulement entre groupes SANS identifiant fort (calculé après les étapes 1 et 2).
  const fortsDuGroupe = new Map<string, Set<string>>()
  for (const n of noeuds) { const r = racine(n.cle); const s = fortsDuGroupe.get(r) ?? new Set<string>(); n.forts.forEach((k) => s.add(k)); fortsDuGroupe.set(r, s) }
  const parNom = new Map<string, string>()
  for (const n of noeuds) {
    if (!n.nom || (fortsDuGroupe.get(racine(n.cle))?.size ?? 0) > 0) continue
    const p = parNom.get(n.nom)
    if (p) unir(p, n.cle); else parNom.set(n.nom, n.cle)
  }

  const groupes = new Map<string, Noeud[]>()
  for (const n of noeuds) { const r = racine(n.cle); groupes.set(r, [...(groupes.get(r) ?? []), n]) }
  const sortie: GroupeClient[] = []
  for (const membres of groupes.values()) {
    const forts = [...new Set(membres.flatMap((m) => m.forts))].sort((a, b) => (a[0] === b[0] ? a.localeCompare(b) : a[0] === 'e' ? -1 : b[0] === 'e' ? 1 : a.localeCompare(b)))
    const noms = membres.map((m) => m.nom).filter((x): x is string => !!x).sort()
    // Un groupe sans aucun identifiant (ni e-mail, ni téléphone, ni nom) n'est pas un client qu'on sait nommer : il n'a pas
    // de fiche (la pièce reste visible dans Devis / Factures / Messages).
    const cle = forts[0] ?? (noms[0] ? `n:${noms[0]}` : null)
    if (!cle) continue
    const plusRecent = [...membres].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
    const ids = (t: Noeud['type']) => membres.filter((m) => m.type === t).map((m) => m.id).sort()
    sortie.push({
      id: e.idDe(cle), cle,
      nom: plusRecent.find((m) => m.nomAffiche)?.nomAffiche ?? null,
      email: plusRecent.find((m) => m.email)?.email ?? null,
      telephone: plusRecent.find((m) => m.tel)?.tel ?? null,
      adresse: plusRecent.find((m) => m.adresse)?.adresse ?? null,
      devis: ids('devis'), factures: ids('facture'), leads: ids('lead'), chantiers: ids('chantier'), carnet: ids('carnet'),
      derniere: plusRecent.find((m) => m.date)?.date ?? null,
    })
  }
  return sortie.sort((a, b) => String(b.derniere ?? '').localeCompare(String(a.derniere ?? '')) || a.id.localeCompare(b.id))
}

/** Retrouver le groupe d'une fiche : par son identifiant public, ou par une de ses pièces (« d-<uuid> », « l-… », « c-… »). */
export function trouverGroupe(groupes: readonly GroupeClient[], ref: string): GroupeClient | null {
  if (/^[0-9a-f]{64}$/.test(ref)) return groupes.find((g) => g.id === ref) ?? null
  const m = /^([dlcf])-([0-9a-f-]{36})$/i.exec(ref)
  if (!m) return null
  const id = m[2].toLowerCase()
  const champ = { d: 'devis', l: 'leads', c: 'chantiers', f: 'factures' } as const
  return groupes.find((g) => g[champ[m[1].toLowerCase() as 'd' | 'l' | 'c' | 'f']].includes(id)) ?? null
}
