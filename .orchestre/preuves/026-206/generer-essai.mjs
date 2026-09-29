// generer-essai.mjs — fabrique essai.sql : UN énoncé DO qui exécute la migration 0114 telle quelle, éprouve son comportement
// (cas favorables ET défavorables, décisions du bus réelles), puis lève une exception : tout est annulé, le résultat
// (jsonb) est dans le message. Personnes et adresses fictives ; aucune clé. Usage : node generer-essai.mjs > essai.sql
import fs from 'node:fs'
const mig = fs.readFileSync(new URL('../../../supabase/migrations/0114_contenu.sql', import.meta.url), 'utf8')
if (mig.includes('$migration$') || mig.includes('$essai$')) throw new Error('délimiteur en collision')

const out = []
const q = (s) => `'${s.replace(/'/g, "''")}'`
const OK = (nom, ok, m = '') => `perform pg_temp.t(${q(nom)}, ${ok}${m ? ', ' + m : ''});`
// une assertion booléenne
const C = (nom, expr0) => { const expr = typeof expr0 === 'function' ? expr0() : expr0; out.push(`  begin ${OK(nom, `coalesce((${expr}), false)`)} exception when others then ${OK(nom, 'false', 'sqlerrm')} end;`) }
// une instruction qui DOIT échouer : message contenant `attendu`, ou sqlstate commençant par `attendu`
const E = (nom, code, attendu) => out.push(`  begin ${code}; ${OK(nom, 'false', "'aucune erreur'")} exception when others then perform pg_temp.x(${q(nom)}, ${q(attendu)}, sqlerrm, sqlstate); end;`)
// une instruction qui DOIT réussir
const O = (nom, code) => out.push(`  begin ${code}; ${OK(nom, 'true')} exception when others then ${OK(nom, 'false', 'sqlerrm')} end;`)
const RAW = (code) => out.push(code)
// une décision réelle du bus : ops_decision_creer, puis ops_decision_trancher (fondateur réel)
const D = (v, cleExpr, { choix = 'accorder', portee = 'securite' } = {}) => RAW(`  ${v} := pg_temp.d(${cleExpr}, ${q(choix)}, ${q(portee)});`)
// libère une clé pour qu'une autre décision puisse la porter
const RN = (v, suffixe) => RAW(`  update ops.decisions set cle_idempotence = cle_idempotence || ${q(suffixe)} where id = ${v};`)
const cible = (p) => `('contenu:post:' || ${p} || ':' || (select empreinte from public.contenu_posts where id = ${p}))`
const post = (v, { ligne = 'L2', canal = 'tiktok', agent = 'fabrique', texte, rendu = 'video', aff = "'[]'", neutres = 'false', statut = 'en_attente', h = 'a' }) =>
  `${v} := pg_temp.np(${q(ligne)}, ${q(canal)}, ${q(agent)}, ${q(texte)}, ${q(rendu)}, ${q(h)}, ${aff}, ${neutres}, ${q(statut)})`

// ── préambule ──────────────────────────────────────────────────────────────────────────────
RAW(`  select id into F from public.artisans where is_founder limit 1;
  ${OK('fondateur réel disponible (pour trancher par le vrai chemin)', 'F is not null')}`)

// ── 1. état après migration ────────────────────────────────────────────────────────────────
C('cinq lignes L1-L5, aucune approuvée', `select count(*) = 5 and count(*) filter (where approuvee_le is null) = 5 from public.contenu_lignes`)
C('campagnes UTM ligne-l1..l5 distinctes et propres à la ligne', `select count(distinct utm_campagne) = 5 and bool_and(utm_campagne = 'ligne-' || lower(id)) from public.contenu_lignes`)
C('un compte par réseau, un lien de bio par compte', `select count(*) = 4 and count(distinct lien_bio) = 4 and bool_and(lien_bio = 'https://prestiapp.fr/a/' || code_apport) from public.contenu_comptes`)
E('campagne hors liste refusée', `insert into public.contenu_lignes (id, libelle, canaux, utm_campagne) values ('L1', 'x y z', array['tiktok'], 'lot-20x20')`, '23')
E('code d’apport mal formé refusé', `insert into public.contenu_comptes (reseau, code_apport) values ('tiktok', 'AB')`, '23')

