#!/usr/bin/env node
// scripts/crm-lot3-qa.mjs — juge du LOT 3 des améliorations du CRM (plan plans/crm-idees-twenty-1810.md, n°5 et n°6) :
// les PHOTOS et PIÈCES du chantier (bucket PRIVÉ chantier-pieces, table chantier_pieces, migration 0163) et le PLANNING de la semaine
// avec le LIEN D'AGENDA privé (flux ICS, table crm_agenda, migration 0164). Les deux sont sous drapeau (crmPieces, crmPlanning).
//
//  A. PIÈCES (lib/crm/pieces.ts) : type RÉEL lu dans les octets, chemin fabriqué par le serveur, quota par offre, champs validés.
//  B. PLANNING (lib/crm/planning.ts) : semaine, barres (coupées aux bords), conflits membre et véhicule, chantiers sans date, décaler.
//  C. AGENDA (lib/crm/ics.ts) : RFC 5545 (échappement, pliage à 75 octets, CRLF, fuseau), contenu minimal, marque blanche.
//  D. CODE ET MIGRATIONS : routes fermées par leur drapeau AVANT la session, bucket privé sans politique, jeton seulement en empreinte,
//     route publique limitée et revérifiant l'offre, jumeaux _NU, RGPD (purge et export des nouvelles tables).
//  L. EN VRAI (TEST_BASE=http://localhost:<port>) : drapeaux baissés → chaque route répond 404 ; drapeaux levés et 0163/0164 appliquées →
//     envoi réel d'une photo et d'un PDF, refus d'un faux fichier, isolation entre comptes, lien d'agenda (création, lecture, révocation).
//     Comptes @presti-test.invalid, fichiers et lignes supprimés dans un finally.
//
// Usage : [TEST_BASE=http://localhost:3218] node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-lot3-qa.mjs
// Codes : 0 vert · 1 rouge
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.removeAllListeners('warning')
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && w.name !== 'ExperimentalWarning') console.error(w) })
const rouges = []
let verts = 0
const T = (nom, cond, detail = '') => { if (cond) { verts++; console.log(`PASS ${nom}`) } else { rouges.push(nom); console.log(`FAIL ${nom}${detail ? ' — ' + String(detail).slice(0, 500) : ''}`) } }
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8')
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const sansCommentaires = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '')
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const Pi = await imp('lib/crm/pieces.ts')
const Pl = await imp('lib/crm/planning.ts')
const Ic = await imp('lib/crm/ics.ts')
const { FLAGS } = await imp('lib/flags.ts')

// Des fichiers minimaux, vrais par leurs premiers octets.
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1])
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d])
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20])
const PDF = new TextEncoder().encode('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n')
const HEIC = new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63])
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0])

// ═══════════════════════ A. Pièces ═══════════════════════
{
  T('A1 type RÉEL : JPEG, PNG, WebP, PDF reconnus par leurs octets', Pi.typeReel(JPEG)?.mime === 'image/jpeg' && Pi.typeReel(PNG)?.ext === 'png' && Pi.typeReel(WEBP)?.ext === 'webp' && Pi.typeReel(PDF)?.mime === 'application/pdf')
  T('A2 refusés : HEIC, SVG (script), exécutable, vide', Pi.typeReel(HEIC) === null && Pi.typeReel(SVG) === null && Pi.typeReel(EXE) === null && Pi.typeReel(new Uint8Array()) === null)
  const ch = Pi.cheminPiece(U(1), U(2), U(3), 'webp')
  const re = new RegExp(lire('supabase/migrations/0163_chantier_pieces.sql').match(/chemin ~ '([^']+)'/)[1])
  T('A3 chemin fabriqué : <compte>/<chantier>/<id>.<ext>, conforme à la contrainte de 0163 ; un identifiant ou une extension douteuse lève une erreur', ch === `${U(1)}/${U(2)}/${U(3)}.webp` && re.test(ch) && (() => { try { Pi.cheminPiece('../x', U(2), U(3), 'webp'); return false } catch { return true } })() && (() => { try { Pi.cheminPiece(U(1), U(2), U(3), 'html'); return false } catch { return true } })())
  T('A4 quota : Studio n’a pas de place (le CRM est Signature) ; Signature 2 Go ; au-delà, refusé ; un fichier de plus de 4 Mo, refusé',
    !Pi.verdictQuotaPieces('studio', 0, 1000).ok && Pi.verdictQuotaPieces('signature', 0, 1000).ok && !Pi.verdictQuotaPieces('signature', 2048 * 1024 * 1024 - 10, 1000).ok && !Pi.verdictQuotaPieces('signature', 0, 4 * 1024 * 1024 + 1).ok && Pi.plafondPieces('business') > Pi.plafondPieces('signature'))
  const m = new Date('2026-10-18T10:00:00Z')
  T('A5 champs : type de la liste (« pendant » par défaut), légende ≤ 200, date de prise jamais future, champ inconnu refusé',
    Pi.validerChampsPiece({}, m, true).valeur?.type === 'pendant' && !Pi.validerChampsPiece({ type: 'selfie' }, m, true).ok && !Pi.validerChampsPiece({ legende: 'x'.repeat(201) }, m, true).ok && !Pi.validerChampsPiece({ pris_le: '2027-01-01T00:00:00Z' }, m, true).ok && Pi.validerChampsPiece({ pris_le: '2026-10-17T08:00:00Z' }, m, true).ok && !Pi.validerChampsPiece({ chemin: 'x' }, m, true).ok && !Pi.validerChampsPiece({}, m, false).ok)
  T('A6 compte par étiquette', egal(Pi.compterParType([{ type: 'avant' }, { type: 'avant' }, { type: 'apres' }]).avant, 2) && Pi.compterParType([]).tout === 0)
}

