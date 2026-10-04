// Socle des jeux d'essai de usine-pubs-qa (026-199) : chemins, outils, analyseur INI des unités systemd, données d'essai
// (un pack payé, une marque fictive, des chaînes piégées). Tout est synthétique : aucune vraie donnée, aucune vraie clé.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const ICI = path.dirname(fileURLToPath(import.meta.url))
export const DEPOT = path.resolve(ICI, '..', '..', '..')
export const TRAVAIL = path.join(DEPOT, '.orchestre', 'travail', 'usine-pubs-qa')
export const PREUVES = path.join(DEPOT, '.orchestre', 'preuves', '026-199')
export const LINUX = process.platform === 'linux'

export const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex')
export const hasard = (n = 12) => crypto.randomBytes(n).toString('hex').slice(0, n)
export const lf = (t) => String(t ?? '').replace(/\r\n/g, '\n')
export const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
export const existe = (racine, rel) => { try { return fs.statSync(path.join(racine, rel)).isFile() } catch { return false } }
export const taille = (racine, rel) => { try { return fs.statSync(path.join(racine, rel)).size } catch { return -1 } }
export const lire = (racine, rel) => { try { return lf(fs.readFileSync(path.join(racine, rel), 'utf8')) } catch { return null } }
export const uuid = () => crypto.randomUUID()
export function vider(dossier) { fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true }); return dossier }

/** Les sept fichiers que 026-200 livre (UP-1) et les deux unités (UP-10). */
export const FICHIERS = [
  'app/api/usine/pubs/travail/route.ts', 'app/api/usine/pubs/depot/route.ts', 'app/api/usine/pubs/rendu/route.ts',
  'lib/pubs/usinePubs.ts', 'scripts/usine/pubs.mjs', 'scripts/usine/systemd/presti-pubs.service', 'scripts/usine/systemd/presti-pubs.timer',
]
export const ROUTES = { travail: FICHIERS[0], depot: FICHIERS[1], rendu: FICHIERS[2] }
export const AGENT = 'studio'
export const AUTRES_AGENTS = ['livreur_usine', 'atelier_maquettes']
export const BUCKET = 'packs-pubs'
export const BUCKET_PHOTOS = 'artisan-media'
export const GO = 1024 ** 3

/** Un analyseur INI pour les unités systemd : { Section: { Cle: [valeurs…] } } (une clé répétée garde toutes ses valeurs). */
export function ini(texte) {
  const o = {}
  let section = null
  for (const brute of lf(texte).split('\n')) {
    const l = brute.trim()
    if (!l || l.startsWith('#') || l.startsWith(';')) continue
    const s = /^\[([A-Za-z]+)\]$/.exec(l)
    if (s) { section = s[1]; o[section] ??= {}; continue }
    const m = /^([A-Za-z0-9]+)\s*=\s*(.*)$/.exec(l)
    if (m && section) (o[section][m[1]] ??= []).push(m[2].trim())
  }
  return o
}

// ── les chaînes piégées : elles ne doivent jamais sortir d'où elles n'ont pas à sortir ──────────────────────────────────────
export const SENTINELLES = {
  courriel_client: 'client.sentinelle@exemple.invalid',
  telephone_artisan: '06 98 76 54 32',
  courriel_artisan: 'artisan.sentinelle@exemple.invalid',
  courriel_marque: 'responsable.marque@exemple.invalid',
  telephone_marque: '06 12 34 56 78',
  message_id: '<accord-sentinelle-42@marque-temoin.invalid>',
}
export const TOKEN_FORMAT = (nom) => `pa_${nom}_${crypto.randomBytes(32).toString('base64url')}`

// ── un petit JPEG, PNG et MP4 valides par leurs octets magiques ──────────────────────────────────────────────────────────
export const JPEG = (graine = 'a') => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(`JFIF-essai-${graine}`.padEnd(64, '.')), Buffer.from([0xff, 0xd9])])
export const PNG = (graine = 'a') => Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from(`PNG-essai-${graine}`.padEnd(64, '.'))])
export const MP4 = (graine = 'a', octets = 256) => Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.from(`MP4-essai-${graine}`.padEnd(Math.max(octets - 12, 16), '.'))])