// ── 2. approuver une ligne ────────────────────────────────────────────────────────────────
D('d1', `'contenu:ligne:L2:autre'`)
E('ligne : décision de mauvaise cible refusée', `perform public.contenu_ligne_approuver('L2', d1)`, 'contenu:accord')
RAW(`  D_L2 := 'contenu:ligne:L2:' || (select empreinte from public.contenu_lignes where id = 'L2');`)
D('d2', `D_L2`, { choix: 'refuser' })
E('ligne : choix refuser n’approuve pas', `perform public.contenu_ligne_approuver('L2', d2)`, 'contenu:accord')
RN('d2', ':refus')
D('d3', `D_L2`)
O('ligne : décision valable, L2 approuvée', `perform public.contenu_ligne_approuver('L2', d3)`)
C('ligne L2 approuvée, L1 toujours fermée', `select (select approuvee_le is not null from public.contenu_lignes where id = 'L2') and (select approuvee_le is null from public.contenu_lignes where id = 'L1')`)
O('ligne : retoucher la définition', `update public.contenu_lignes set libelle = 'La question du métier, bis' where id = 'L2'`)
C('ligne : approbation caduque après retouche', `select approuvee_le is null and approbation_decision_id is null from public.contenu_lignes where id = 'L2'`)
E('ligne : l’ancienne décision ne rouvre pas la version retouchée', `perform public.contenu_ligne_approuver('L2', d3)`, 'contenu:accord')
O('ligne : retour à la définition exacte, la décision d’origine vaut encore', `update public.contenu_lignes set libelle = 'La question du métier' where id = 'L2'; perform public.contenu_ligne_approuver('L2', d3)`)
C('ligne L2 de nouveau approuvée', `select approuvee_le is not null from public.contenu_lignes where id = 'L2'`)

// ── 3. publications : l’accord individuel ─────────────────────────────────────────────────
RAW(`  ${post('p1', { texte: 'Une question qui appuie là où ça fait mal' })};`)
C('publication : le déclencheur pose une empreinte sha256', `select empreinte ~ '^[0-9a-f]{64}$' from public.contenu_posts where id = p1`)
E('publication : sans accord, même ligne approuvée, elle reste fermée', `update public.contenu_posts set statut = 'publiable' where id = p1`, 'contenu:accord')
E('publication : ouvrir sans décision refusé', `perform public.contenu_post_ouvrir(p1, null)`, 'contenu:accord')
RAW(`  D_P := ${cible('p1')};`)
D('d5', `D_P`, { choix: 'refuser' })
E('accord : choix refuser n’ouvre rien', `perform public.contenu_post_ouvrir(p1, d5)`, 'contenu:accord')
RN('d5', ':refus')
D('d6', `D_P || ':2'`)
E('accord : autre cible (suffixe) n’ouvre rien', `perform public.contenu_post_ouvrir(p1, d6)`, 'contenu:accord')
RAW(`  d7 := pg_temp.d(D_P, null, 'securite', 'accorder');
  update ops.decisions set echeance = now() - interval '1 minute' where id = d7;
  perform public.ops_decisions_echues();
  update ops.decisions set auteur = F, echeance = now() + interval '1 day' where id = d7;`)
C('défaut appliqué (défaut = accorder, l’échéance a passé) : statut defaut_applique', `select statut = 'defaut_applique' and choix = 'accorder' from ops.decisions where id = d7`)
E('accord : un défaut appliqué à l’échéance n’ouvre rien', `perform public.contenu_post_ouvrir(p1, d7)`, 'contenu:accord')
RN('d7', ':defaut')
D('d8', `D_P`, { portee: 'argent' })
E('accord : portée argent n’ouvre rien', `perform public.contenu_post_ouvrir(p1, d8)`, 'contenu:accord')
RN('d8', ':argent')
D('d9', `D_P`)
RAW(`  update ops.decisions set tranchee_le = now() - interval '8 days' where id = d9;`)
E('accord : décision de plus de 7 jours expirée', `perform public.contenu_post_ouvrir(p1, d9)`, 'contenu:accord')
RN('d9', ':vieux')
D('d10', `D_P`)
RAW(`  update ops.decisions set echeance = now() - interval '1 hour' where id = d10;`)
E('accord : tranchée après son échéance, expirée', `perform public.contenu_post_ouvrir(p1, d10)`, 'contenu:accord')
RN('d10', ':tard')
C('rien ne s’est ouvert pendant les refus', `select statut = 'en_attente' and accord_decision_id is null from public.contenu_posts where id = p1`)
D('d11', `D_P`)
O('accord valable pour cette version exacte : ouvre', `perform public.contenu_post_ouvrir(p1, d11)`)
C('publiable, cible et date d’accord posées', `select statut = 'publiable' and accord_cible = D_P and accord_le is not null and accord_decision_id = d11 from public.contenu_posts where id = p1`)
C('verdict ok et peut_publier', `select public.contenu_post_verdict(p1) = 'ok' and public.contenu_post_peut_publier(p1)`)
RAW(`  ${post('p2', { texte: 'Deuxième question du métier', statut: 'brouillon', h: 'b' })};`)
E('transition brouillon -> publiable interdite', `update public.contenu_posts set statut = 'publiable', accord_decision_id = d11 where id = p2`, 'contenu:transition')
E('insertion directe en publiable interdite', `insert into public.contenu_posts (ligne_id, canal, agent, texte, rendu_type, rendu_empreinte, statut, accord_decision_id, accord_cible, accord_le) values ('L2', 'tiktok', 'fabrique', 'x y', 'video', repeat('c', 64), 'publiable', d11, 'k', now())`, 'contenu:transition')