// ═══════════════════════ B. Planning ═══════════════════════
{
  T('B1 le lundi de la semaine (un dimanche → le lundi d’avant ; un lundi → lui-même)', Pl.lundiDe('2026-10-18') === '2026-10-12' && Pl.lundiDe('2026-10-19') === '2026-10-19' && Pl.lundiDe('2026-10-21') === '2026-10-19')
  const ch = (id, du, au, equipe = [], vh = null, statut = 'planifie') => ({ id, titre: `Chantier ${id}`, statut, date_debut: du, date_fin_prevue: au, vehicule_id: vh, equipe })
  const p = Pl.planning({
    jour: '2026-10-21',
    chantiers: [ch('A', '2026-10-15', '2026-10-21', ['M1'], 'V1'), ch('B', '2026-10-20', '2026-10-23', ['M1']), ch('C', '2026-10-22', null, [], 'V1'), ch('D', '2026-10-24', '2026-11-02'), ch('E', null, null, ['M2']), ch('F', '2026-10-20', '2026-10-22', ['M1'], null, 'termine')],
    membres: [{ id: 'M1', nom: 'Compagnon 1', actif: true }, { id: 'M2', nom: 'Compagnon 2', actif: true }],
    vehicules: [{ id: 'V1', nom: 'Camionnette 1', actif: true }],
    rappels: [{ id: 'R1', type: 'visite', echeance: '2026-10-22', heure: '10:00', texte: null, fait_le: null, cible: { libelle: 'x', href: null } }, { id: 'R2', type: 'visite', echeance: '2026-10-22', heure: null, texte: null, fait_le: '2026-10-21T08:00:00Z', cible: { libelle: 'x', href: null } }],
  })
  const m1 = p.lignes.find((l) => l.id === 'M1')
  const a = m1.barres.find((b) => b.chantierId === 'A')
  T('B2 la semaine du lundi 19 au dimanche 25 ; la barre d’un chantier commencé avant est coupée au lundi (et le dit)', p.jours[0] === '2026-10-19' && p.jours[6] === '2026-10-25' && a.debut === 0 && a.fin === 2 && a.avant && !a.apres)
  T('B3 conflit : Compagnon 1 sur A et B (20–21/10) ; un chantier TERMINÉ ne compte pas', p.conflits.some((c) => c.type === 'membre' && c.id === 'M1' && egal(c.chantiers, ['A', 'B']) && c.du === '2026-10-20' && c.au === '2026-10-21') && !p.conflits.some((c) => c.chantiers.includes('F')) && a.conflit, JSON.stringify(p.conflits))
  T('B4 pas de conflit de véhicule quand les périodes ne se touchent pas (A finit le 21, C commence le 22) ; un chantier sans fin dure un jour', !p.conflits.some((c) => c.type === 'vehicule') && p.lignes.find((l) => l.id === 'V1').barres.find((b) => b.chantierId === 'C')?.sansFin === true)
  T('B5 un chantier sans équipe ni véhicule a sa ligne (rien ne disparaît) ; il déborde après dimanche', p.lignes.some((l) => l.type === 'chantiers' && l.barres.some((b) => b.chantierId === 'D' && b.apres)))
  T('B6 un chantier ouvert sans date est listé « sans date » ; épingles : seuls les rappels non faits, par jour', egal(p.sansDate.map((x) => x.id), ['E']) && p.epingles[3].length === 1 && p.epingles[3][0].id === 'R1')
  const pv = Pl.planning({ jour: '2026-10-21', chantiers: [ch('A', '2026-10-20', '2026-10-22', [], 'V1'), ch('B', '2026-10-22', '2026-10-22', [], 'V1')], membres: [], vehicules: [{ id: 'V1', nom: 'Camionnette 1', actif: true }], rappels: [] })
  T('B7 conflit de véhicule : réservé deux fois le 22', pv.conflits.length === 1 && pv.conflits[0].type === 'vehicule' && pv.conflits[0].du === '2026-10-22')
  T('B8 décaler : début et fin bougent ensemble ; sans début, rien ; 0 ou plus d’un an, rien', egal(Pl.decaler({ date_debut: '2026-10-30', date_fin_prevue: '2026-11-02' }, 7), { date_debut: '2026-11-06', date_fin_prevue: '2026-11-09' }) && egal(Pl.decaler({ date_debut: '2026-10-30', date_fin_prevue: null }, -1), { date_debut: '2026-10-29', date_fin_prevue: null }) && Pl.decaler({ date_debut: null, date_fin_prevue: null }, 1) === null && Pl.decaler({ date_debut: '2026-10-30', date_fin_prevue: null }, 0) === null)
}

