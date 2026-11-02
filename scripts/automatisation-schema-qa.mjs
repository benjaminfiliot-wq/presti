// Les migrations 0185 (automatisation), 0186 (SMS aux clients) et 0187 (factures.envoyee_le) tiennent-elles leurs promesses de
// sécurité multi-locataire, AVANT que Benj ne les pose ? (chantier 4, lots L6a et L7 ; plan §8.2, §8.3, §11 ; tâche 032-025)
//
// Partie STATIQUE, toujours jouée, hors ligne : elle lit les trois fichiers et prouve, table par table :
//   en-tête « NON APPLIQUÉE » et retour arrière écrit ; RLS activée ; les quatre gardes de 0138 posées ; anon retiré ; écritures
//   retirées à authenticated ; seules des politiques de LECTURE de ses propres lignes ; clés d'unicité (dont l'index unique partiel des
//   opportunités ouvertes) ; aucune colonne organization_id ; montants en entier ; faits sans texte libre ; aucune fonction en
//   security definer, search_path vide partout ; rien pour n8n_lecture ; jumeaux identiques à leur migration.
// MUTANTS : chaque garde est retirée ou affaiblie à son tour dans une copie en mémoire ; la vérification visée DOIT rougir, sinon la
//   suite ne prouve rien et rougit elle-même.
// Partie PGLITE, seulement si PGLITE_DIR est posé (dossier où `npm install @electric-sql/pglite` a été fait, comme crm-sql-qa.mjs) :
//   rejoue 0138, 0185, 0186 et 0187 deux fois sur un socle factice, puis prouve les mêmes promesses par des requêtes réelles sous les
//   rôles anon, authenticated et service. PGLITE_DIR posé mais paquet introuvable : code 2 (ni vert ni rouge).
//
// Ce qu'elle NE prouve PAS : le comportement de la vraie base Supabase (essai à sec de la session principale, plan §8.3 l.574-575).
// Aucune donnée réelle : des identifiants tirés au hasard.
// Usage : node scripts/automatisation-schema-qa.mjs     Codes : 0 vert · 1 rouge · 2 prérequis PGlite absent alors que PGLITE_DIR est posé
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { sansCommentaires, MARQUE_CONTROLE } from './sql-nu.mjs'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(RACINE, 'supabase/migrations')
const FICHIERS = { '0185': '0185_automatisation.sql', '0186': '0186_sms_clients.sql', '0187': '0187_factures_envoyee_le.sql' }
const lire = (nom) => fs.readFileSync(path.join(DIR, nom), 'utf8')

const TABLES = {
  '0185': ['evenements_metier', 'detecteurs_reglages', 'autonomie_reglages', 'passages_detecteurs', 'opportunites', 'opportunites_decisions', 'relances_exclusions'],
  '0186': ['sms_envois', 'sms_oppositions', 'sms_expediteurs'],
  '0187': [],
}
const SANS_LECTURE = new Set(['passages_detecteurs']) // aucune ligne n'appartient à un artisan
const FERMES = ['resolue', 'refusee', 'expiree', 'annulee', 'reussie']
const OUVERTS = ['detectee', 'a_completer', 'preparee', 'bloquee', 'a_valider', 'programmee', 'validee', 'reportee', 'manuel', 'partie', 'echec']

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const espaces = (s) => s.replace(/\s+/g, ' ')

/** Le corps entre parenthèses qui suit `create table if not exists public.<t>`, ou null. */
function corpsTable(code, t) {
  const m = new RegExp(`create table if not exists public\\.${esc(t)}\\s*\\(`, 'i').exec(code)
  if (!m) return null
  let i = m.index + m[0].length, prof = 1, dansChaine = false
  for (; i < code.length && prof > 0; i++) {
    const c = code[i]
    if (c === "'") dansChaine = !dansChaine
    else if (!dansChaine && c === '(') prof++
    else if (!dansChaine && c === ')') prof--
  }
  return code.slice(m.index + m[0].length, i - 1)
}

/** Le bloc `do $gardes$ … $gardes$`, la liste des tables qu'il parcourt, et son corps aplati. */
function blocGardes(code) {
  const m = /do \$gardes\$([\s\S]*?)\$gardes\$/i.exec(code)
  if (!m) return { tables: [], corps: '' }
  const a = /foreach t in array array\[([^\]]*)\]/i.exec(m[1])
  const tables = a ? [...a[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]) : []
  return { tables, corps: espaces(m[1]) }
}

/** Toutes les instructions `create policy … on public.<t> …;` (aplaties). */
const politiques = (code, t) => [...espaces(code).matchAll(new RegExp(`create policy (\\w+) on public\\.${esc(t)} ([^;]*);`, 'gi'))]
  .map((m) => ({ nom: m[1], texte: m[2] }))