// ── 4. retouche = accord caduc ────────────────────────────────────────────────────────────
O('retouche du texte d’une publication accordée', `update public.contenu_posts set texte = 'Une question qui appuie là où ça fait mal, retouchée' where id = p1`)
C('retouche : retour en attente, accord effacé', `select statut = 'en_attente' and accord_decision_id is null and accord_cible is null from public.contenu_posts where id = p1`)
E('retouche : l’ancien accord ne vaut plus pour la nouvelle version', `perform public.contenu_post_ouvrir(p1, d11)`, 'contenu:accord')
O('retouche des sous-titres incrustés : l’empreinte change aussi', `update public.contenu_posts set sous_titres = 'Promesse cachée dans un sous-titre' where id = p1`)
RAW(`  D_P := ${cible('p1')};`)
D('d12', `D_P`)
O('nouvel accord sur la version retouchée', `perform public.contenu_post_ouvrir(p1, d12)`)
E('publier sans preuve publique refusé', `update public.contenu_posts set statut = 'publie' where id = p1`, '23')
O('publier avec preuve publique', `update public.contenu_posts set statut = 'publie', preuve_publique = 'https://exemple.presti-test.invalid/v/essai1' where id = p1`)
C('publié : date et preuve posées', `select statut = 'publie' and publie_le is not null and preuve_le is not null from public.contenu_posts where id = p1`)
E('publié : figé (texte)', `update public.contenu_posts set texte = 'autre chose' where id = p1`, 'contenu:publie_fige')
E('publié : la preuve ne s’efface pas (delete)', `delete from public.contenu_posts where id = p1`, 'contenu:preuve_conservee')

// ── 5. suspension par agent et par ligne ──────────────────────────────────────────────────
RAW(`  ${post('p3', { texte: 'Troisième question du métier', h: 'c' })};`)
RAW(`  D_P := ${cible('p3')};`)
D('d13', `D_P`)
RAW(`  s := public.contenu_suspendre('L2', 'fabrique', 'essai de suspension', 'boucle');`)
C('suspension : une ligne active, rejouable sans doublon', `select s is not null and public.contenu_suspendre('L2', 'fabrique', 'essai de suspension', 'boucle') = s and (select count(*) from public.contenu_suspensions where ligne_id = 'L2' and levee_le is null) = 1`)
E('suspension : la publication de cet agent reste fermée', `perform public.contenu_post_ouvrir(p3, d13)`, 'contenu:suspendue')
C('suspension : la preuve de la publication déjà en ligne est intacte', `select preuve_publique is not null and statut = 'publie' from public.contenu_posts where id = p1`)
RAW(`  ${post('p4', { texte: 'Question par un autre agent', agent: 'mesureur', h: 'd' })};`)
RAW(`  D_P := ${cible('p4')};`)
D('d14', `D_P`)
O('suspension d’un agent : un autre agent n’est pas bloqué', `perform public.contenu_post_ouvrir(p4, d14)`)
E('suspension : la lever sans décision refusé', `perform public.contenu_reprendre(s, null)`, 'contenu:accord')
E('suspension : ligne et motif figés', `update public.contenu_suspensions set motif = 'autre' where id = s`, 'contenu:suspension_figee')
E('suspension : jamais effacée', `delete from public.contenu_suspensions where id = s`, 'contenu:ajout_seul')
D('d15', `'contenu:reprise:' || s`)
O('suspension : levée par une décision sur sa cible', `perform public.contenu_reprendre(s, d15)`)
C('suspension levée, plus aucune active', `select (select count(*) from public.contenu_suspensions where levee_le is null) = 0 and (select levee_le is not null from public.contenu_suspensions where id = s)`)
O('après la reprise, la publication s’ouvre', `perform public.contenu_post_ouvrir(p3, d13)`)
RAW(`  perform public.contenu_suspendre('L2', '*', 'arrêt général de la ligne', 'benj');`)
C('suspension générale * : verdict suspendue pour tout agent', `select public.contenu_post_verdict(p3) = 'suspendue' and public.contenu_post_verdict(p4) = 'suspendue'`)
E('suspension : agent mal formé refusé', `perform public.contenu_suspendre('L2', 'A B', 'x', 'boucle')`, '23')
E('suspension : ligne inconnue refusée', `perform public.contenu_suspendre('L9', 'fabrique', 'x', 'boucle')`, 'contenu:ligne')