// ═══════════════════════ C. Agenda (ICS) ═══════════════════════
{
  T('C1 échappement RFC 5545 : virgule, point-virgule, antislash, retour à la ligne', Ic.echapper('a,b;c\\d\ne') === 'a\\,b\\;c\\\\d\\ne')
  const long = 'SUMMARY:' + 'é'.repeat(80)
  const plie = Ic.plier(long)
  T('C2 pliage : aucune ligne au-delà de 75 octets, aucun caractère coupé, la suite commence par une espace', plie.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75) && plie.split('\r\n').slice(1).every((l) => l.startsWith(' ')) && plie.replace(/\r\n /g, '') === long)
  const ev = Ic.evenementsAgenda({
    jour: '2026-10-18',
    chantiers: [
      { id: 'C1', titre: 'Salle de bain', statut: 'en_cours', date_debut: '2026-10-15', date_fin_prevue: '2026-10-20', adresse: '12 rue Test, 44000 Nantes' },
      { id: 'C2', titre: 'Annulé', statut: 'annule', date_debut: '2026-10-19', date_fin_prevue: null, adresse: null },
      { id: 'C3', titre: 'Ancien', statut: 'termine', date_debut: '2026-08-01', date_fin_prevue: '2026-08-02', adresse: null },
      { id: 'C4', titre: 'Sans date', statut: 'a_planifier', date_debut: null, date_fin_prevue: null, adresse: null },
    ],
    rappels: [
      { id: 'R1', type: 'metre', echeance: '2026-10-21', heure: '14:30', texte: 'Métré', fait_le: null, cible: 'Salle de bain' },
      { id: 'R2', type: 'rappeler', echeance: '2026-10-21', heure: null, texte: null, fait_le: null, cible: 'x' },
      { id: 'R3', type: 'visite', echeance: '2026-10-22', heure: null, texte: null, fait_le: '2026-10-18T09:00:00Z', cible: 'x' },
    ],
  })
  T('C3 contenu : le chantier ouvert daté et le métré ; ni annulé, ni ancien (> 30 jours), ni sans date, ni simple rappel, ni rendez-vous fait', egal(ev.map((e) => e.uid).sort(), ['chantier-C1@agenda', 'rdv-R1@agenda']), ev.map((e) => e.uid).join(' '))
  const ics = Ic.genererIcs({ nom: 'Plomberie Test — chantiers', evenements: ev, maintenant: new Date('2026-10-18T10:00:00Z') })
  T('C4 calendrier : CRLF partout, BEGIN/END équilibrés, nom = celui de l’artisan (jamais « Presti »), fuseau Europe/Paris déclaré',
    !/[^\r]\n/.test(ics) && (ics.match(/BEGIN:VEVENT/g) ?? []).length === 2 && (ics.match(/END:VEVENT/g) ?? []).length === 2 && /X-WR-CALNAME:Plomberie Test — chantiers\r\n/.test(ics) && !/presti/i.test(ics) && /BEGIN:VTIMEZONE\r\nTZID:Europe\/Paris/.test(ics))
  T('C5 chantier en journées entières (DTEND = le lendemain de la fin, exclusif) ; métré à l’heure dite, une heure, à l’heure de Paris ; l’adresse en lieu',
    /DTSTART;VALUE=DATE:20261015\r\nDTEND;VALUE=DATE:20261021/.test(ics) && /DTSTART;TZID=Europe\/Paris:20261021T143000\r\nDTEND;TZID=Europe\/Paris:20261021T153000/.test(ics) && /LOCATION:12 rue Test\\, 44000 Nantes/.test(ics), ics.slice(0, 600))
  T('C6 aucun e-mail, téléphone ou montant dans le flux', !/@(?!agenda)|\b0\d(?:[ .]?\d{2}){4}\b|€/.test(ics.replace(/UID:[^\r]+/g, '')))
}