/** Les données d'essai d'un passage : `origine` est celle du faux Supabase (les photos de l'artisan y vivent). */
export function donnees(origine) {
  const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222'
  const ART = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', FOND = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
  const photo = (i, role) => ({ url: `${origine}/storage/v1/object/public/${BUCKET_PHOTOS}/${ART}/photo-${i}.jpg`, role, personnes: false, accord_personnes: false })
  const matiere = {
    metier: 'Menuiserie', ville: 'Rennes', communes: ['Rennes'], duree_travaux: '3 jours', materiaux: 'chêne massif', cta: 'devis',
    telephone: null, voix: 'aucune', texte_voix: null, decennale: true, accroche: 'artisan_de_confiance',
    photos: [photo(1, 'avant'), photo(2, 'chantier'), photo(3, 'detail'), photo(4, 'apres')],
  }
  const ligne = (id, paye) => ({
    id, artisan_id: ART, commande_site_id: null, email: SENTINELLES.courriel_client, etat: 'payee', matiere, prix_cents: 14900, type: 'locale', marque_cle: null,
    devise: 'eur', stripe_session_id: `cs_${id.slice(0, 8)}`, stripe_payment_intent_id: `pi_${id.slice(0, 8)}`, paye_le: paye, fabrique_le: null, livre_le: null,
    lien_expire_le: null, fichiers_effaces_le: null, verifications: null, consigne: null, refaits: 0, cree_le: paye, modifie_le: paye,
  })
  return {
    ids: { A, B, ART, FOND, DECISION: '33333333-3333-4333-8333-333333333333', DECISION_OPPOSEE: '44444444-4444-4444-8444-444444444444', DECISION_REFUSEE: '55555555-5555-4555-8555-555555555555' },
    packs: () => [
      ligne(A, '2026-10-01T08:00:00Z'), ligne(B, '2026-10-02T08:00:00Z'),
      { ...ligne('66666666-6666-4666-8666-666666666666', '2026-09-30T08:00:00Z'), etat: 'brouillon', paye_le: null },
      { ...ligne('77777777-7777-4777-8777-777777777777', '2026-09-29T08:00:00Z'), etat: 'fabriquee', fabrique_le: '2026-09-29T09:00:00Z' },
    ],
    artisans: () => [
      { id: ART, slug: 'menuiserie-temoin', domaine: 'menuiserie-temoin.invalid', domaine_verifie: true, telephone: SENTINELLES.telephone_artisan, email: SENTINELLES.courriel_artisan, is_founder: false },
      { id: FOND, slug: 'fondateur', domaine: null, domaine_verifie: false, telephone: null, email: 'fondateur@exemple.invalid', is_founder: true },
    ],
    photos: () => [1, 2, 3, 4].map((i) => ({ chemin: `${ART}/photo-${i}.jpg`, octets: JPEG(`photo-${i}`) })),
    marques: (urlPage) => [
      { decision_id: '33333333-3333-4333-8333-333333333333', marque_cle: 'maison-temoin-seize', page_produit: urlPage, accord_message_id: SENTINELLES.message_id, accord_recu_le: '2026-09-30T09:12:00Z',
        // la phrase d'accord porte elle-même l'adresse et le numéro de la marque : un extrait qui ne les masque pas les laisse sortir
        accord_texte: `Bonjour, oui, vous pouvez utiliser nos photos pour un essai vidéo, avec plaisir, écrivez-moi à ${SENTINELLES.courriel_marque} ou appelez le ${SENTINELLES.telephone_marque} pour la suite. ${'Merci encore pour votre message. '.repeat(30)}`,
        opposition: false, refus: false, echantillons_refuses: [] },
      { decision_id: '44444444-4444-4444-8444-444444444444', marque_cle: 'marque-opposee', page_produit: urlPage, accord_message_id: '<opp@marque.invalid>', accord_recu_le: '2026-09-28T09:12:00Z', accord_texte: 'oui', opposition: true, refus: false, echantillons_refuses: [] },
      { decision_id: '55555555-5555-4555-8555-555555555555', marque_cle: 'marque-refusee', page_produit: urlPage, accord_message_id: '<ref@marque.invalid>', accord_recu_le: '2026-09-27T09:12:00Z', accord_texte: 'oui', opposition: false, refus: true, echantillons_refuses: [1] },
    ],
  }
}