// ── 6. ligne, canal, doublon, forme, chiffres, affirmations ───────────────────────────────
RAW(`  ${post('p5', { ligne: 'L1', texte: 'Ligne pas encore approuvée', h: 'e' })};`)
RAW(`  D_P := ${cible('p5')};`)
D('d16', `D_P`)
E('ligne non approuvée : publication fermée malgré l’accord individuel', `perform public.contenu_post_ouvrir(p5, d16)`, 'contenu:ligne_fermee')
RAW(`  ${post('p6', { canal: 'linkedin', rendu: 'texte', texte: 'Un texte pour LinkedIn hors canaux de L2' })};`)
RAW(`  D_P := ${cible('p6')};`)
D('d17', `D_P`)
E('canal hors de la ligne refusé', `perform public.contenu_post_ouvrir(p6, d17)`, 'contenu:canal')
E('doublon exact sur le même réseau refusé', `insert into public.contenu_posts (ligne_id, canal, agent, texte, rendu_type, rendu_empreinte) values ('L2', 'tiktok', 'fabrique', 'Troisième question du métier', 'video', repeat('c', 64))`, '23505')
E('TikTok sans vidéo refusé', `insert into public.contenu_posts (ligne_id, canal, agent, texte) values ('L2', 'tiktok', 'fabrique', 'texte seul sur TikTok')`, '23')
E('vidéo sans empreinte de film refusée', `insert into public.contenu_posts (ligne_id, canal, agent, texte, rendu_type) values ('L2', 'instagram', 'fabrique', 'film sans empreinte', 'video')`, '23')
E('affirmations mal formées (pas un tableau) refusées', `insert into public.contenu_posts (ligne_id, canal, agent, texte, affirmations) values ('L2', 'facebook', 'fabrique', 'x y z', '"oui"'::jsonb)`, '23')
E('affirmation sans source refusée', `insert into public.contenu_posts (ligne_id, canal, agent, texte, affirmations) values ('L2', 'facebook', 'fabrique', 'x y z', '[{"texte":"fait","verdict":"pass","probabilite":0.9,"le":"2026-09-29"}]'::jsonb)`, '23')