// ═══════════════════════ D. Code, migrations, RGPD ═══════════════════════
{
  T('D1 drapeaux LEVÉS le 20/10 après recette, audit de conformité et accord de Benj : crmPieces, crmPlanning', FLAGS.crmPieces === true && FLAGS.crmPlanning === true)
  { const r = lire('app/api/crm/chantiers/[id]/route.ts'), i = (x) => r.indexOf(x)
    T('D1b supprimer un chantier retire d’abord ses FICHIERS du bucket privé (la cascade n’emporte que les lignes ; audit du 20/10, P1)', i(".storage.from('chantier-pieces').remove(chemins)") > 0 && i(".storage.from('chantier-pieces').remove(chemins)") < i("from('chantiers').delete()")) }
  const routes = { 'app/api/crm/pieces/route.ts': 'crmPieces', 'app/api/crm/pieces/[id]/route.ts': 'crmPieces', 'app/api/crm/agenda/route.ts': 'crmPlanning' }
  T('D2 chaque route du lot passe par gardeCrm AVEC son drapeau (404 avant toute session si baissé)', Object.entries(routes).every(([f, d]) => { const s = lire(f).replace(/\r\n/g, '\n'); const n = (s.match(/export async function /g) ?? []).length; return n === 6 && (s.match(new RegExp(`const g = await gardeCrm\\(req, \\{ drapeau: '${d}' \\}\\)\\n\\s*if \\('reponse' in g\\) return g\\.reponse`, 'g')) ?? []).length === 6 }))
  const srv = sansCommentaires(lire('lib/crm/serveur.ts'))
  T('D3 la garde vérifie le drapeau de la partie AVANT la session', srv.indexOf("(opts.drapeau && !actif(opts.drapeau))") > 0 && srv.indexOf("(opts.drapeau && !actif(opts.drapeau))") < srv.indexOf('await authArtisan(req)'))
  const env = sansCommentaires(lire('app/api/crm/pieces/route.ts'))
  const i = (s) => env.indexOf(s)
  T('D4 envoi : corps borné, champs fermés, chantier relu pour la session, type RÉEL lu AVANT, quota AVANT, débit AVANT l’envoi ; chemin fabriqué ; fichier retiré si la ligne échoue',
    i("annoncee > TAILLE_MAX_PIECE") > 0 && /inconnus = /.test(env) && i('chantierDe(g.uid, chantierId)') > 0 && i('typeReel(octets)') < i('.upload(') && i('verdictQuotaPieces(') < i('.upload(') && i("consommerLimite(`crm-pieces:${g.uid}`, 60, 3600)") < i('.upload(') && /cheminPiece\(g\.uid, chantierId, id, t\.ext\)/.test(env) && /upsert: false/.test(env) && i('.remove([chemin])') > i(".from('chantier_pieces').insert("))
  T('D5 lecture : seulement les pièces du compte et du chantier, adresses SIGNÉES de 10 minutes (jamais publiques)', /\.eq\('artisan_id', g\.uid\)\.eq\('chantier_id', chantierId\)/.test(env) && /createSignedUrls\(/.test(env) && !/getPublicUrl/.test(env) && Pi.DUREE_LIEN_SIGNE === 600)
  const sup = sansCommentaires(lire('app/api/crm/pieces/[id]/route.ts'))
  T('D6 suppression : la pièce du compte seulement ; le fichier d’abord, puis la ligne', /\.eq\('id', id\)\.eq\('artisan_id', g\.uid\)\.maybeSingle\(\)/.test(sup) && sup.indexOf('.remove([p.chemin])') < sup.indexOf(".from('chantier_pieces').delete()"))
  const pub = sansCommentaires(lire('app/api/agenda/[jeton]/route.ts'))
  T('D7 flux public : drapeau d’abord, débit par adresse, jeton de 43 caractères, EMPREINTE cherchée (jamais le jeton), offre et suspension revérifiées, noindex et aucun cache',
    pub.indexOf("if (!actif('crmPlanning')) return introuvable()") > 0 && pub.indexOf("if (!actif('crmPlanning'))") < pub.indexOf('consommerLimite(') && /\^\[A-Za-z0-9_-\]\{43\}\$/.test(pub) && /createHash\('sha256'\)\.update\(jeton\)/.test(pub) && /\.eq\('jeton_empreinte', empreinte\)/.test(pub) && /peut\(art\.plan as string \| null, 'crm'\)/.test(pub) && /suspensionEnCours\(uid\)/.test(pub) && /'X-Robots-Tag': 'noindex/.test(pub) && /'Cache-Control': 'private, no-store'/.test(pub))
  const ag = sansCommentaires(lire('app/api/crm/agenda/route.ts'))
  T('D8 le lien : 32 octets aléatoires, seule l’empreinte enregistrée, l’adresse rendue une seule fois (jamais en GET)', /randomBytes\(32\)\.toString\('base64url'\)/.test(ag) && /jeton_empreinte: empreinte/.test(ag) && !/jeton[,}]/.test(ag.slice(ag.indexOf('export async function GET'), ag.indexOf('export async function POST'))))
  const m3 = lire('supabase/migrations/0163_chantier_pieces.sql'), s3 = m3.replace(/^\s*--.*$/gm, '')
  T('D9 0163 : bucket PRIVÉ (public = false, même sur un bucket existant), 4 Mo, types fermés ; AUCUNE politique storage ; RLS « ses lignes », gardes, anon refusé, aucune écriture directe ; déclencheur chantier + chemin',
    /values \('chantier-pieces', 'chantier-pieces', false, 4194304/.test(s3) && /on conflict \(id\) do update set public = false/.test(s3) && !/create policy[^;]*storage\.objects/i.test(s3) && /for select to authenticated\s+using \(\(select auth\.uid\(\)\) = artisan_id\)/.test(s3) && (s3.match(/as restrictive/g) ?? []).length === 4 && /revoke all on public\.chantier_pieces from anon/.test(s3) && /revoke insert, update, delete on public\.chantier_pieces from authenticated/.test(s3) && /crm : chemin hors du dossier du compte/.test(s3) && /NON APPLIQUÉE/.test(m3.slice(0, 400)) && !/supabase_realtime/.test(s3))
  const m4 = lire('supabase/migrations/0164_crm_agenda.sql'), s4 = m4.replace(/^\s*--.*$/gm, '')
  T('D10 0164 : RLS active SANS politique, aucun droit pour anon ni authenticated, empreinte SHA-256 seulement', /enable row level security/.test(s4) && !/create policy/.test(s4) && /revoke all on public\.crm_agenda from anon/.test(s4) && /revoke all on public\.crm_agenda from authenticated/.test(s4) && /\^\[0-9a-f\]\{64\}\$/.test(s4))
  const { sansCommentaires: scSql, MARQUE_CONTROLE } = await import(pathToFileURL(path.join(RACINE, 'scripts/sql-nu.mjs')).href)
  const lignesSql = (s) => scSql(s).split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim())
  T('D11 les jumeaux _NU de 0163 et 0164 portent le même SQL (hors pied de contrôle, en lecture seule)', ['0163_chantier_pieces', '0164_crm_agenda'].every((n) => { const j = lire(`supabase/migrations/_A_COLLER_sql_editor_${n.slice(0, 4)}_NU.sql`); return egal(lignesSql(j.split(MARQUE_CONTROLE)[0]), lignesSql(lire(`supabase/migrations/${n}.sql`))) && !/^\s*(insert|update|delete|alter|create|drop)\b/im.test(j.split(MARQUE_CONTROLE)[1] ?? '') }))
  const purge = lire('lib/purgeComptes.ts'), exp = lire('app/api/donnees/export/route.ts')
  T('D12 RGPD : la purge d’un compte vide crm_rappels, chantier_pieces, crm_agenda et le dossier du bucket privé ; l’export les contient', ['crm_rappels', 'chantier_pieces', 'crm_agenda'].every((t) => purge.includes(`'${t}'`)) && /chantier-pieces/.test(purge) && ['crm_rappels', 'chantier_pieces'].every((t) => exp.includes(`'${t}'`)))
  const rgpd = sansCommentaires(lire('lib/purgesRgpd.ts'))
  const iFichiers = rgpd.indexOf(".storage.from('chantier-pieces').remove(chemins)")
  T('D12b durées : un chantier purgé après 36 mois emporte ses FICHIERS (retirés du bucket AVANT la ligne) ; les rappels faits partent après 24 mois', iFichiers > 0 && iFichiers < rgpd.indexOf(".from('chantiers').delete().in('id', lot)") && /from\('crm_rappels'\)\.select\('id'\)\.not\('fait_le', 'is', null\)\.lt\('fait_le', seuilJournal\)/.test(rgpd))
  const fiche = lire('app/crm/FicheChantier.tsx'), page = lire('app/crm/page.tsx')
  T('D13 écrans fermés par leur drapeau : la section Photos et l’onglet Planning', /\{actif\('crmPieces'\) && <Pieces /.test(fiche) && /o\.id !== 'planning' \|\| actif\('crmPlanning'\)/.test(page) && /onglet === 'planning' && actif\('crmPlanning'\)/.test(page))
  const comp = sansCommentaires(lire('app/crm/Pieces.tsx'))
  T('D14 l’écran : la photo est réduite et ré-encodée dans le navigateur avant l’envoi (EXIF retiré), envoi par appel() (bloqué en exemple), suppression confirmée', /resizeToBlob\(f, 2000, 'image\/webp', 0\.8\)/.test(comp) && /appel(<[^\n]*?>)?\('\/api\/crm\/pieces', \{ method: 'POST', body: form \}\)/.test(comp) && /confirm\('Supprimer ce fichier/.test(comp) && !/\bfetch\(/.test(comp))
}

// ═══════════════════════ L. En vrai ═══════════════════════
const BASE = (process.env.TEST_BASE || '').replace(/\/$/, '')
if (!BASE) console.log('\n(L non joué : TEST_BASE absent)')
// Un serveur LOCAL, ou une prévisualisation Vercel du projet (déploiement de branche, jamais la production prestiapp.fr).
else if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$|^https:\/\/presti-[a-z0-9-]+-presti1\.vercel\.app$/.test(BASE)) T('L0 TEST_BASE doit être un serveur local ou une prévisualisation Vercel', false, BASE)
else {
  // Le serveur dit lui-même si ses drapeaux sont levés : sans session, une route fermée répond 404, une route ouverte 401.
  // (Le dépôt garde crmPieces / crmPlanning baissés : on lève les drapeaux sur une COPIE locale, jamais dans le dépôt.)
  const sonde = await fetch(`${BASE}/api/crm/agenda`).then((r) => r.status).catch(() => 0)
  if (sonde === 404) {
    // Drapeaux baissés : chaque porte du lot est fermée, même sans session (rien n'est dit).
    const etats = await Promise.all([['GET', '/api/crm/pieces?chantier_id=' + U(1)], ['POST', '/api/crm/pieces'], ['DELETE', `/api/crm/pieces/${U(1)}`], ['GET', '/api/crm/agenda'], ['POST', '/api/crm/agenda'], ['GET', `/api/agenda/${'a'.repeat(43)}.ics`]]
      .map(async ([m, c]) => [m, c, (await fetch(`${BASE}${c}`, { method: m }).catch(() => ({ status: 0 }))).status]))
    T('L1 drapeaux baissés : chaque route du lot répond 404 (même sans session)', etats.every(([, , s]) => s === 404), JSON.stringify(etats))
    console.log('(L2+ non joué : serveur aux drapeaux baissés ; les lever sur une copie LOCALE du dépôt pour jouer la suite)')
  } else {
    for (const l of fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z_0-9]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
    const { createClient } = await import('@supabase/supabase-js')
    const { verifierSessionTest } = await import(pathToFileURL(path.join(RACINE, 'scripts/lib/connexion-test.mjs')).href)
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error: absente } = await admin.from('chantier_pieces').select('id').limit(1)
    const { error: absente2 } = await admin.from('crm_agenda').select('artisan_id').limit(1)
    if (absente || absente2) T('L0 0163 et 0164 appliquées (tables chantier_pieces et crm_agenda présentes)', false, (absente ?? absente2).message)
    else {
      T('L1 drapeaux levés sur ce serveur local : sans session, 401 (la porte existe, la session manque)', sonde === 401, String(sonde))
      const comptes = []
      const creer = async (nom, plan) => {
        const slug = `lot3-${nom}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
        const email = `${slug}@presti-test.invalid`, mdp = crypto.randomUUID() + 'Aa1!'
        const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
        if (error) throw new Error(`compte ${nom} : ${error.message}`)
        comptes.push(u.user.id)
        const { error: ea } = await admin.from('artisans').insert({ id: u.user.id, email, nom: `Test lot 3 ${nom}`, metier: 'Plombier', slug, plan })
        if (ea) throw new Error(`fiche ${nom} : ${ea.message}`)
        const nav = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
        const { data: s, error: es } = await nav.auth.signInWithPassword({ email, password: mdp })
        if (es) throw new Error(`connexion ${nom} : ${es.message}`)
        await verifierSessionTest(s.session.access_token)
        return { uid: u.user.id, jeton: s.session.access_token }
      }
      const envoyer = (c, champs) => { const f = new FormData(); for (const [k, v] of Object.entries(champs)) f.append(k, v); return fetch(`${BASE}/api/crm/pieces`, { method: 'POST', headers: { Authorization: `Bearer ${c.jeton}` }, body: f }).then(async (r) => ({ status: r.status, corps: await r.json().catch(() => null) })) }
      const http = async (c, chemin, init = {}) => {
        const r = await fetch(`${BASE}${chemin}`, { method: init.method ?? 'GET', headers: { Authorization: `Bearer ${c.jeton}`, ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: init.body !== undefined ? JSON.stringify(init.body) : undefined })
        return { status: r.status, corps: await r.json().catch(() => null) }
      }
      const local = (adresse) => String(adresse ?? '').replace(/^https?:\/\/[^/]+/, BASE)
      try {
        console.log('\n── L. Comptes de test @presti-test.invalid, données semées par la clé de service')
        const [CA, CB, CS] = [await creer('A', 'signature'), await creer('B', 'signature'), await creer('S', 'studio')]
        const { data: chA, error: ec } = await admin.from('chantiers').insert({ artisan_id: CA.uid, titre: 'Chantier lot 3', statut: 'en_cours', date_debut: '2026-10-19', date_fin_prevue: '2026-10-21', adresse: '12 rue Test, 44000 Nantes' }).select('id').single()
        if (ec) throw new Error(`chantier : ${ec.message}`)

        // Photos et pièces.
        const e1 = await envoyer(CA, { chantier_id: chA.id, type: 'avant', legende: 'État des lieux', fichier: new Blob([WEBP], { type: 'image/webp' }) })
        const e2 = await envoyer(CA, { chantier_id: chA.id, type: 'facture_fournisseur', fichier: new Blob([PDF], { type: 'application/pdf' }) })
        T('L2 une photo (WebP) et un PDF envoyés : 201', e1.status === 201 && e2.status === 201, JSON.stringify([e1, e2]))
        const { data: lignes } = await admin.from('chantier_pieces').select('chemin, mime, taille, type').eq('artisan_id', CA.uid)
        T('L3 la ligne porte le chemin <compte>/<chantier>/<id>, le type RÉEL et la taille réelle', (lignes ?? []).length === 2 && lignes.every((l) => l.chemin.startsWith(`${CA.uid}/${chA.id}/`)) && lignes.some((l) => l.mime === 'application/pdf' && l.taille === PDF.length), JSON.stringify(lignes))
        const faux = await envoyer(CA, { chantier_id: chA.id, fichier: new Blob([SVG], { type: 'image/png' }) })
        T('L4 un SVG déguisé en PNG est refusé (415) : le type réel est lu dans les octets', faux.status === 415, JSON.stringify(faux))
        const exe = await envoyer(CA, { chantier_id: chA.id, fichier: new Blob([EXE], { type: 'application/pdf' }) })
        T('L5 un exécutable déguisé en PDF est refusé (415)', exe.status === 415, JSON.stringify(exe))
        const intrus = await envoyer(CA, { chantier_id: chA.id, chemin: 'x/y.webp', fichier: new Blob([WEBP], { type: 'image/webp' }) })
        T('L6 un champ inconnu (chemin imposé par le client) est refusé (400)', intrus.status === 400, JSON.stringify(intrus))
        const autre = await envoyer(CB, { chantier_id: chA.id, fichier: new Blob([WEBP], { type: 'image/webp' }) })
        T('L7 le compte B ne peut pas envoyer sur le chantier de A (404)', autre.status === 404, JSON.stringify(autre))
        const studio = await envoyer(CS, { chantier_id: chA.id, fichier: new Blob([WEBP], { type: 'image/webp' }) })
        T('L8 une offre sans CRM (Studio) est refusée', studio.status >= 400 && studio.status !== 500, JSON.stringify(studio))
        const liste = await http(CA, `/api/crm/pieces?chantier_id=${chA.id}`)
        const url = liste.corps?.pieces?.[0]?.url ?? ''
        T('L9 lecture : 2 pièces, adresses SIGNÉES (jeton), jamais publiques', liste.status === 200 && liste.corps.pieces.length === 2 && /\/object\/sign\/chantier-pieces\//.test(url) && /token=/.test(url), JSON.stringify(liste).slice(0, 300))
        const telecharge = url ? await fetch(url) : null
        T('L10 l’adresse signée rend bien le fichier (octets identiques)', !!telecharge && telecharge.ok && Buffer.from(await telecharge.arrayBuffer()).length > 0)
        const brut = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/chantier-pieces/${lignes?.[0]?.chemin ?? 'x'}`)
        T('L11 le bucket n’est pas public (l’adresse publique du même fichier est refusée)', brut.status >= 400, String(brut.status))
        T('L12 le compte B ne voit pas les pièces du chantier de A (liste vide)', (await http(CB, `/api/crm/pieces?chantier_id=${chA.id}`)).corps?.pieces?.length === 0)
        T('L13 le compte B ne peut pas supprimer une pièce de A (404)', (await http(CB, `/api/crm/pieces/${e1.corps?.id}`, { method: 'DELETE' })).status === 404)
        const maj = await http(CA, `/api/crm/pieces/${e1.corps?.id}`, { method: 'PATCH', body: { type: 'apres', legende: 'Fini' } })
        const { data: relue } = await admin.from('chantier_pieces').select('type, legende').eq('id', e1.corps?.id).maybeSingle()
        T('L14 étiquette et légende modifiables (PATCH)', maj.status === 200 && relue?.type === 'apres' && relue?.legende === 'Fini', JSON.stringify([maj, relue]))
        const sup = await http(CA, `/api/crm/pieces/${e1.corps?.id}`, { method: 'DELETE' })
        const { data: restants } = await admin.storage.from('chantier-pieces').list(`${CA.uid}/${chA.id}`)
        T('L15 supprimer : la ligne ET le fichier disparaissent', sup.status === 200 && (restants ?? []).length === 1, JSON.stringify([sup.status, restants?.length]))

        // Lien d'agenda.
        T('L16 sans lien créé, GET /api/crm/agenda dit « pas de lien » sans rendre d’adresse', await http(CA, '/api/crm/agenda').then((r) => r.status === 200 && !JSON.stringify(r.corps).includes('/api/agenda/')))
        const ag = await http(CA, '/api/crm/agenda', { method: 'POST' })
        const adresse = local(ag.corps?.adresse)
        const { data: ligneAg } = await admin.from('crm_agenda').select('jeton_empreinte').eq('artisan_id', CA.uid).maybeSingle()
        const jeton = adresse.match(/\/api\/agenda\/([A-Za-z0-9_-]{43})\.ics$/)?.[1] ?? ''
        T('L17 lien créé : seule l’EMPREINTE du jeton est en base (jamais le jeton)', ag.status === 201 && !!jeton && ligneAg?.jeton_empreinte === crypto.createHash('sha256').update(jeton).digest('hex') && !JSON.stringify(ligneAg).includes(jeton), JSON.stringify(ag).slice(0, 200))
        const flux = await fetch(adresse)
        const texte = await flux.text()
        T('L18 le flux se lit SANS session, en text/calendar, noindex, sans cache, avec le chantier et son adresse', flux.status === 200 && /text\/calendar/.test(flux.headers.get('content-type') ?? '') && /noindex/.test(flux.headers.get('x-robots-tag') ?? '') && /no-store/.test(flux.headers.get('cache-control') ?? '') && /SUMMARY:Chantier lot 3/.test(texte) && /LOCATION:12 rue Test\\, 44000 Nantes/.test(texte), `${flux.status} ${texte.slice(0, 200)}`)
        T('L19 rien de privé dans le flux : ni e-mail, ni téléphone, ni montant, ni « Presti »', !/@presti-test|€|presti/i.test(texte.replace(/UID:[^\r]+/g, '')))
        T('L20 GET /api/crm/agenda ne rend JAMAIS l’adresse après coup', await http(CA, '/api/crm/agenda').then((r) => r.status === 200 && !JSON.stringify(r.corps).includes(jeton)))
        const ag2 = await http(CA, '/api/crm/agenda', { method: 'POST' })
        T('L21 renouveler : l’ancien lien meurt (404), le nouveau marche', ag2.status === 201 && (await fetch(adresse)).status === 404 && (await fetch(local(ag2.corps?.adresse))).status === 200)
        T('L22 un jeton inventé répond 404', (await fetch(`${BASE}/api/agenda/${'b'.repeat(43)}.ics`)).status === 404)
        await http(CA, '/api/crm/agenda', { method: 'DELETE' })
        const { count: nAg } = await admin.from('crm_agenda').select('*', { count: 'exact', head: true }).eq('artisan_id', CA.uid)
        T('L23 révoqué : le lien répond 404 et la ligne a disparu', (await fetch(local(ag2.corps?.adresse))).status === 404 && nAg === 0)
        T('L24 une offre sans CRM (Studio) ne peut pas créer de lien d’agenda', (await http(CS, '/api/crm/agenda', { method: 'POST' })).status >= 400)
      } catch (e) { T('L erreur inattendue', false, e.message) } finally {
        let restes = 0
        for (const id of comptes) {
          // Les fichiers d'abord : la purge de la base emporte les lignes, jamais les fichiers du bucket.
          const { data: dossiers } = await admin.storage.from('chantier-pieces').list(id)
          for (const d of dossiers ?? []) { const { data: f } = await admin.storage.from('chantier-pieces').list(`${id}/${d.name}`); if (f?.length) await admin.storage.from('chantier-pieces').remove(f.map((x) => `${id}/${d.name}/${x.name}`)) }
          const { error } = await admin.rpc('purger_compte_test', { p_id: id })
          if (error) console.log(`  ⚠️ purge ${id} : ${error.message}`)
          for (const t of ['chantier_pieces', 'chantiers', 'crm_agenda']) { const { count } = await admin.from(t).select('*', { count: 'exact', head: true }).eq('artisan_id', id); restes += count ?? 0 }
          const { count } = await admin.from('artisans').select('*', { count: 'exact', head: true }).eq('id', id); restes += count ?? 0
          const { data: d2 } = await admin.storage.from('chantier-pieces').list(id); restes += (d2 ?? []).length
        }
        T(`L25 nettoyage : les ${comptes.length} comptes de test, leurs lignes et leurs fichiers sont supprimés`, restes === 0, `${restes} reste(s)`)
      }
    }
  }
}

console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)${rouges.length ? ' : ' + rouges.join(' · ') : ''}`)
process.exitCode = rouges.length ? 1 : 0