const GARDES_ATTENDUES = [
  ['anon retiré', /revoke all on public\.%I from anon/i],
  ['écritures retirées à authenticated', /revoke insert, update, delete, truncate[^']*on public\.%I from authenticated/i],
  ['garde_session', /create policy garde_session on public\.%I as restrictive for all to authenticated using \(\(select public\.jeton_session_valide\(\)\)\) with check \(\(select public\.jeton_session_valide\(\)\)\)/i],
  ['garde_suspension_ins', /create policy garde_suspension_ins on public\.%I as restrictive for insert to authenticated with check \(\(select public\.compte_non_suspendu\(\)\)\)/i],
  ['garde_suspension_maj', /create policy garde_suspension_maj on public\.%I as restrictive for update to authenticated using \(\(select public\.compte_non_suspendu\(\)\)\) with check \(\(select public\.compte_non_suspendu\(\)\)\)/i],
  ['garde_suspension_sup', /create policy garde_suspension_sup on public\.%I as restrictive for delete to authenticated using \(\(select public\.compte_non_suspendu\(\)\)\)/i],
]

/** Rend la liste des vérifications { nom, ok, detail } sur les trois textes donnés (bruts, commentaires compris). */
function verifier(textes) {
  const res = []
  const T = (nom, ok, detail = '') => res.push({ nom, ok: !!ok, detail })
  for (const [num, brut] of Object.entries(textes)) {
    const code = sansCommentaires(brut)
    const plat = espaces(code)
    const tete = brut.slice(0, 1500)
    T(`${num} en-tête « NON APPLIQUÉE, préparée le 02/11, attend le go écrit de Benj »`, /NON APPLIQUÉE, préparée le 02\/11, attend le go écrit de Benj/.test(tete))
    const ra = /Retour arrière[^\n]*\n((?:--[^\n]*\n)+)/.exec(brut)
    T(`${num} retour arrière écrit`, ra && /drop (table|column|constraint|function)/.test(ra[1]))
    for (const t of TABLES[num]) {
      T(`${num} ${t} : retour arrière la retire`, ra && new RegExp(`drop table if exists public\\.${esc(t)};`).test(ra[1]))
      const corps = corpsTable(code, t)
      T(`${num} ${t} : créée`, corps !== null)
      if (corps === null) continue
      T(`${num} ${t} : aucune colonne organization_id`, !/\borgani[sz]ation_id\b/i.test(corps))
      T(`${num} ${t} : colonnes en français (cree_le, ni created_at ni updated_at)`, /\bcree_le\b/.test(corps) && !/\b(created_at|updated_at)\b/.test(corps))
      T(`${num} ${t} : RLS activée`, new RegExp(`alter table public\\.${esc(t)} enable row level security;`, 'i').test(code))
      const g = blocGardes(code)
      T(`${num} ${t} : dans la boucle des gardes`, g.tables.includes(t), `boucle : ${g.tables.join(', ') || '(absente)'}`)
      for (const [nom, re] of GARDES_ATTENDUES) T(`${num} ${t} : ${nom}`, g.tables.includes(t) && re.test(g.corps))
      const pols = politiques(code, t).filter((p) => !p.nom.startsWith('garde_'))
      const ouvertes = pols.filter((p) => !/^for select to authenticated using \(\(select auth\.uid\(\)\) = artisan_id\)$/i.test(p.texte.trim()))
      T(`${num} ${t} : seules des politiques de lecture de ses lignes`, ouvertes.length === 0, ouvertes.map((p) => `${p.nom} ${p.texte}`).join(' | '))
      if (SANS_LECTURE.has(t)) {
        T(`${num} ${t} : aucune politique, rien pour authenticated`, pols.length === 0 && new RegExp(`revoke all on public\\.${esc(t)} from authenticated;`, 'i').test(code))
      } else {
        T(`${num} ${t} : l'artisan lit ses lignes`, pols.length === 1)
      }
      T(`${num} ${t} : rien n'est accordé à anon ni à authenticated`, !new RegExp(`grant [^;]* on (table )?public\\.${esc(t)}\\b[^;]* to [^;]*(anon|authenticated|public)`, 'i').test(plat))
    }
    T(`${num} aucune colonne organization_id dans le fichier`, !/\borgani[sz]ation_id\b/i.test(code))
    T(`${num} aucune fonction en security definer`, !/security definer/i.test(code))
    const fonctions = [...plat.matchAll(/create or replace function (public\.\w+)\(([^)]*)\)([^$]*)\$/gi)]
    T(`${num} chaque fonction a un search_path vide`, fonctions.every((f) => /set search_path = ''/.test(f[3])), fonctions.filter((f) => !/set search_path = ''/.test(f[3])).map((f) => f[1]).join(', '))
    T(`${num} rien pour n8n_lecture (0189 reste inutilisé par n8n, plan §0.1)`, !/n8n_lecture/i.test(code))
    T(`${num} aucun grant à anon`, !/grant [^;]* to [^;]*\banon\b/i.test(plat))
  }

  const c85 = sansCommentaires(textes['0185'] ?? ''), p85 = espaces(c85)
  const ev = corpsTable(c85, 'evenements_metier') ?? '', op = corpsTable(c85, 'opportunites') ?? ''
  T('0185 evenements_metier : unique par (artisan_id, cle)', /unique \(artisan_id, cle\)/.test(espaces(ev)))
  T('0185 evenements_metier : faits sans texte libre', /check \(public\.faits_sans_texte\(faits\)\)/.test(espaces(ev)))
  T('0185 opportunites : faits sans texte libre', /check \(public\.faits_sans_texte\(faits\)\)/.test(espaces(op)))
  T('0185 faits_sans_texte : une chaîne n’est qu’un code, un uuid ou une date', p85.includes(`(e.value #>> '{}') !~ '^([a-z][a-z0-9_:.-]{0,63}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9]{4}-[0-9]{2}-[0-9]{2}([T ][0-9:.+Z-]{0,20})?)$'`))
  T('0185 opportunites : montant_centimes en entier', /montant_centimes (bigint|integer)\b/.test(espaces(op)) && !/montant_centimes (numeric|real|double|float|decimal)/i.test(espaces(op)))
  const idx = /create unique index if not exists opportunites_ouverte_unique on public\.opportunites \(artisan_id, cle\) where statut not in \(([^)]*)\);/i.exec(p85)
  T('0185 opportunites : index unique partiel des ouvertes sur (artisan_id, cle)', !!idx)
  const exclus = idx ? [...idx[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]) : []
  T('0185 opportunites : l’index exclut exactement les statuts fermés', idx && FERMES.every((s) => exclus.includes(s)) && exclus.every((s) => FERMES.includes(s)), `exclus : ${exclus.join(', ')}`)
  const cycle = /create or replace function public\.opportunites_cycle\(\)[\s\S]*?\$fn\$([\s\S]*?)\$fn\$/i.exec(c85)?.[1] ?? ''
  T('0185 opportunites : une opportunité ne naît que detectee', /if new\.statut <> 'detectee' then\s+raise exception 'opportunites : une opportunité naît detectee/i.test(cycle))
  T('0185 opportunites : la date de création est imposée à la naissance', /new\.cree_le := now\(\);/.test(cycle))
  const trans = [...(/<> all \(array\[([\s\S]*?)\]\)/.exec(cycle)?.[1] ?? '').matchAll(/'([a-z_]+)>([a-z_]+)'/g)].map((m) => [m[1], m[2]])
  const versDepart = trans.filter(([, b]) => b === 'partie').map(([a]) => a).sort().join(',')
  T('0185 opportunites : on ne part que validé, programmé ou en rejeu d’un échec', trans.length > 0 && versDepart === 'echec,programmee,validee', versDepart)
  T('0185 opportunites : aucun statut fermé ne se rouvre', trans.length > 0 && !trans.some(([a]) => FERMES.includes(a)))
  const cyclePlat = espaces(cycle)
  T('0185 opportunites : programmee exige le niveau 3 et sa ligne de pilote en attente', cyclePlat.includes("if new.statut = 'programmee' and (new.niveau <> 3 or new.action_auto_id is null or not exists (select 1 from public.actions_auto a where a.id = new.action_auto_id and a.statut in ('a_partir', 'en_cours'))) then"))
  T('0185 opportunites : aucun départ sans carte confirmée ni ligne réclamée (statut réel lu)', cyclePlat.includes("if new.statut in ('partie', 'reussie', 'echec') and not ( exists (select 1 from public.assistant_actions a where a.id = new.assistant_action_id")
    && cyclePlat.includes("when 'partie' then array['en_cours', 'executee']") && cyclePlat.includes("when 'partie' then array['en_cours', 'partie']"))
  T('0185 opportunites : le déclencheur du cycle est posé', /create trigger opportunites_cycle before insert or update on public\.opportunites/i.test(p85))
  T('0185 multi-locataire : l’objet visé est du même artisan', /if not public\.automatisation_objet_du_compte\(new\.artisan_id, new\.objet_type, new\.objet_id\) then/.test(cycle))
  T('0185 opportunites_decisions : journal non réécrit', /create trigger opportunites_decisions_journal before insert or update/i.test(p85) && /une décision ne se réécrit pas/.test(c85))
  T('0185 passages_detecteurs : unique par cle', /unique \(cle\)/.test(espaces(corpsTable(c85, 'passages_detecteurs') ?? '')))
  T('0185 relances_exclusions : une exclusion en cours par client', /create unique index if not exists relances_exclusions_client_unique on public\.relances_exclusions \(artisan_id, client_id\) where levee_le is null/i.test(p85))
  T('0185 relances_exclusions : une exclusion en cours par conversation', /create unique index if not exists relances_exclusions_lead_unique on public\.relances_exclusions \(artisan_id, lead_id\) where levee_le is null/i.test(p85))
  T('0185 relances_exclusions : index sur artisan_id (cascade de suppression du compte)', /create index if not exists relances_exclusions_compte on public\.relances_exclusions \(artisan_id\);/i.test(p85))
  T('0185 relances_impayes_arrets.motif : colonne nullable et liste fermée', /alter table public\.relances_impayes_arrets add column if not exists motif text;/.test(p85)
    && /check \(motif is null or motif in \('oubli', 'dit_avoir_paye', 'litige', 'autre'\)\)/.test(p85))

  const c86 = sansCommentaires(textes['0186'] ?? ''), p86 = espaces(c86)
  const se = espaces(corpsTable(c86, 'sms_envois') ?? '')
  T('0186 sms_envois : unique par (artisan_id, cle)', /unique \(artisan_id, cle\)/.test(se))
  T('0186 sms_envois : le texte passe sms_texte_conforme', /check \(public\.sms_texte_conforme\(texte\)\)/.test(se))
  T('0186 sms_texte_conforme : STOP obligatoire, mot entier', p86.includes("and t ~* '(^|[^a-z0-9])stop([^a-z0-9]|$)'"))
  T('0186 sms_texte_conforme : ni lien, ni montant, ni menace, ni Presti', p86.includes("and t !~* '(https?://|www[.]") && p86.includes("and t !~* '([0-9]\\s*(eur|euros?)\\M|€)'")
    && p86.includes("and t !~* '(huissier|contentieux") && p86.includes("and t !~* 'presti'"))
  T('0186 sms_texte_conforme : GSM-7 pur (alphabet de base seul)', p86.includes("and t ~ '^[A-Za-z0-9 \\n\\r@£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!\"#¤%&''()*+,./:;<=>?¡ÄÖÑÜ§¿äöñüà-]*$'"))
  T('0186 sms_envois : les segments sont calculés, pas déclarés', /constraint sms_envois_segments check \(segments = public\.sms_segments\(texte\)\)/.test(se))
  T('0186 sms_envois : l’interrupteur sms_arret est lu en base', /if public\.ops_interrupteur\('sms_arret'\) then/.test(c86))
  T('0186 sms_envois : la date de création est imposée (plafonds non contournables)', /new\.cree_le := now\(\);/.test(c86))
  T('0186 clients.tel_source : le navigateur ne l’écrit pas', /create trigger clients_tel_source_garde before insert or update on public\.clients/i.test(p86) && /if current_user in \('anon', 'authenticated'\) then/.test(c86))
  T('0186 sms_oppositions : une opposition ne se modifie pas', /create trigger sms_oppositions_figees before update on public\.sms_oppositions/i.test(p86))
  T('0186 sms_expediteurs : un nom changé redevient à valider', /create trigger sms_expediteurs_garde before update on public\.sms_expediteurs/i.test(p86))
  T('0186 sms_envois : à blanc par défaut', /mode text not null default 'blanc'/.test(se) && /check \(\(mode = 'blanc'\) = \(etat = 'simule'\)\)/.test(se))
  T('0186 sms_envois : coût en entier', /cout_ht_milliemes integer/.test(se))
  T('0186 sms_envois : plafonds 10 par artisan et 100 par jour', /if v_compte >= 10 then/.test(c86) && /if v_total >= 100 then/.test(c86))
  const etats = [...(/<> all \(array\[([^\]]*)\]\)/.exec(/create or replace function public\.sms_envois_gardes[\s\S]*?\$fn\$([\s\S]*?)\$fn\$/i.exec(c86)?.[1] ?? '')?.[1] ?? '').matchAll(/'([a-z_]+)>([a-z_]+)'/g)].map((m) => [m[1], m[2]])
  T('0186 sms_envois : un envoi incertain n’est jamais renvoyé', etats.length > 0 && etats.filter(([a]) => a === 'incertain').every(([, b]) => ['delivre', 'echec'].includes(b)) && !etats.some(([, b]) => b === 'en_file'))
  T('0186 sms_expediteurs : jamais « Presti »', /nom !~\* 'presti'/.test(espaces(corpsTable(c86, 'sms_expediteurs') ?? '')))
  T('0186 sms_oppositions : unique par (artisan_id, numero_empreinte), empreinte seule', /unique \(artisan_id, numero_empreinte\)/.test(espaces(corpsTable(c86, 'sms_oppositions') ?? ''))
    && !/\b(numero|tel) text\b/.test(corpsTable(c86, 'sms_oppositions') ?? ''))
  T('0186 aucun numéro ni nom de client dans sms_envois', !/\b(numero|tel|telephone|nom|email|destinataire)\b\s+text/.test(se))
  T('0186 clients.tel_source et tel_source_le', /alter table public\.clients add column if not exists tel_source text;/.test(p86) && /add column if not exists tel_source_le timestamptz;/.test(p86))
  T('0186 sms_arret semé ACTIF (SMS arrêtés)', /insert into ops\.interrupteurs \(nom, actif, motif\) values \('sms_arret', true,/.test(p86))
  T('0186 la contrainte des interrupteurs connaît sms_arret', /check \(nom in \('pause_generale', 'envoi_froid', 'sms_arret'\)\)/.test(p86))

  const p87 = espaces(sansCommentaires(textes['0187'] ?? ''))
  T('0187 factures.envoyee_le ajoutée, nullable', /alter table public\.factures add column if not exists envoyee_le timestamptz;/.test(p87))
  T('0187 seule une facture scellée porte une date d’envoi', /check \(envoyee_le is null or coalesce\(verrouillee, false\)\)/.test(p87))
  T('0187 ne touche ni la RLS ni les droits des factures', !/(create|drop) policy|grant |revoke /i.test(p87))
  return res
}

let verts = 0
const rouges = []
const compter = (nom, ok, detail = '') => { if (ok) { verts++; console.log(`  ✅ ${nom}`) } else { rouges.push(nom); console.log(`  ❌ ${nom}${detail ? `\n     → ${String(detail).slice(0, 300)}` : ''}`) } }

const textes = Object.fromEntries(Object.entries(FICHIERS).map(([n, f]) => [n, lire(f)]))

console.log('\n══ 1. Les trois migrations, lues hors ligne ══\n')
for (const v of verifier(textes)) compter(v.nom, v.ok, v.detail)

console.log('\n══ 2. Les jumeaux « à coller » portent exactement le SQL de leur migration ══\n')
const noyau = (s) => sansCommentaires(s).split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim()).join('\n')
for (const [n, f] of Object.entries(FICHIERS)) {
  const j = `_A_COLLER_sql_editor_${n}_NU.sql`
  const existe = fs.existsSync(path.join(DIR, j))
  compter(`${j} existe`, existe)
  if (!existe) continue
  const jumeau = lire(j)
  compter(`${j} : même SQL que ${f}`, noyau(jumeau.split(MARQUE_CONTROLE)[0]) === noyau(textes[n]))
  compter(`${j} : porte un contrôle après collage`, jumeau.includes(MARQUE_CONTROLE) && /\(attendu : /.test(jumeau.split(MARQUE_CONTROLE)[1] ?? ''))
}

console.log('\n══ 3. Les mutants rougissent (une suite qui ne sait pas rougir ne prouve rien) ══\n')
const MUTANTS = [
  ['RLS retirée sur opportunites', '0185', (s) => s.replace('alter table public.opportunites enable row level security;', ''), '0185 opportunites : RLS activée'],
  ['RLS retirée sur sms_envois', '0186', (s) => s.replace('alter table public.sms_envois enable row level security;', ''), '0186 sms_envois : RLS activée'],
  ['opportunites sortie de la boucle des gardes', '0185', (s) => s.replace("'passages_detecteurs', 'opportunites',", "'passages_detecteurs',"), '0185 opportunites : garde_session'],
  ['garde de suspension en mise à jour retirée', '0186', (s) => s.replace(/\n\s*execute format\('create policy garde_suspension_maj[^\n]*/, ''), '0186 sms_envois : garde_suspension_maj'],
  ['garde de session affaiblie (permissive)', '0185', (s) => s.replace("garde_session on public.%I as restrictive for all", "garde_session on public.%I for all"), '0185 evenements_metier : garde_session'],
  ['anon non retiré', '0186', (s) => s.replace(/\n\s*execute format\('revoke all on public\.%I from anon', t\);/, ''), '0186 sms_oppositions : anon retiré'],
  ['écritures laissées à authenticated', '0185', (s) => s.replace(/\n\s*execute format\('revoke insert, update, delete, truncate[^\n]*/, ''), '0185 relances_exclusions : écritures retirées à authenticated'],
  ['politique d’écriture ouverte au navigateur', '0186', (s) => s.replace("create policy sms_envois_lecture on public.sms_envois for select to authenticated", "create policy sms_envois_lecture on public.sms_envois for all to authenticated"), '0186 sms_envois : seules des politiques de lecture de ses lignes'],
  ['lecture ouverte à tous', '0185', (s) => s.replace("on public.opportunites for select to authenticated\n  using ((select auth.uid()) = artisan_id);", "on public.opportunites for select to authenticated\n  using (true);"), '0185 opportunites : seules des politiques de lecture de ses lignes'],
  ['index unique des opportunités ouvertes retiré', '0185', (s) => s.replace(/create unique index if not exists opportunites_ouverte_unique[^;]*;/, ''), '0185 opportunites : index unique partiel des ouvertes sur (artisan_id, cle)'],
  ['index unique élargi : a_valider compté comme fermé', '0185', (s) => s.replace("where statut not in ('resolue', 'refusee', 'expiree', 'annulee', 'reussie');", "where statut not in ('resolue', 'refusee', 'expiree', 'annulee', 'reussie', 'a_valider');"), '0185 opportunites : l’index exclut exactement les statuts fermés'],
  ['clé unique des événements retirée', '0185', (s) => s.replace('constraint evenements_metier_cle_unique unique (artisan_id, cle),', ''), '0185 evenements_metier : unique par (artisan_id, cle)'],
  ['clé unique des SMS retirée', '0186', (s) => s.replace('constraint sms_envois_cle_unique unique (artisan_id, cle),', ''), '0186 sms_envois : unique par (artisan_id, cle)'],
  ['colonne organization_id ajoutée', '0185', (s) => s.replace("  faits       jsonb not null default '{}'::jsonb,\n  survenu_le", "  organization_id uuid,\n  faits       jsonb not null default '{}'::jsonb,\n  survenu_le"), '0185 evenements_metier : aucune colonne organization_id'],
  ['montant en numeric', '0185', (s) => s.replace('montant_centimes     bigint', 'montant_centimes     numeric'), '0185 opportunites : montant_centimes en entier'],
  ['faits en texte libre', '0185', (s) => s.replace('constraint evenements_metier_faits check (public.faits_sans_texte(faits))', 'constraint evenements_metier_faits check (jsonb_typeof(faits) = \'object\')'), '0185 evenements_metier : faits sans texte libre'],
  ['départ direct depuis a_valider', '0185', (s) => s.replace("'validee>partie',", "'validee>partie', 'a_valider>partie',"), '0185 opportunites : on ne part que validé, programmé ou en rejeu d’un échec'],
  ['une opportunité naît a_valider', '0185', (s) => s.replace("if new.statut <> 'detectee' then", "if new.statut not in ('detectee', 'a_valider') then"), '0185 opportunites : une opportunité ne naît que detectee'],
  ['programmee sans niveau 3', '0185', (s) => s.replace("(new.niveau <> 3 or new.action_auto_id is null", "(new.action_auto_id is null"), '0185 opportunites : programmee exige le niveau 3 et sa ligne de pilote en attente'],
  ['STOP retiré', '0186', (s) => s.replace("    and t ~* '(^|[^a-z0-9])stop([^a-z0-9]|$)'\n", ''), '0186 sms_texte_conforme : STOP obligatoire, mot entier'],
  ['GSM-7 non exigé', '0186', (s) => s.replace(/\n\s*and t ~ '\^\[A-Za-z0-9 [^\n]*/, ''), '0186 sms_texte_conforme : GSM-7 pur (alphabet de base seul)'],
  ['segments déclarés par l’appelant', '0186', (s) => s.replace('  constraint sms_envois_segments check (segments = public.sms_segments(texte)),\n', ''), '0186 sms_envois : les segments sont calculés, pas déclarés'],
  ['interrupteur sms_arret non lu', '0186', (s) => s.replace("if public.ops_interrupteur('sms_arret') then", "if false then"), '0186 sms_envois : l’interrupteur sms_arret est lu en base'],
  ['tel_source écrit par le navigateur', '0186', (s) => s.replace(/create trigger clients_tel_source_garde[^;]*;/, ''), '0186 clients.tel_source : le navigateur ne l’écrit pas'],
  ['un envoi incertain renvoyé', '0186', (s) => s.replace("'incertain>delivre',", "'incertain>en_file', 'incertain>delivre',"), '0186 sms_envois : un envoi incertain n’est jamais renvoyé'],
  ['fonction en security definer', '0185', (s) => s.replace('returns boolean\nlanguage plpgsql stable security invoker', 'returns boolean\nlanguage plpgsql stable security definer'), '0185 aucune fonction en security definer'],
  ['en-tête NON APPLIQUÉE retiré', '0187', (s) => s.replace('NON APPLIQUÉE, préparée le 02/11', 'préparée le 02/11'), '0187 en-tête « NON APPLIQUÉE, préparée le 02/11, attend le go écrit de Benj »'],
  ['retour arrière d’une table oublié', '0186', (s) => s.replace('--   drop table if exists public.sms_envois;\n', ''), '0186 sms_envois : retour arrière la retire'],
  ['droit accordé à n8n_lecture', '0185', (s) => s + '\ngrant select (id, artisan_id) on public.opportunites to n8n_lecture;\n', '0185 rien pour n8n_lecture (0189 reste inutilisé par n8n, plan §0.1)'],
]
for (const [nom, num, muter, attendue] of MUTANTS) {
  const muté = muter(textes[num])
  if (muté === textes[num]) { compter(`mutant « ${nom} » : il modifie bien ${num}`, false, 'le motif de mutation ne s’applique plus : le mettre à jour'); continue }
  const r = verifier({ ...textes, [num]: muté })
  const visee = r.find((v) => v.nom === attendue)
  compter(`mutant « ${nom} » rougit « ${attendue} »`, visee && !visee.ok, visee ? 'la vérification est restée verte' : 'vérification introuvable')
}

// ── 4. PGlite : seulement si PGLITE_DIR est posé ────────────────────────────────────────────────────────────────────────────────
async function chargerPglite() {
  try { return await import('@electric-sql/pglite') } catch { /* pas dans le projet */ }
  const dir = process.env.PGLITE_DIR
  if (!dir) return null
  try {
    const req = createRequire(path.join(path.resolve(dir), 'package.json'))
    return await import(pathToFileURL(req.resolve('@electric-sql/pglite')).href)
  } catch { return null }
}

let codePglite = 0
if (!process.env.PGLITE_DIR) {
  console.log('\n⏸  Partie PGlite non jouée : PGLITE_DIR n’est pas posé (la partie statique et les mutants ci-dessus font le verdict).')
} else {
  const mod = await chargerPglite()
  if (!mod) { console.log('\n⏸  PGLITE_DIR est posé mais @electric-sql/pglite est introuvable : partie PGlite en attente (code 2).'); codePglite = 2 }
  else await jouerPglite(mod)
}

async function jouerPglite(mod) {
  console.log('\n══ 4. PGlite : les trois migrations rejouées sous les vrais rôles ══\n')
  const db = new mod.PGlite()
  async function en(role, uid, sql, params = []) {
    try {
      await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);")
      if (uid) await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid])
      if (role) await db.exec(`set role ${role}`)
      const r = await db.query(sql, params)
      return { ok: true, rows: r.rows }
    } catch (e) {
      return { ok: false, rows: [], erreur: String(e?.message ?? e) }
    } finally {
      await db.exec('reset role')
    }
  }
  const service = (sql, p) => en(null, null, sql, p)
  const T = (nom, cond, detail = '') => compter(`PGlite ${nom}`, cond, detail)

  // Le socle factice : rôles et auth de Supabase, tables existantes réduites aux colonnes utiles, droits par défaut de Supabase.
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select null::jsonb $$;
    create table auth.mfa_factors (user_id uuid, factor_type text, status text);
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    create table public.artisans (id uuid primary key, sessions_invalides_avant timestamptz, connexion_verifiee_le timestamptz);
    create table public.sessions_verifiees (session_id uuid, user_id uuid);
    create table public.suspensions (artisan_id uuid references public.artisans(id) on delete cascade, levee_le timestamptz);
    create table public.clients (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade, tel text);
    create table public.devis (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade);
    create table public.factures (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade,
      verrouillee boolean not null default false);
    create table public.leads (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade);
    create table public.chantiers (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade);
    create table public.materiaux (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade);
    create table public.crm_rappels (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade);
    create table public.commandes_fournisseur (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade);
    create table public.assistant_actions (id uuid primary key default gen_random_uuid(), artisan_id uuid not null references public.artisans(id) on delete cascade,
      statut text not null default 'en_attente');
    create table public.actions_auto (id uuid primary key default gen_random_uuid(), artisan_id uuid not null references public.artisans(id) on delete cascade,
      statut text not null default 'a_partir');
    create table public.relances_impayes_arrets (facture_id uuid primary key references public.factures(id) on delete cascade,
      artisan_id uuid not null references public.artisans(id) on delete cascade, raison text not null, le timestamptz not null default now(), reprise_le timestamptz);
    create schema ops;
    create table ops.interrupteurs (nom text primary key check (nom in ('pause_generale', 'envoi_froid')), actif boolean not null default false,
      motif text, change_le timestamptz, change_par uuid);
    insert into ops.interrupteurs (nom, actif, motif) values ('pause_generale', false, 'socle'), ('envoi_froid', false, 'socle');
    create function public.ops_interrupteur(p_nom text) returns boolean language plpgsql stable security definer set search_path = ops, public, pg_temp as $$
    declare v_actif boolean;
    begin
      select i.actif into v_actif from ops.interrupteurs i where i.nom = p_nom;
      if not found then raise exception using message = 'ops:interrupteur', errcode = 'P0001'; end if;
      return v_actif;
    end $$;
  `)
  await db.exec(fs.readFileSync(path.join(DIR, '0138_garde_session_rls.sql'), 'utf8'))
  for (const n of ['0185', '0186', '0187']) {
    let a = { ok: true }, b = { ok: true }
    try { await db.exec(textes[n]) } catch (e) { a = { ok: false, erreur: e.message } }
    T(`${n} s’applique`, a.ok, a.erreur)
    try { await db.exec(textes[n]) } catch (e) { b = { ok: false, erreur: e.message } }
    T(`${n} se rejoue sans erreur (idempotente)`, b.ok, b.erreur)
  }

  const A = crypto.randomUUID(), B = crypto.randomUUID()
  await service('insert into public.artisans (id) values ($1), ($2)', [A, B])
  const un = async (sql, p) => (await service(sql, p)).rows[0]?.id
  const dA = await un('insert into public.devis (artisan_id) values ($1) returning id', [A])
  const dB = await un('insert into public.devis (artisan_id) values ($1) returning id', [B])
  const cA = await un('insert into public.clients (artisan_id) values ($1) returning id', [A])
  const cB = await un('insert into public.clients (artisan_id) values ($1) returning id', [B])
  const aaA = await un('insert into public.actions_auto (artisan_id) values ($1) returning id', [A])
  const aaB = await un('insert into public.actions_auto (artisan_id) values ($1) returning id', [B])
  const fA = await un('insert into public.factures (artisan_id) values ($1) returning id', [A])
  const insOpp = (art, objet, cle, statut = 'detectee') => service(
    `insert into public.opportunites (artisan_id, detecteur, cle, objet_type, objet_id, statut, montant_centimes) values ($1, 'devis_sans_reponse', $2, 'devis', $3, $4, 12345) returning id`,
    [art, cle, objet, statut])

  const o1 = await insOpp(A, dA, `devis_sans_reponse:${dA}:j3`)
  T('la clé de service écrit une opportunité', o1.ok, o1.erreur)
  const idO1 = o1.rows[0]?.id
  T('un objet d’un autre artisan est refusé, clé de service comprise', !(await insOpp(A, dB, `x:${dB}:j3`)).ok)
  T('une seconde opportunité ouverte sur la même clé est refusée', !(await insOpp(A, dA, `devis_sans_reponse:${dA}:j3`)).ok)
  T('une opportunité ne naît pas partie', !(await insOpp(A, dA, `y:${dA}:j3`, 'partie')).ok)
  T('une opportunité ne naît pas a_valider', !(await insOpp(A, dA, `y:${dA}:j5`, 'a_valider')).ok)
  const lA = await en('authenticated', A, 'select id from public.opportunites')
  const lB = await en('authenticated', B, 'select id from public.opportunites')
  T('A lit son opportunité, B n’en lit aucune', lA.ok && lA.rows.length === 1 && lB.ok && lB.rows.length === 0, JSON.stringify([lA.erreur, lB.erreur]))
  T('le navigateur n’écrit pas une opportunité', !(await en('authenticated', A,
    `insert into public.opportunites (artisan_id, detecteur, cle, objet_type, objet_id) values ('${A}', 'd', 'z:1:j3', 'devis', '${dA}')`)).ok)
  T('le navigateur ne modifie pas une opportunité', (await en('authenticated', A, `update public.opportunites set statut = 'validee' returning id`)).rows.length === 0)
  T('anon ne lit rien', !(await en('anon', null, 'select id from public.opportunites')).ok)
  T('detectee → partie refusé', !(await service(`update public.opportunites set statut = 'partie' where id = $1`, [idO1])).ok)
  await service(`update public.opportunites set statut = 'preparee' where id = $1`, [idO1])
  T('programmee sans ligne de pilote refusé', !(await service(`update public.opportunites set statut = 'programmee', niveau = 3 where id = $1`, [idO1])).ok)
  T('une ligne de pilote d’un autre artisan est refusée', !(await service(`update public.opportunites set statut = 'programmee', niveau = 3, action_auto_id = $2 where id = $1`, [idO1, aaB])).ok)
  T('programmee au niveau 2 refusé', !(await service(`update public.opportunites set statut = 'programmee', niveau = 2, action_auto_id = $2 where id = $1`, [idO1, aaA])).ok)
  T('programmee au niveau 3 avec sa ligne en attente passe', (await service(`update public.opportunites set statut = 'programmee', niveau = 3, action_auto_id = $2 where id = $1`, [idO1, aaA])).ok)
  T('programmee → partie refusé tant que la ligne n’est pas réclamée', !(await service(`update public.opportunites set statut = 'partie' where id = $1`, [idO1])).ok)
  await service(`update public.actions_auto set statut = 'en_cours' where id = $1`, [aaA])
  T('programmee → partie passe, ligne réclamée', (await service(`update public.opportunites set statut = 'partie' where id = $1`, [idO1])).ok)
  await service(`update public.actions_auto set statut = 'partie' where id = $1`, [aaA])
  T('partie → reussie ferme l’opportunité', (await service(`update public.opportunites set statut = 'reussie' where id = $1 returning ferme_le`, [idO1])).rows[0]?.ferme_le != null)
  T('reussie ne se rouvre pas', !(await service(`update public.opportunites set statut = 'a_valider' where id = $1`, [idO1])).ok)
  T('fermée, la même clé peut renaître', (await insOpp(A, dA, `devis_sans_reponse:${dA}:j3`)).ok)
  T('la clé ne change pas', !(await service(`update public.opportunites set cle = 'autre:cle:j3' where id = $1`, [idO1])).ok)

  T('un fait en texte libre est refusé', !(await service(`insert into public.evenements_metier (artisan_id, type, cle, faits) values ($1, 'devis_envoye', 'e:1', '{"nom": "Jean Dupont"}')`, [A])).ok)
  T('un fait d’identifiants passe', (await service(`insert into public.evenements_metier (artisan_id, type, objet_type, objet_id, cle, faits) values ($1, 'devis_envoye', 'devis', $2, 'e:2', '{"jours": 7, "etape": "j7"}')`, [A, dA])).ok)
  T('le même fait deux fois est refusé', !(await service(`insert into public.evenements_metier (artisan_id, type, cle) values ($1, 'devis_envoye', 'e:2')`, [A])).ok)
  T('un fait ne se modifie pas', !(await service(`update public.evenements_metier set type = 'autre' where cle = 'e:2'`)).ok)

  const dec = await service(`insert into public.opportunites_decisions (opportunite_id, artisan_id, decision, motif) values ($1, $2, 'refuser', 'deja_fait') returning id`, [idO1, A])
  T('une décision s’écrit', dec.ok, dec.erreur)
  T('une décision ne se réécrit pas', !(await service(`update public.opportunites_decisions set motif = 'autre' where id = $1`, [dec.rows[0]?.id])).ok)
  T('une décision sur l’opportunité d’un autre compte est refusée', !(await service(`insert into public.opportunites_decisions (opportunite_id, artisan_id, decision) values ($1, $2, 'valider')`, [idO1, B])).ok)

  T('exclure le client d’un autre artisan est refusé', !(await service('insert into public.relances_exclusions (artisan_id, client_id) values ($1, $2)', [A, cB])).ok)
  const ex = await service('insert into public.relances_exclusions (artisan_id, client_id) values ($1, $2) returning id', [A, cA])
  T('exclure son client passe', ex.ok, ex.erreur)
  T('deux exclusions en cours du même client sont refusées', !(await service('insert into public.relances_exclusions (artisan_id, client_id) values ($1, $2)', [A, cA])).ok)
  await service('update public.relances_exclusions set levee_le = now() where id = $1', [ex.rows[0]?.id])
  T('levée, une nouvelle exclusion peut être posée', (await service('insert into public.relances_exclusions (artisan_id, client_id) values ($1, $2)', [A, cA])).ok)

  T('un arrêt d’impayé prend un motif de la liste', (await service(`insert into public.relances_impayes_arrets (facture_id, artisan_id, raison, motif) values ($1, $2, 'reponse_client', 'oubli')`, [fA, A])).ok)
  T('un motif hors liste est refusé', !(await service(`update public.relances_impayes_arrets set motif = 'le client est de mauvaise foi' where facture_id = $1`, [fA])).ok)

  const sms = (art, cle, texte, mode = 'blanc', etat = 'simule', extra = '') => service(
    `insert into public.sms_envois (artisan_id, cle, type, mode, etat, texte, segments${extra ? ', fournisseur, tarif_source, tarif_date' : ''})
     values ($1, $2, 'rappel_rdv', $3, $4, $5, 1${extra ? ", 'sweego', 'grille-test', current_date" : ''}) returning id`, [art, cle, mode, etat, texte])
  T('un SMS sans STOP est refusé', !(await sms(A, 's:1', 'Rappel : rendez-vous lundi 9 h.')).ok)
  T('un SMS avec un lien est refusé', !(await sms(A, 's:2', 'Rappel : rendez-vous lundi, voir https://exemple.test STOP au 36111')).ok)
  T('un SMS avec un montant est refusé', !(await sms(A, 's:3', 'Rappel : 120 € à régler. STOP au 36111')).ok)
  const s4 = await sms(A, 's:4', 'Rappel : rendez-vous lundi 9 h. STOP au 36111')
  T('un SMS conforme, à blanc, passe', s4.ok, s4.erreur)
  T('la même clé de SMS deux fois est refusée', !(await sms(A, 's:4', 'Rappel : rendez-vous lundi 9 h. STOP au 36111')).ok)
  const smsA = await en('authenticated', A, 'select id from public.sms_envois'), smsB = await en('authenticated', B, 'select id from public.sms_envois')
  T('RLS de sms_envois : A lit le sien, B rien', smsA.rows.length === 1 && smsB.ok && smsB.rows.length === 0, JSON.stringify([smsA.erreur, smsB.erreur]))
  T('le navigateur n’écrit pas un SMS', !(await en('authenticated', A, `insert into public.sms_envois (artisan_id, cle, type, texte, segments) values ('${A}', 's:9', 'rappel_rdv', 'x STOP', 1)`)).ok)
  T('un SMS en majuscules accentuées hors GSM-7 est refusé (ê)', !(await sms(A, 's:5', 'Votre devis est prêt. STOP au 36111')).ok)
  T('des segments faux sont refusés', !(await service(`insert into public.sms_envois (artisan_id, cle, type, texte, segments) values ($1, 's:6', 'devis_pret', 'Votre devis est disponible. STOP au 36111', 2)`, [A])).ok)
  T('sms_arret actif : un SMS réel est refusé', !(await sms(A, 'r:x', 'Rappel : rendez-vous lundi 9 h. STOP au 36111', 'reel', 'en_file', 'x')).ok)
  await service(`update ops.interrupteurs set actif = false where nom = 'sms_arret'`)
  let plafond = true
  for (let i = 0; i < 10; i++) plafond = plafond && (await sms(A, `r:${i}`, 'Rappel : rendez-vous lundi 9 h. STOP au 36111', 'reel', 'en_file', 'x')).ok
  T('dix SMS réels passent', plafond)
  T('le onzième SMS réel du jour est refusé', !(await sms(A, 'r:10', 'Rappel : rendez-vous lundi 9 h. STOP au 36111', 'reel', 'en_file', 'x')).ok)
  await service(`update public.sms_envois set etat = 'incertain' where cle = 'r:0'`)
  T('un envoi incertain n’est jamais renvoyé', !(await service(`update public.sms_envois set etat = 'en_file' where cle = 'r:0'`)).ok)
  await service(`update ops.interrupteurs set actif = true where nom = 'sms_arret'`)
  T('un expéditeur validé puis renommé redevient à valider', (await service(`insert into public.sms_expediteurs (artisan_id, nom, statut, valide_le) values ($1, 'Atelier A', 'valide', now())`, [B])).ok
    && (await service(`update public.sms_expediteurs set nom = 'Atelier Z' where artisan_id = $1 returning statut`, [B])).rows[0]?.statut === 'a_valider')
  const opp = await service(`insert into public.sms_oppositions (artisan_id, numero_empreinte, source) values ($1, $2, 'stop_sms') returning id`, [A, 'a'.repeat(64)])
  T('une opposition ne se modifie pas', opp.ok && !(await service(`update public.sms_oppositions set source = 'artisan' where id = $1`, [opp.rows[0]?.id])).ok)
  await en('authenticated', A, `update public.clients set tel_source = 'demande', tel_source_le = now() where id = '${cA}'`)
  T('le navigateur n’écrit pas tel_source', (await service('select tel_source from public.clients where id = $1', [cA])).rows[0]?.tel_source === null)
  await service(`update public.clients set tel = '+33600000000', tel_source = 'demande', tel_source_le = now() where id = $1`, [cA])
  T('la clé de service écrit tel_source', (await service('select tel_source from public.clients where id = $1', [cA])).rows[0]?.tel_source === 'demande')
  await service(`update public.clients set tel = '+33600000001' where id = $1`, [cA])
  T('un numéro changé sans source perd la sienne', (await service('select tel_source from public.clients where id = $1', [cA])).rows[0]?.tel_source === null)
  T('un expéditeur « Presti » est refusé', !(await service(`insert into public.sms_expediteurs (artisan_id, nom) values ($1, 'Presti')`, [A])).ok)

  T('passages_detecteurs : fermé au navigateur', !(await en('authenticated', A, 'select id from public.passages_detecteurs')).ok)
  T('passages_detecteurs : un bilan en texte est refusé', !(await service(`insert into public.passages_detecteurs (cle, workflow, bilan) values ('p:1', 'presti-detecteurs', '{"facture_echue": {"note": "texte"}}')`)).ok)
  T('passages_detecteurs : un bilan agrégé passe', (await service(`insert into public.passages_detecteurs (cle, workflow, bilan) values ('p:2', 'presti-detecteurs', '{"facture_echue": {"nombre": 2, "montant_centimes": 45000}}')`)).ok)

  T('0187 : une facture non scellée ne porte pas de date d’envoi', !(await service('update public.factures set envoyee_le = now() where id = $1', [fA])).ok)
  await service('update public.factures set verrouillee = true where id = $1', [fA])
  T('0187 : une facture scellée prend sa date d’envoi', (await service('update public.factures set envoyee_le = now() where id = $1', [fA])).ok)

  // La garde de session de 0138 atteint les tables neuves : un jeton révoqué ne lit plus rien.
  await service(`update public.artisans set sessions_invalides_avant = now() + interval '1 day' where id = $1`, [A])
  const revoque = await en('authenticated', A, 'select id from public.opportunites')
  T('garde de session : un jeton révoqué ne lit plus ses opportunités', revoque.ok && revoque.rows.length === 0, revoque.erreur)
  await service('update public.artisans set sessions_invalides_avant = null where id = $1', [A])

  for (const n of ['0185', '0186', '0187']) {
    const controle = lire(`_A_COLLER_sql_editor_${n}_NU.sql`).split(MARQUE_CONTROLE)[1] ?? ''
    const c = await service(controle)
    const faux = c.rows.filter((r) => (/\(attendu : ([^)]+)\)/.exec(r.quoi)?.[1] ?? '?') !== String(r.resultat))
    T(`le contrôle du jumeau ${n} rend ce qu’il annonce`, c.ok && c.rows.length > 0 && faux.length === 0, c.erreur ?? JSON.stringify(faux))
  }

  // La suppression d'un compte (cascade) n'est jamais refusée, même avec une opportunité partie.
  const o2 = (await insOpp(A, dA, `fin:${dA}:j3`)).rows[0]?.id
  for (const st of ['preparee', 'a_valider', 'validee']) await service(`update public.opportunites set statut = $2 where id = $1`, [o2, st])
  const aa2 = await un(`insert into public.actions_auto (artisan_id, statut) values ($1, 'en_cours') returning id`, [A])
  T('validee → partie passe, ligne réclamée', (await service(`update public.opportunites set statut = 'partie', action_auto_id = $2 where id = $1`, [o2, aa2])).ok)
  const sup = await service('delete from public.artisans where id = $1', [A])
  T('la suppression d’un compte passe (cascade)', sup.ok, sup.erreur)
}

console.log(`\n${rouges.length ? '❌' : codePglite ? '⏸ ' : '✅'} ${verts} réussis, ${rouges.length} échoués${codePglite ? ' (partie PGlite en attente)' : ''}\n`)
process.exitCode = rouges.length ? 1 : codePglite