RAW(`  s := (select id from public.contenu_suspensions where ligne_id = 'L2' and agent = '*' and levee_le is null);`)
D('d18', `'contenu:reprise:' || s`)
O('reprise de la suspension générale', `perform public.contenu_reprendre(s, d18)`)
const ouvrir = (nom, v, texte, opts, attendu, h) => {
  RAW(`  ${post(v, { texte, h, ...opts })};`)
  RAW(`  D_P := ${cible(v)};`)
  D('dx', `D_P`)
  if (attendu) E(nom, `perform public.contenu_post_ouvrir(${v}, dx)`, attendu)
  else O(nom, `perform public.contenu_post_ouvrir(${v}, dx)`)
}
const A = (verdict, prob, src = 'lib/crieur/faits.ts#reponse-rapide') => `'[{"texte":"réponse prête en moins d une minute","source_ref":"${src}","verdict":"${verdict}","probabilite":${prob},"le":"2026-09-29"}]'`
ouvrir('chiffre visible sans affirmation sourcée : fermé', 'p7', 'Ton site en 20 secondes', {}, 'contenu:chiffre', 'f')
ouvrir('chiffre neutre attesté (durée du film) : ouvert', 'p8', 'Ton site en 20 secondes, version deux', { neutres: 'true' }, null, '1')
ouvrir('affirmation refusée par Laya : fermé', 'p9', 'Réponse prête en moins d’une minute', { aff: A('refus', 0.2) }, 'contenu:affirmation', '2')
ouvrir('affirmation, Laya indisponible (panne) : fermé', 'p10', 'Réponse prête en moins d’une minute, bis', { aff: `'[{"texte":"réponse prête en moins d une minute","source_ref":"lib/crieur/faits.ts","verdict":"indisponible","probabilite":null,"le":"2026-09-29"}]'` }, 'contenu:affirmation', '3')
ouvrir('affirmation pass mais probabilité 0,4 : fermé', 'p11', 'Réponse prête en moins d’une minute, ter', { aff: A('pass', 0.4) }, 'contenu:affirmation', '4')
ouvrir('affirmation pass, probabilité 0,7, sourcée : ouvert', 'p12', 'Réponse prête en moins d’une minute, quater', { aff: A('pass', 0.7) }, null, '5')

// ── 7. mesures ────────────────────────────────────────────────────────────────────────────
E('mesure : publication non publiée refusée', `insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source) values (p3, 'H+1', 'vues', 'mesure', 10, 'releve_main')`, 'contenu:post_non_publie')
E('mesure : avant l’échéance refusée', `insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source) values (p1, 'H+1', 'vues', 'mesure', 10, 'releve_main')`, 'contenu:mesure_trop_tot')
O('mesure : H+1 relevée à la main après une heure', `insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source, mesure_le) values (p1, 'H+1', 'vues', 'mesure', 10, 'releve_main', now() + interval '2 hours')`)
E('mesure : non mesuré ne porte jamais un zéro', `insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source) values (p1, 'H+24', 'vues', 'non_mesure', 0, 'api_officielle')`, '23')
O('mesure : API indisponible = non mesuré, sans valeur', `insert into public.contenu_mesures (post_id, echeance, metrique, etat, source) values (p1, 'H+24', 'vues', 'non_mesure', 'api_officielle')`)
E('mesure : « mesurée » sans valeur refusée', `insert into public.contenu_mesures (post_id, echeance, metrique, etat, source, mesure_le) values (p1, 'J+7', 'vues', 'mesure', 'api_officielle', now() + interval '8 days')`, '23')
E('mesure : doublon (post, échéance, métrique) refusé', `insert into public.contenu_mesures (post_id, echeance, metrique, etat, source) values (p1, 'H+1', 'vues', 'en_attente', 'api_officielle')`, '23505')
E('mesure : échéance inconnue refusée', `insert into public.contenu_mesures (post_id, echeance, metrique, etat, source) values (p1, 'H+2', 'vues', 'en_attente', 'api_officielle')`, '23')
E('mesure : ventes affichées comme certaines refusées', `insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source, certitude, mesure_le) values (p1, 'J+7', 'ventes', 'mesure', 1, 'base_presti', 'mesure', now() + interval '8 days')`, '23')
E('mesure : ventes estimées sans fenêtre refusées', `insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source, certitude, mesure_le) values (p1, 'J+7', 'ventes', 'mesure', 1, 'base_presti', 'estimation', now() + interval '8 days')`, '23')
E('mesure : ventes d’une source de réseau refusées (provenance incohérente)', `insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source, certitude, fenetre_attribution_h, mesure_le) values (p1, 'J+7', 'ventes', 'mesure', 1, 'api_officielle', 'estimation', 48, now() + interval '8 days')`, '23')
O('mesure : ventes estimées par fenêtre de 48 h, source base Presti', `insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source, certitude, fenetre_attribution_h, mesure_le) values (p1, 'J+7', 'ventes', 'mesure', 1, 'base_presti', 'estimation', 48, now() + interval '8 days')`)
E('mesure : les visites viennent de l’Audience maison', `insert into public.contenu_mesures (post_id, echeance, metrique, etat, valeur, source, mesure_le) values (p1, 'J+7', 'visites', 'mesure', 3, 'releve_main', now() + interval '8 days')`, '23')
E('mesure : une valeur mesurée ne se réécrit pas', `update public.contenu_mesures set valeur = 999 where post_id = p1 and echeance = 'H+1' and metrique = 'vues'`, 'contenu:mesure_figee')
E('mesure : jamais effacée', `delete from public.contenu_mesures where post_id = p1`, 'contenu:ajout_seul')
O('mesure : « non mesuré » peut devenir mesuré plus tard', `update public.contenu_mesures set etat = 'mesure', valeur = 55, source = 'releve_main', mesure_le = now() + interval '2 days' where post_id = p1 and echeance = 'H+24' and metrique = 'vues'`)

// ── 8. idées ──────────────────────────────────────────────────────────────────────────────
O('idée : provenance et note', `insert into public.contenu_idees (ligne_id, texte, source, origine, score) values ('L2', 'une question sur les devis en retard', 'plans/accroches-par-metier.md', 'douleur', 60)`)
E('idée : sans provenance refusée', `insert into public.contenu_idees (texte, source, origine) values ('idée sans source', '', 'veille')`, '23')
E('idée : note hors 0-100 refusée', `insert into public.contenu_idees (texte, source, origine, score) values ('idée notée trop haut', 'docs/x.md', 'veille', 101)`, '23')
E('idée nominative sans expiration refusée', `insert into public.contenu_idees (texte, source, origine, nominative) values ('idée de veille nominative', 'veille du jour', 'veille', true)`, '23')
E('idée nominative expirant à 31 jours refusée', `insert into public.contenu_idees (texte, source, origine, nominative, expire_le) values ('idée de veille nominative', 'veille du jour', 'veille', true, now() + interval '31 days')`, '23')
O('idée nominative à 30 jours acceptée', `insert into public.contenu_idees (texte, source, origine, nominative, expire_le) values ('idée de veille nominative', 'veille du jour', 'veille', true, now() + interval '30 days')`)
O('idée nominative déjà échue (posée il y a 40 jours)', `insert into public.contenu_idees (texte, source, origine, nominative, expire_le, cree_le) values ('idée échue', 'veille ancienne', 'veille', true, now() - interval '10 days', now() - interval '40 days')`)
RAW(`  k := public.contenu_veille_purger();`)
C('purge de la veille : 1 échue retirée, la valide et la non nominative restent', () => `select k = 1 and (select count(*) from public.contenu_idees) = 2`)

// ── 9. droits et RLS ──────────────────────────────────────────────────────────────────────
C('RLS active sur les six tables', `select count(*) = 6 and bool_and(relrowsecurity) from pg_class where relnamespace = 'public'::regnamespace and relname in ('contenu_lignes','contenu_comptes','contenu_posts','contenu_mesures','contenu_suspensions','contenu_idees')`)
C('aucune politique d’écriture', `select count(*) = 0 from pg_policies where tablename like 'contenu_%' and cmd <> 'SELECT'`)
C('anon et PUBLIC n’ont aucun droit de table', `select not exists (select 1 from information_schema.role_table_grants where table_name like 'contenu_%' and table_schema = 'public' and grantee in ('anon','PUBLIC'))`)
C('authenticated : SELECT seulement', `select not exists (select 1 from information_schema.role_table_grants where table_name like 'contenu_%' and table_schema = 'public' and grantee = 'authenticated' and privilege_type <> 'SELECT')`)
C('fonctions du contenu : service_role seulement (ni anon, ni authenticated), privées sans exécuteur', `select count(*) > 0 and not bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) and bool_and(case when p.proname in ('contenu_journal','contenu_lignes_garde','contenu_posts_garde','contenu_suspensions_garde','contenu_mesures_garde') then not has_function_privilege('service_role', p.oid, 'execute') else has_function_privilege('service_role', p.oid, 'execute') end) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'contenu_%'`)
const ROLE = (nom, prelude, corps, verifie, quand = 'exception') => RAW(`  begin
    ${prelude}
    ${corps}
    reset role; ${OK(nom, quand === 'ok' ? verifie : 'false')}
  exception when others then reset role; ${OK(nom, quand === 'ok' ? 'false' : verifie, 'sqlerrm')}
  end;`)
ROLE('anon : lecture refusée', `set local role anon;`, `perform 1 from public.contenu_posts limit 1;`, `sqlstate = '42501'`)
ROLE('anon : fonction du contenu refusée', `set local role anon;`, `perform public.contenu_post_ouvrir(p3, d13);`, `sqlstate = '42501'`)
ROLE('authenticated non fondateur : ne voit aucune ligne', `perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true); set local role authenticated;`, `select count(*) into k from public.contenu_posts;`, `k = 0`, 'ok')
ROLE('authenticated fondateur : lit les publications', `perform set_config('request.jwt.claims', json_build_object('sub', F, 'role', 'authenticated')::text, true); set local role authenticated;`, `select count(*) into k from public.contenu_posts;`, `k > 0`, 'ok')
ROLE('authenticated fondateur : écriture refusée', `perform set_config('request.jwt.claims', json_build_object('sub', F, 'role', 'authenticated')::text, true); set local role authenticated;`, `update public.contenu_posts set statut = 'refuse' where id = p3;`, `sqlstate = '42501'`)
ROLE('service_role : écriture directe ne contourne pas la garde', `set local role service_role;`, `insert into public.contenu_posts (ligne_id, canal, agent, texte) values ('L2', 'facebook', 'fabrique', 'Écriture directe de service_role') returning id into p13; update public.contenu_posts set statut = 'publiable' where id = p13;`, `sqlerrm like '%contenu:transition%'`)
ROLE('service_role : appelle les fonctions du contenu', `set local role service_role;`, `perform public.contenu_post_verdict(p3);`, `true`, 'ok')
C('le journal du bus a reçu les gestes (accord, ligne, suspension, reprise)', `select count(distinct type) = 4 from ops.evenements where type in ('contenu_accord','contenu_ligne','contenu_suspension','contenu_reprise')`)

const corps = out.join('\n')
const sql = `do $essai$
declare
  F uuid; k integer; s uuid; D_L2 text; D_P text;
  d1 uuid; d2 uuid; d3 uuid; d5 uuid; d6 uuid; d7 uuid; d8 uuid; d9 uuid; d10 uuid; d11 uuid; d12 uuid; d13 uuid; d14 uuid; d15 uuid; d16 uuid; d17 uuid; d18 uuid; dx uuid;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid; p6 uuid; p7 uuid; p8 uuid; p9 uuid; p10 uuid; p11 uuid; p12 uuid; p13 uuid;
begin
  create temp table essai_r (n text, ok boolean, m text) on commit drop;
  create function pg_temp.t(nom text, ok boolean, m text default null) returns void language sql as $t$ insert into essai_r values (nom, ok, m) $t$;
  create function pg_temp.x(nom text, attendu text, m text, etat text) returns void language sql as $t$ insert into essai_r values (nom, m like '%' || attendu || '%' or (attendu ~ '^[0-9]+$' and etat like attendu || '%'), m) $t$;
  create function pg_temp.d(cle text, choix text default 'accorder', portee text default 'securite', defaut text default 'refuser') returns uuid language plpgsql as $t$ declare v uuid; f uuid; begin select id into f from public.artisans where is_founder limit 1; select c.id into v from public.ops_decision_creer('crieur', 'Essai 026-206 : accorder ?', null, '[{"cle":"accorder","libelle":"Accorder","recommandee":false},{"cle":"refuser","libelle":"Refuser","recommandee":true}]'::jsonb, defaut, null, portee, now() + interval '2 days', cle, null) c; if choix is not null then perform public.ops_decision_trancher(v, choix, f); end if; return v; end $t$;
  create function pg_temp.np(ligne text, canal text, agent text, texte text, rendu text, h text, aff text, neutres boolean, statut text) returns uuid language plpgsql as $t$ declare v uuid; begin insert into public.contenu_posts (ligne_id, canal, agent, texte, rendu_type, rendu_empreinte, affirmations, chiffres_neutres, statut) values (ligne, canal, agent, texte, rendu, case when rendu = 'texte' then null else repeat(h, 64) end, aff::jsonb, neutres, statut) returning id into v; return v; end $t$;
  execute $migration$${mig}$migration$;
${corps}
  raise exception 'ESSAI_A_SEC %', (select jsonb_build_object('total', count(*), 'ko', count(*) filter (where not ok), 'echecs', coalesce(jsonb_agg(jsonb_build_object('n', n, 'm', m)) filter (where not ok), '[]'::jsonb)) from essai_r)::text;
end
$essai$;
`
process.stdout.write(sql)
