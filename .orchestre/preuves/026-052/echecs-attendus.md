# Échecs attendus des juges de la production sur l'usine (026-052)

Chaque juge écrit sa section par `--preuve-echecs` ; les deux autres sections sont gardées telles quelles.

<!-- debut:usine-sql-qa -->
## usine-sql-qa (juge de 026-054)

Écrit par `node scripts/usine-sql-qa.mjs --preuve-echecs` le 2026-09-27T21:04:37Z.

### Autotest des jeux d'essai

| Critère | Verdict | Ce qui est vérifié |
|---|---|---|
| AT-1 | PASS | contrat-usine.json relu : 14 types (bucket = capacité), bucket 8388608 ≥ 5242880 par fichier, deux graines à neuf champs, expression des noms éprouvée |
| AT-2 | PASS | scripts/fixtures/026/usine-production/essai-0110.sql se parse (14 clés) ; le bloc généré sur le jumeau d'exemple est un seul énoncé do $essai_026$ … raise, sans mot interdit |
| AT-3 | PASS | le compte rendu d'essai du témoin porte l'empreinte de son jumeau nu et toutes les clés du scénario |

### Sur l'arbre de référence a14b6c1 (aucun fichier jugé)

| Critère attendu en premier | Code | Premier échec réel |
|---|---|---|
| US-1 | 1 | FAIL US-1 — 0 fichier(s) supabase/migrations/*_usine_socle.sql (un seul attendu) |

### Le témoin et les sabotages

Témoin : `scripts/fixtures/026/usine-production/temoin/` (supabase/ et .orchestre/preuves/026-054/), superposé à supabase/ de HEAD ; code 0.

| Critère | Fichier du témoin | Remplacement | Code | Juste | Ligne relevée (extrait réel) |
|---|---|---|---|---|---|
| US-1 | `supabase/migrations/0110_usine_socle.sql` | « (copie du fichier) » → « supabase/migrations/0111_usine_socle.sql » (une seconde migration *_usine_socle.sql) | 1 | oui | FAIL US-1 — 2 fichier(s) supabase/migrations/*_usine_socle.sql (un seul attendu) : 0110_usine_socle.sql, 0111_usine_socle.sql |
| US-1 | `supabase/controles/0110_usine_socle.sql` | « (copie du fichier) » → « supabase/migrations/0110_autre_chose.sql » (le numéro 0110 porté par une autre migration) | 1 | oui | FAIL US-1 — le numéro 0110 est aussi porté par 0110_autre_chose.sql |
| US-2 | `supabase/migrations/0110_usine_socle.sql` | « values ('usine', 'usine', false, » → « values ('usine', 'usine', true, » | 1 | oui | FAIL US-2 — public = true (false attendu : le bucket est privé) |
| US-2 | `supabase/migrations/0110_usine_socle.sql` | « 'application/xml', 'text/xml']::text[]) » → « 'application/xml']::text[]) » | 1 | oui | FAIL US-2 — types permis ≠ ceux du contrat : en trop [], manquants ["text/xml"] |
| US-2 | `supabase/migrations/0110_usine_socle.sql` | « do update set public = false, » → « do update set public = true, » | 1 | oui | FAIL US-2 — on conflict : public = true (false attendu) |
| US-2 | `supabase/migrations/0110_usine_socle.sql` | « -- La tâche détenue » → « create policy "usine_lecture" on storage.objects for select using (bu… » | 1 | oui | FAIL US-2 — 1 politique(s) sur storage.objects : create policy "usine_lecture" on storage.objects for select using(bucket_id = 'usine') |
| US-3 | `supabase/migrations/0110_usine_socle.sql` | « language sql stable security definer » → « language sql stable » | 1 | oui | FAIL US-3 — pas « security definer » (ops.taches est fermée) |
| US-3 | `supabase/migrations/0110_usine_socle.sql` | « and t.bail_jusqua > now() » → «  » | 1 | oui | FAIL US-3 — filtre ≠ « id = p_id and agent = p_agent and statut = 'bail' and bail_jusqua > now() » : manque bail_jusqua>now() |
| US-3 | `supabase/migrations/0110_usine_socle.sql` | « t.statut = 'bail' » → « t.statut in ('bail', 'file') » | 1 | oui | FAIL US-3 — filtre ≠ « id = p_id and agent = p_agent and statut = 'bail' and bail_jusqua > now() » : manque statut='bail' ; en trop statutin('bail','file') |
| US-3 | `supabase/migrations/0110_usine_socle.sql` | « to service_role; » → « to service_role, authenticated; » | 1 | oui | FAIL US-3 — grant ≠ « grant execute on function public.ops_tache_detenue(text, uuid) to service_role » : grant execute on function public.ops_tache_detenue(text, uuid) to service_role, authenticated |
| US-3 | `supabase/migrations/0110_usine_socle.sql` | « from public, anon, authenticated; » → « from public; » | 1 | oui | FAIL US-3 — revoke from public (public, anon, authenticated attendus, jamais service_role) |
| US-3 | `supabase/migrations/0110_usine_socle.sql` | « set search_path = pg_catalog, ops » → «  » | 1 | oui | FAIL US-3 — search_path non fixé (« set search_path = … » attendu) |
| US-4 | `supabase/migrations/0110_usine_socle.sql` | « array['evenements', 'decisions']::text[], 30, 30, 2, 0); » → « array['evenements', 'decisions']::text[], 30, 30, 5, 0); » | 1 | oui | FAIL US-4 — usine : p_quota_creations_jour = 5 (2 attendu) |
| US-4 | `supabase/migrations/0110_usine_socle.sql` | « 'Livreur de sites (usine)' » → « 'Livreur de sites' » | 1 | oui | FAIL US-4 — livreur_usine : p_libelle = 'Livreur de sites' ("Livreur de sites (usine)" attendu) |
| US-4 | `supabase/migrations/0110_usine_socle.sql` | « array['taches', 'evenements']::text[], 60, 30, 0, 0); » → « array['taches', 'evenements']::text[], 60, 30, 0, 0); update ops.agen… » | 1 | oui | FAIL US-4 — la migration mentionne en_pause (le jeton, la pause et le battement ne se sèment pas) ; écriture directe dans ops.agents (les graines passent par ops_agent_enregistrer) |
| US-4 | `supabase/migrations/0110_usine_socle.sql` | « array['taches', 'evenements']::text[], 60, 30, 0, 0); » → « array['taches', 'evenements']::text[], 60, 30, 0, 0); select public.o… » | 1 | oui | FAIL US-4 — 3 appel(s) d'ops_agent_enregistrer dont 3 « select public.ops_agent_enregistrer(…) » (deux attendus) ; graine d'un agent hors contrat : « livreur » ; la migration touche livreur (leurs graines sont celles de… |
| US-5 | `supabase/migrations/0110_usine_socle.sql` | « -- Les deux agents » → « delete from storage.objects where bucket_id = 'usine'; -- Les deux ag… » | 1 | oui | FAIL US-5 — « delete » dans la migration |
| US-5 | `supabase/migrations/0096_ops_socle.sql` | « create table if not exists ops.agents ( » → « create table if not exists ops.agents ( -- modifiée après coup » | 1 | oui | FAIL US-5 — 1 fichier(s) existant(s) changé(s) (git diff HEAD) : M supabase/migrations/0096_ops_socle.sql |
| US-6 | `supabase/migrations/_A_COLLER_sql_editor_0110_NU.sql` | « array['surveillance']::text[] » → « array['surveillance', 'livraison']::text[] » | 1 | oui | FAIL US-6 — sql-nu.mjs --verifier supabase/migrations/0110_usine_socle.sql supabase/migrations/_A_COLLER_sql_editor_0110_NU.sql (coupé à la marque) en code 1 : ❌ C:\Users\benja\Documents\presti\.orchestre\travail\usine-… |
| US-6 | `supabase/controles/0110_usine_socle.sql` | « then 'oui' else 'non' end; » → « then 'oui' else 'non' end; update ops.agents set periode_minutes = 60… » | 1 | oui | FAIL US-6 — supabase/migrations/_A_COLLER_sql_editor_0110_NU.sql n'est pas la sortie de sql-nu.mjs sur la migration (ni avec --controle supabase/controles/0110_usine_socle.sql, ni sans) ; supabase/controles/0110_usine_s… |
| US-6 | `supabase/migrations/_A_COLLER_sql_editor_0110.sql` | « grant execute on function public.ops_tache_detenue(text, uuid) to ser… » → « grant execute on function public.ops_tache_detenue(text, uuid) to ser… » | 1 | oui | FAIL US-6 — sql-nu.mjs --verifier supabase/migrations/0110_usine_socle.sql supabase/migrations/_A_COLLER_sql_editor_0110.sql (coupé à la marque) en code 1 : ❌ C:\Users\benja\Documents\presti\.orchestre\travail\usine-sql… |
| US-7 | `.orchestre/preuves/026-054/essai-a-sec.txt` | « APRES rien_ne_reste=true » → « APRES rien_ne_reste=false » | 1 | oui | FAIL US-7 — .orchestre/preuves/026-054/essai-a-sec.txt : APRES rien_ne_reste=false : l'essai a laissé une trace |
| US-7 | `.orchestre/preuves/026-054/essai-a-sec.txt` | « "pas_pour_bail_expire":true » → « "pas_pour_bail_expire":false » | 1 | oui | FAIL US-7 — .orchestre/preuves/026-054/essai-a-sec.txt : clé(s) qui ne valent pas true : pas_pour_bail_expire=false |
| US-7 | `supabase/migrations/_A_COLLER_sql_editor_0110_NU.sql` | « — coller ce fichier EN ENTIER. » → « — coller ce fichier EN ENTIER, régénéré après l'essai. » (le jumeau nu changé après l'essai (même SQL, autre empreinte)) | 1 | oui | FAIL US-7 — .orchestre/preuves/026-054/essai-a-sec.txt : empreinte b0d8f89bfa7d… ≠ celle du jumeau courant 21f7d414ad20… : l'essai a porté sur un autre texte |
<!-- fin:usine-sql-qa -->

<!-- debut:usine-production-qa -->
## usine-production-qa (juge de 026-057 ; --reel pour 026-143)

Écrit par `node --import ./scripts/ts-loader.mjs scripts/usine-production-qa.mjs --preuve-echecs` le 2026-09-27T21:10:35Z.

### Autotest des jeux d'essai

| Critère | Verdict | Ce qui est vérifié |
|---|---|---|
| AT-1 | PASS | faux bus : 401 sans jeton, prendre depuis la file, entrées servies aux octets exacts, dépôts fautifs refusés (type, nom, doublon, sha256, taille, clé en trop), PUT consigné, faite exige supabase://, clés de rendre exactes, mode en_pause ; journal sans le jeton |
| AT-2 | PASS | faux fabricant : ok-site écrit un WebP entier (RIFF de la bonne taille, WEBP), du JSON qui se relit et un manifeste égal à la liste du juge ; il consigne les noms de ses variables, jamais leurs valeurs |
| AT-3 | PASS | contrat relu : limites, unités (CODEX_LANCEUR au livreur seul), env du fabricant = env permis + table ; 3 entrées non vides, meminfo-1go à 1 Go, 3 valeurs privées à chercher |

### Sur l'arbre de référence a14b6c1 (aucun fichier jugé)

| Groupe | Critère attendu en premier | Code | Premier échec réel |
|---|---|---|---|
| tourneur | UT-1 | 1 | FAIL UT-1 — non jugé : scripts/usine/tourneur.mjs, scripts/usine/capacites.mjs absent(s) de la racine |
| unites | UN-1 | 1 | FAIL UN-1 — scripts/usine/systemd/presti-atelier.service absent ; scripts/usine/systemd/presti-atelier.timer absent |

### Le témoin et les sabotages

Témoin : `scripts/fixtures/026/usine-production/temoin/` (scripts/usine/tourneur.mjs, capacites.mjs, les quatre unités, lib/agents/usineLimites.json, docs/agents/usine-production.md), avec scripts/instantane-quotidien.mjs et scripts/ts-loader.mjs du dépôt. Le tourneur du témoin tourne pour de vrai sur le poste. Code du témoin intact : 0.

| Critère | Fichier du témoin | Remplacement | Code | Juste | Ligne relevée (extrait réel) |
|---|---|---|---|---|---|
| UT-1 | `scripts/usine/tourneur.mjs` | « await bus('/api/agents/battement') » → « await bus('/api/agents/battement') await bus('/api/agents/battement') » | 1 | oui | FAIL UT-1 — requêtes ["/api/agents/battement","/api/agents/battement","/api/agents/taches/prendre"] (exactement un battement puis un prendre attendus) |
| UT-1 | `scripts/usine/tourneur.mjs` | « journal({ le: new Date().toISOString(), capacite, taches: nTaches, du… » → « journal({ le: new Date().toISOString(), capacite, taches: nTaches, ho… » | 1 | oui | FAIL UT-1 — journal : {"le":"2026-09-27T21:09:08.072Z","capacite":"livraison","taches":0,"hote":"LAPTOP-6KDEHT8P","duree_s":0.2} (une ligne de passage { le, capacite, taches, duree_s }, taches 0, attendue) |
| UT-2 | `scripts/usine/tourneur.mjs` | « { cwd: RACINE, env, shell: false, » → « { cwd: RACINE, env, shell: true, » | 1 | oui | FAIL UT-2 — scripts/usine/tourneur.mjs lance par un shell (shell: true ou exec de child_process) ; 0 lancement(s) du fabricant (un attendu) ; 0 requête(s) de dépôt (une attendue) ; rendre : [{"tache":"894d4c31-7e93-497a… |
| UT-2 | `scripts/usine/tourneur.mjs` | « resultat === 'faite' ? { resultat, preuve_url: `supabase://usine/${id… » → « resultat === 'faite' ? { resultat, preuve_url: `supabase://usine/${id… » | 1 | oui | FAIL UT-2 — rendre : [{"tache":"cd6f5e9a-16a6-49fe-9766-c76cc1c75303","resultat":"faite","preuve_url":"supabase://usine/cd6f5e9a-16a6-49fe-9766-c76cc1c75303/"}] (une fois, faite, supabase://usine/<tache>/sortie/ attendu) |
| UT-2 | `scripts/usine/tourneur.mjs` | « headers: { 'content-type': type }, body: corps, » → « headers: { 'content-type': 'application/octet-stream' }, body: corps, » | 1 | oui | FAIL UT-2 — site/index.html : Content-Type « application/octet-stream » (text/html attendu) ; site/site.json : Content-Type « application/octet-stream » (application/json attendu) ; site/styles.css : Content-Type « appl… |
| UT-2 | `scripts/usine/tourneur.mjs` | « if (resultat === 'faite') fs.rmSync(dossier, { recursive: true, force… » → «  » | 1 | oui | FAIL UT-2 — le dossier de la tâche n'est pas effacé après un succès |
| UT-2 | `scripts/usine/tourneur.mjs` | « x.octets = b.length; x.sha256 = sha256(b) » → « x.octets = b.length; x.sha256 = sha256(Buffer.concat([b, Buffer.from(… » | 1 | oui | FAIL UT-2 — site/index.html : PUT de 208 octets (802a3ebf) pour 208 déclarés (18703c73) ; site/site.json : PUT de 36 octets (269dc746) pour 36 déclarés (ed6b7818) ; site/styles.css : PUT de 54 octets (1c7ebe98) pour 54 … |
| UT-2 | `scripts/usine/tourneur.mjs` | « fs.writeFileSync(path.join(entreeDir, 'charge.json'), JSON.stringify(… » → « fs.writeFileSync(path.join(entreeDir, 'charge.json'), JSON.stringify(… » | 1 | oui | FAIL UT-2 — charge.json {"commande":"cf9ada86-0ac0-4981-937a-1ed43344f40c","tache":"119dc2ed-8671-4c84-… ≠ la charge de la tâche |
| UT-2 | `scripts/usine/tourneur.mjs` | « const r = await fetch(x.url, { signal » → « const r = await fetch(x.url, { headers: { authorization: `Bearer ${je… » | 1 | oui | FAIL UT-2 — le jeton de l'agent part vers le stockage (en-tête Authorization sur une URL signée) |
| UT-2 | `scripts/usine/tourneur.mjs` | « const argv = CAP.commande.map( » → « const argv = (process.env.PRESTI_FABRICANT ? [process.execPath, proce… » | 1 | oui | FAIL UT-2 — scripts/usine/tourneur.mjs lit process.env.PRESTI_FABRICANT (seules PATH, HOME, LANG, TZ, PLAYWRIGHT_BROWSERS_PATH et les noms de la table sont permises) ; scripts/usine/tourneur.mjs lit process.env.PRESTI_F… |
| UT-3 | `scripts/usine/tourneur.mjs` | « const env = {} » → « const env = { ...process.env } » | 1 | oui | FAIL UT-3 — le fabricant voit ANTHROPIC_API_KEY, COMSPEC, GITHUB_TOKEN, PATHEXT, PRESTI_COMMANDE_LIVRAISON, PRESTI_FABRICANT, PRESTI_JETON_ATELIER, PRESTI_JETON_CHEF, PRESTI_JETON_LIVREUR_USINE, PRESTI_URL, STRIPE_SECRE… |
| UT-3 | `scripts/usine/tourneur.mjs` | « ['PATH', 'HOME', 'LANG', 'TZ', 'PLAYWRIGHT_BROWSERS_PATH', ...(CAP.en… » → « ['PATH', 'HOME', 'LANG', 'TZ', 'PLAYWRIGHT_BROWSERS_PATH', CAP.jeton,… » | 1 | oui | FAIL UT-3 — le fabricant voit PRESTI_JETON_LIVREUR_USINE (seules PATH, HOME, LANG, TZ, PLAYWRIGHT_BROWSERS_PATH, CODEX_LANCEUR et les variables de libuv attendues) ; un PRESTI_JETON_* ou ANTHROPIC_* atteint le fabricant |
| UT-3 | `scripts/usine/tourneur.mjs` | « ['PATH', 'HOME', 'LANG', 'TZ', 'PLAYWRIGHT_BROWSERS_PATH', ...(CAP.en… » → « ['PATH', 'HOME', 'LANG', 'TZ', 'PLAYWRIGHT_BROWSERS_PATH'] » | 1 | oui | FAIL UT-3 — le fabricant ne voit pas CODEX_LANCEUR |
| UT-4 | `scripts/usine/tourneur.mjs` | « const minuterie = setTimeout(() => { expire = true; tuerArbre(enfant.… » → « const minuterie = setTimeout(() => { expire = true; enfant.kill('SIGK… » | 1 | oui | FAIL UT-4 — le petit-enfant bat encore après le délai : l'arbre n'est pas tué ; le petit-enfant (pid 14684) est vivant |
| UT-4 | `scripts/usine/tourneur.mjs` | « if (f.expire) return finir('echec', 'fabrication:delai') » → « if (f.expire) return finir('echec', 'fabrication:code 137') » | 1 | oui | FAIL UT-4 — délai dépassé : erreur « fabrication:code 137 » (« fabrication:delai » attendu) |
| UT-5 | `scripts/usine/tourneur.mjs` | « if (!st.size \|\| st.size > LIM.octets_fichier_max) return { erreur: 's… » → « if (!st.size) return { erreur: 'sortie:taille' } » | 1 | oui | FAIL UT-5 — sorties fautives : 1 dépôt(s), 0 PUT (aucun attendu) ; gros : erreur « depot » (« sortie:taille » attendu) |
| UT-5 | `scripts/usine/tourneur.mjs` | « if (st.isSymbolicLink() \|\| !st.isFile()) return { erreur: 'sortie:lie… » → « if (!fs.statSync(chemin).isFile()) return { erreur: 'sortie:lien' } » | 1 | oui | FAIL UT-5 — sorties fautives : 1 dépôt(s), 6 PUT (aucun attendu) ; lien-symbolique : rendue « faite » (echec attendu) ; une sortie fautive rendue faite |
| UT-5 | `scripts/usine/tourneur.mjs` | « if (!NOM.test(f.nom) \|\| f.nom.includes('..') \|\| » → « if (f.nom.includes('//') \|\| » | 1 | oui | FAIL UT-5 — sorties fautives : 1 dépôt(s), 0 PUT (aucun attendu) ; nom-dangereux : erreur « depot » (« sortie:nom » attendu) |
| UT-5 | `scripts/usine/tourneur.mjs` | « if (!LIM.types.includes(f.type) \|\| !(EXT[path.extname(f.nom).toLowerC… » → « if (!f.type) return { erreur: 'sortie:type' } » | 1 | oui | FAIL UT-5 — sorties fautives : 1 dépôt(s), 0 PUT (aucun attendu) ; hors-type : erreur « depot » (« sortie:type » attendu) |
| UT-5 | `scripts/usine/tourneur.mjs` | « try { man = JSON.parse(fs.readFileSync(path.join(sortieDir, 'manifest… » → « try { man = JSON.parse(fs.readFileSync(path.join(sortieDir, 'manifest… » | 1 | oui | FAIL UT-5 — manifeste-absent : erreur « sortie:nom » (« sortie:manifeste » attendu) |
| UT-6 | `scripts/usine/tourneur.mjs` | « MOTIFS_SECRETS.some(({ re }) => re.test(t)) \|\| JETON_AGENT.test(t) \|\|… » → « MOTIFS_SECRETS.some(({ re }) => re.test(t)) \|\| t.includes(jeton) » | 1 | oui | FAIL UT-6 — secret : 1 dépôt(s), 5 PUT (aucun attendu) ; secret : rendue « faite » (echec attendu) |
| UT-6 | `scripts/usine/tourneur.mjs` | « if (MOTIFS_SECRETS.some » → « const tr = JETON_AGENT.exec(t); if (tr) console.log(`secret trouvé : … » | 1 | oui | FAIL UT-6 — la valeur du secret est répétée (sortie, journal ou corps envoyé au bus) |
| UT-7 | `scripts/usine/tourneur.mjs` | « if (f.code !== 0) return finir('echec', `fabrication:code ${f.code}`) » → « if (f.code !== 0 && f.code !== 3) return finir('echec', `fabrication:… » | 1 | oui | FAIL UT-7 — fabricant en code 3 : erreur « sortie:manifeste » (« fabrication:code 3 » attendu) |
| UT-8 | `scripts/usine/tourneur.mjs` | « if (SCHEMAS[capacite](t.charge)) return finir('echec', 'charge') » → «  » | 1 | oui | FAIL UT-8 — charge avec telephone : rendue « faite » (echec attendu) ; le fabricant a été lancé 1 fois (jamais attendu) ; charge ou capacité fautive : 1 dépôt(s), 5 PUT (aucun attendu) ; l'entrée d'une tâche fautive est… |
| UT-8 | `scripts/usine/tourneur.mjs` | « if (!/^[0-9a-f-]{36}$/i.test(id) \|\| t.type !== CAP.type) return finir… » → « if (!/^[0-9a-f-]{36}$/i.test(id)) return finir('echec', 'capacite') » | 1 | oui | FAIL UT-8 — capacité inconnue : rendue « faite » (echec attendu) ; le fabricant a été lancé 1 fois (jamais attendu) ; charge ou capacité fautive : 1 dépôt(s), 5 PUT (aucun attendu) ; l'entrée d'une tâche fautive est dem… |
| UT-8 | `scripts/usine/capacites.mjs` | « for (const k of Object.keys(c)) if (!['commande', 'essai'].includes(k… » → « for (const k of Object.keys(c)) if (!['commande', 'essai', 'telephone… » | 1 | oui | FAIL UT-8 — charge avec telephone : rendue « faite » (echec attendu) ; le fabricant a été lancé 1 fois (jamais attendu) ; charge ou capacité fautive : 1 dépôt(s), 5 PUT (aucun attendu) ; l'entrée d'une tâche fautive est… |
| UT-9 | `scripts/usine/tourneur.mjs` | « if (mem < MEMOIRE_MIN \|\| disque < DISQUE_MIN) » → « if (disque < DISQUE_MIN) » | 1 | oui | FAIL UT-9 — requêtes ["/api/agents/battement","/api/agents/taches/prendre","/api/agents/usine/entree","stockage:lire","stockage:lire","stockage:lire","/api/agents/usine/depot","stockage:deposer","stockage:deposer","stoc… |
| UT-9 | `scripts/usine/tourneur.mjs` | « const m = /^MemAvailable:\s+(\d+)\s+kB/m.exec(fs.readFileSync(f, 'utf… » → « const m = /^MemTotal:\s+(\d+)\s+kB/m.exec(fs.readFileSync(f, 'utf8')) » | 1 | oui | FAIL UT-9 — requêtes ["/api/agents/battement","/api/agents/taches/prendre","/api/agents/usine/entree","stockage:lire","stockage:lire","stockage:lire","/api/agents/usine/depot","stockage:deposer","stockage:deposer","stoc… |
| UT-10 | `scripts/usine/tourneur.mjs` | « if (!prendreVerrou()) { console.log('déjà en cours'); process.exit(0)… » → « prendreVerrou() » | 1 | oui | FAIL UT-10 — second passage simultané : code 0, « » (0 et « déjà en cours » attendus) ; 2 prendre (le second passage ne prend rien) |
| UT-10 | `scripts/usine/tourneur.mjs` | « if (age < VERROU_MAX_MS) return false » → « if (age < 24 * VERROU_MAX_MS) return false » | 1 | oui | FAIL UT-10 — un verrou de 65 min n'est pas repris (aucun prendre) ; la reprise du verrou n'est pas dite au journal (sortie du service) |
| UT-10 | `scripts/usine/tourneur.mjs` | « console.log('verrou de plus de 60 min repris') » → «  » | 1 | oui | FAIL UT-10 — la reprise du verrou n'est pas dite au journal (sortie du service) |
| UT-11 | `scripts/usine/tourneur.mjs` | « journal({ le: new Date().toISOString(), tache: id, code: » → « journal({ le: new Date().toISOString(), tache: id, commande: t.charge… » | 1 | oui | FAIL UT-11 — ligne(s) de journal hors des deux formes : {"le":"2026-09-27T21:10:02.971Z","tache":"9a313096-955b-40ae-9a72-4576120339ed","commande":"1b9c7891-cacf-495f-ad93-9224dcba6d8c","code":0,… ; 0 ligne(s) de tâche … |
| UT-11 | `scripts/usine/tourneur.mjs` | « fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(… » → « fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(… » | 1 | oui | FAIL UT-11 — la console porte une valeur de commande.json (« Atelier Lestraque ») |
| UT-11 | `scripts/usine/tourneur.mjs` | « console.log(`${id} ${resultat}${erreur ? ` ${erreur}` : ''}`) » → « console.log(`${id} ${resultat}${erreur ? ` ${erreur}` : ''} ${JSON.st… » | 1 | oui | FAIL UT-11 — la console porte une valeur de commande.json (« +33 2 61 91 38 47 ») |
| UT-12 | `scripts/usine/tourneur.mjs` | « const jeton = process.env[CAP.jeton] » → « const jeton = process.env[CAP.jeton] \|\| process.env.PRESTI_JETON » | 1 | oui | FAIL UT-12 — jeton absent de PRESTI_JETON_LIVREUR_USINE (présent sous d'autres noms) : code 0 (2 attendu) ; jeton absent : 14 requête(s) (aucune attendue) |
| UT-12 | `scripts/usine/tourneur.mjs` | « if (urlBase.protocol === 'http:' ? !['127.0.0.1', 'localhost'].includ… » → « if (!['http:', 'https:'].includes(urlBase.protocol)) » | 1 | oui | FAIL UT-12 — --base=http://exemple.invalid : code 1 (2 attendu) |
| UT-12 | `scripts/usine/tourneur.mjs` | « if (r.status === 401) throw new ErreurBus(1, 'bus : 401') » → « if (r.status === 401) throw new ErreurBus(1, `bus : 401 avec ${jeton.… » | 1 | oui | FAIL UT-12 — 401 : le jeton de l'agent apparaît sur la sortie ou au journal |
| UT-13 | `scripts/usine/tourneur.mjs` | « if (r.status === 429) throw new ErreurBus(3, 'bus : 429, passage arrê… » → « if (r.status === 429) throw new ErreurBus(1, 'bus : 429, passage arrê… » | 1 | oui | FAIL UT-13 — 429 sur prendre : code 1, 2 requête(s) (code 3, arrêt après la deuxième attendus) |
| UT-13 | `scripts/usine/tourneur.mjs` | « if (d.status === 507) return finir('echec', 'depot:stockage') » → « if (d.status === 507) return finir('echec', 'depot') » | 1 | oui | FAIL UT-13 — dépôt en 507 : erreur « depot » (« depot:stockage » attendu) |
| UT-13 | `scripts/usine/tourneur.mjs` | « for (let essai = 1; essai <= 3; essai++) { » → « for (let essai = 1; essai <= 1; essai++) { » | 1 | oui | FAIL UT-13 — 1 essai(s) du PUT qui échoue (3 attendus) |
| UT-13 | `scripts/usine/tourneur.mjs` | « if (p.status === 423 && p.json?.code === 'agent_en_pause') { console.… » → « if (p.status === 423) throw new ErreurBus(1, 'prendre : 423') » | 1 | oui | FAIL UT-13 — agent_en_pause : code 1, « » (ligne en_pause, code 0, un prendre attendus) |
| UT-14 | `scripts/usine/tourneur.mjs` | « for (const f of man.fichiers) { if (!f \|\| » → « for (const n of ['site/non-liste.html']) if (fs.existsSync(path.join(… » | 1 | oui | FAIL UT-14 — le fichier hors manifeste est déposé ; 6 fichier(s) déclaré(s) (5 attendus) |
| UT-15 | `scripts/usine/tourneur.mjs` | « if (!u \|\| typeof u.url !== 'string' \|\| !(await deposer(u.url, x.chemi… » → « if (u && typeof u.url === 'string') await deposer(u.url, x.chemin, x.… » | 1 | oui | FAIL UT-15 — le troisième PUT échoue : rendue « faite » (echec attendu) ; tâche rendue faite avec une partie de ses fichiers |
| UT-16 | `scripts/usine/tourneur.mjs` | « while (nTaches < max && Date.now() » → « while (nTaches < max + 2 && Date.now() » | 1 | oui | FAIL UT-16 — 7 prendre (5 attendus) ; 7 rendues, 1 laissées en file (5 et 3 attendues) |
| UT-17 | `scripts/usine/tourneur.mjs` | « const LIMITES = JSON.parse(fs.readFileSync(path.join(RACINE, 'lib', '… » → « const LIMITES = { livraison: { entrees_max: 50, fichiers_max: 300, oc… » | 1 | oui | FAIL UT-17 — scripts/usine/tourneur.mjs porte une limite écrite en dur (« 5242880 ») : elle vient de lib/agents/usineLimites.json |
| UT-17 | `lib/agents/usineLimites.json` | « "entrees_max": 50, » → « "entrees_max": 60, » | 1 | oui | FAIL UT-17 — lib/agents/usineLimites.json : livraison.entrees_max ≠ contrat |
| UN-1 | `scripts/usine/systemd/presti-atelier.service` | « Environment=PRESTI_HOTE=usine » → « Environment=PRESTI_HOTE=usine EnvironmentFile=/home/agents/.config/pr… » | 1 | oui | FAIL UN-1 — presti-atelier.service porte EnvironmentFile |
| UN-1 | `scripts/usine/systemd/presti-atelier.service` | « TimeoutStartSec=45min » → « TimeoutStartSec=15min » | 1 | oui | FAIL UN-1 — presti-atelier.service [Service] TimeoutStartSec=15min (45min attendu) |
| UN-1 | `scripts/usine/systemd/presti-atelier.timer` | « OnCalendar=*:0/15 » → « OnCalendar=*:0/5 » | 1 | oui | FAIL UN-1 — presti-atelier.timer [Timer] OnCalendar=*:0/5 (*:0/15 attendu) |
| UN-1 | `scripts/usine/systemd/presti-atelier.service` | « Environment=PLAYWRIGHT_BROWSERS_PATH=/srv/playwright » → « Environment=PLAYWRIGHT_BROWSERS_PATH=/srv/playwright Environment=CODE… » | 1 | oui | FAIL UN-1 — presti-atelier.service [Service] Environment : ["PRESTI_HOTE=usine","PRESTI_URL=https://prestiapp.fr","PLAYWRIGHT_BROWSERS_PATH=/srv/playwright","CODEX_LANCEUR=/usr/local/bin/presti-ia-modele"] (exactement [… |
| UN-2 | `scripts/usine/systemd/presti-livreur.service` | « User=agents » → « User=usine » | 1 | oui | FAIL UN-2 — presti-livreur.service [Service] User=usine (agents attendu) |
| UN-2 | `scripts/usine/systemd/presti-livreur.service` | « --base=https://prestiapp.fr --travail=/home/agents/travail/usine » → « --base=https://prestiapp.fr » | 1 | oui | FAIL UN-2 — presti-livreur.service [Service] ExecStart=/usr/bin/node scripts/usine/avec-coffre.mjs PRESTI_JETON_LIVREUR_USINE -- /usr/bin/node scripts/usine/tourneur.mjs --capacite=livraison --une-passe --base=https://p… |
| UN-2 | `scripts/usine/systemd/presti-livreur.service` | « Environment=CODEX_LANCEUR=/usr/local/bin/presti-ia-modele » → « Environment=CODEX_LANCEUR=/usr/local/bin/presti-ia-modele Environment… » | 1 | oui | FAIL UN-2 — presti-livreur.service [Service] Environment : ["PRESTI_HOTE=usine","PLAYWRIGHT_BROWSERS_PATH=/srv/playwright","CODEX_LANCEUR=/usr/local/bin/presti-ia-modele","PRESTI_URL=https://prestiapp.fr"] (exactement [… |
| UN-2 | `scripts/usine/systemd/presti-livreur.timer` | « Persistent=false » → « Persistent=true » | 1 | oui | FAIL UN-2 — presti-livreur.timer [Timer] Persistent=true (false attendu) |
| UN-3 | `docs/agents/usine-production.md` | « ## GitHub Actions en repli » → « ## Le repli » | 1 | oui | FAIL UN-3 — section « GitHub Actions en repli » absente |
| UN-3 | `docs/agents/usine-production.md` | « Une tâche dont la charge porte `essai: true` n'est jamais consommée. » → «  » | 1 | oui | FAIL UN-3 — « Ce que le serveur fait ensuite » ne dit pas « essai: true » |
| UN-3 | `docs/agents/usine-production.md` | « La clé de service Supabase, une clé Stripe, la clé Anthropic du produ… » → « La clé de service Supabase, une clé Stripe. » | 1 | oui | FAIL UN-3 — « Ce qui ne va jamais sur l'usine » ne dit pas « Anthropic » ; « Ce qui ne va jamais sur l'usine » ne dit pas « .env.local » |
<!-- fin:usine-production-qa -->

<!-- debut:usine-routes-qa -->
## usine-routes-qa (juge de 026-056)

Écrit par `node --import ./scripts/ts-loader.mjs scripts/usine-routes-qa.mjs --preuve-echecs` le 2026-09-27T21:07:53Z.

### Autotest des jeux d'essai

| Critère | Verdict | Ce qui est vérifié |
|---|---|---|
| AT-1 | PASS | faux Supabase : RPC jugées au contrat (nom de paramètre faux, type faux, fonction inconnue refusés et consignés), liste sans la sortie, signatures de lecture et de dépôt au format de storage-js, durée consignée |
| AT-2 | PASS | témoins de 026-038 (garde, bus, jetons) présents ; faux PostgREST : ops_tache_creer conforme → 200, « agent » au lieu de « p_agent » → 400 (faute consignée), 2 appels consignés |

### Sur l'arbre de référence a14b6c1 (aucun fichier jugé)

| Critère attendu en premier | Code | Premier échec réel |
|---|---|---|
| UR-1 | 1 | FAIL UR-1 — non jugé : 3 fichier(s) absent(s) : app/api/agents/usine/entree/route.ts, app/api/agents/usine/depot/route.ts, lib/agents/usineDepot.ts |

### Le témoin et les sabotages

Témoin (un projet complet) : app, lib, middleware.ts, tsconfig.json, package.json, supabase de HEAD ; lib/agents/garde.ts, lib/agents/bus.ts, lib/agents/jetons.ts des témoins de 026-038 ; busAgents levé dans lib/flags.ts ; puis `scripts/fixtures/026/usine-production/temoin/` (app/api/agents/usine/depot/route.ts, app/api/agents/usine/entree/route.ts, lib/agents/usineDepot.ts, lib/agents/usineLimites.json, supabase/migrations/0110_usine_socle.sql). UR-10 y lance le vrai `npm run typecheck`. Code du témoin intact : 0.

| Critère | Fichier du témoin | Remplacement | Code | Juste | Ligne relevée (extrait réel) |
|---|---|---|---|---|---|
| UR-1 | `app/api/agents/usine/entree/route.ts` | « if (!actif('busAgents')) return erreur('Introuvable.', 404) » → «  » | 1 | oui | FAIL UR-1 — drapeau baissé : entree → 200, 404 attendu ; drapeau baissé : entree fait 5 appel(s) au faux Supabase (ops_agent_par_jeton, consommer_limite, ops_tache_detenue, list, sign) ; entree ne lit pas le drapeau bus… |
| UR-1 | `app/api/agents/usine/depot/route.ts` | « if (!actif('busAgents')) » → « if (!actif('agentsUsine')) » | 1 | oui | FAIL UR-1 — depot ne lit pas le drapeau busAgents (drapeaux lus : agentsUsine) |
| UR-2 | `app/api/agents/usine/depot/route.ts` | « const t = await exigerTable(agent, 'taches') if (t) return reponseRef… » → «  » | 1 | oui | FAIL UR-2 — depot, agent sans la table taches : 404 (403 attendu) ; depot, agent sans la table taches : appel(s) ops_tache_detenue avant le refus |
| UR-2 | `app/api/agents/usine/entree/route.ts` | « if (refus(agent)) return reponseRefusAgent(agent) » → « if (refus(agent) && agent.status !== 401) return reponseRefusAgent(ag… » | 1 | oui | FAIL UR-2 — entree, sans jeton : 200 (401 attendu) ; entree, jeton inconnu : 200 (401 attendu) |
| UR-3 | `lib/agents/usineDepot.ts` | « createSignedUrl(`${prefixe}/${o.name}`, LECTURE_S) » → « createSignedUrl(`${prefixe}/${o.name}`, 3600) » | 1 | oui | FAIL UR-3 — durées de signature 3600 s (900 attendues) |
| UR-3 | `lib/agents/usineDepot.ts` | « if (!t) return INTROUVABLE const L = limitesDe(t.capacite) if (!L) re… » → « if (!t) return { status: 404, error: `tache_introuvable_${tacheId.sli… » (un 404 qui dit quelle tâche) | 1 | oui | FAIL UR-3 — les trois 404 n'ont pas le même corps : {"error":"tache_introuvable_aa8a"} \| {"error":"tache_introuvable_3c03"} \| {"error":"tache_introuvable_0166"} |
| UR-3 | `lib/agents/usineDepot.ts` | « if (objets.length > L.entrees_max) return » → « if (objets.length > L.entrees_max + 20) return » | 1 | oui | FAIL UR-3 — 60 objets : 200 (409 attendu) ; 60 objets : 51 signature(s) |
| UR-3 | `lib/agents/usineDepot.ts` | « const L = limitesDe(t.capacite) if (!L) return { status: 403, error: … » → « const L = limitesDe(t.capacite) ?? limitesDe('livraison') if (!L) ret… » (une capacité inconnue servie avec les limites de la livraison) | 1 | oui | FAIL UR-3 — capacité hors usineLimites.json : 200 (403 attendu) ; capacité hors usineLimites.json : 1 signature(s) |
| UR-3 | `lib/agents/usineDepot.ts` | « { p_agent: agentNom, p_id: tacheId } » → « { p_agent: agentNom === 'livreur_usine' ? 'livreur' : agentNom, p_id:… » | 1 | oui | FAIL UR-3 — tâche tenue : 404 (200 attendu) {"error":"tache_introuvable"} ; 60 objets : 404 (409 attendu) ; 50 objets pile : 404, 0 signature(s) (200 et 50 attendus) ; capacité hors usineLimites.json : 404 (403 attendu) |
| UR-4 | `lib/agents/usineDepot.ts` | « if (total > L.octets_total_max) return { status: 413, error: 'total_t… » → « if (total > L.octets_total_max) return { status: 400, error: 'total_t… » | 1 | oui | FAIL UR-4 — un total trop gros : 400 (413 attendu) |
| UR-4 | `lib/agents/usineDepot.ts` | « f.nom.includes('..') \|\| » → «  » | 1 | oui | FAIL UR-4 — un nom avec .. : 200 (un refus 4xx attendu) ; un nom avec .. : 2 appel(s) au stockage (upload, upload) — aucune signature attendue |
| UR-4 | `lib/agents/usineDepot.ts` | « if (vus.has(f.nom)) return { status: 400, error: 'nom_en_double' } » → «  » | 1 | oui | FAIL UR-4 — deux noms égaux : 200 (un refus 4xx attendu) ; deux noms égaux : 2 appel(s) au stockage (upload, upload) — aucune signature attendue |
| UR-4 | `lib/agents/usineDepot.ts` | « if (!SHA.test(f.sha256)) return { status: 400, error: 'sha256' } » → «  » | 1 | oui | FAIL UR-4 — un sha256 de 63 signes : 200 (un refus 4xx attendu) ; un sha256 de 63 signes : 2 appel(s) au stockage (upload, upload) — aucune signature attendue ; un sha256 non hexadécimal : 200 (un refus 4xx attendu) ; u… |
| UR-4 | `lib/agents/usineDepot.ts` | « const refus = valider(fichiers, L) if (refus) return refus » → « const signe = await supabaseAdmin.storage.from(BUCKET).createSignedUp… » | 1 | oui | FAIL UR-4 — un fichier trop gros : 1 appel(s) au stockage (upload) — aucune signature attendue ; un total trop gros : 1 appel(s) au stockage (upload) — aucune signature attendue ; un type hors capacité : 1 appel(s) au s… |
| UR-5 | `lib/agents/usineDepot.ts` | « if (Number(o.data) > SEUIL * STOCKAGE_TOTAL) » → « if (Number(o.data) > 0.9 * STOCKAGE_TOTAL) » | 1 | oui | FAIL UR-5 — stockage au-delà de 60 % : 200 (507 attendu) ; stockage au-delà de 60 % : 2 signature(s) (aucune attendue) |
| UR-5 | `lib/agents/usineDepot.ts` | « if (o.error \|\| typeof o.data !== 'number' && typeof o.data !== 'strin… » → « if (o.error) { /* on dépose quand même */ } » | 1 | oui | FAIL UR-5 — stockage mesure en erreur : 200 (503 attendu) ; stockage mesure en erreur : 2 signature(s) (aucune attendue) |
| UR-6 | `lib/agents/usineDepot.ts` | « createSignedUploadUrl(`${tacheId}/sortie/${f.nom}`) » → « createSignedUploadUrl(`${tacheId}/${f.nom}`) » | 1 | oui | FAIL UR-6 — signatures de dépôt ["usine/e59cf57f-a62a-463a-913d-83c3e37397f3/rapport-qa.json","usine/e59cf57f-a62a-463a-913d-83c3e37397f3/site/images/photo.webp","usine/e59cf57f-a62a-463a-913d-83c3e37397f3/site/index.ht… |
| UR-6 | `lib/agents/usineDepot.ts` | « depots.push({ nom: f.nom, url: s.data.signedUrl, jeton: s.data.token … » → « depots.push({ nom: f.nom, url: s.data.signedUrl, jeton: s.data.token,… » | 1 | oui | FAIL UR-6 — dépôt aux clés nom,url,jeton,chemin (nom, url, jeton attendues) ; dépôt aux clés nom,url,jeton,chemin (nom, url, jeton attendues) ; dépôt aux clés nom,url,jeton,chemin (nom, url, jeton attendues) ; dépôt aux… |
| UR-6 | `lib/agents/usineDepot.ts` | « const depots = [] » → « await supabaseAdmin.storage.from(BUCKET).list(`${tacheId}/sortie`) co… » | 1 | oui | FAIL UR-6 — 1 appel(s) au stockage en plus des dépôts (list) |
| UR-7 | `app/api/agents/usine/depot/route.ts` | « if (Buffer.byteLength(brut) > MAX) » → « if (Buffer.byteLength(brut) > 4 * MAX) » | 1 | oui | FAIL UR-7 — depot, corps de 16 Ko et plus : 200 (413 attendu) ; depot, corps de 16 Ko et plus : 3 appel(s) SQL ou stockage (ops_tache_detenue, ops_stockage_octets, upload) — aucun attendu |
| UR-7 | `app/api/agents/usine/entree/route.ts` | « \|\| typeof b.tache !== 'string' \|\| !UUID.test(b.tache)) return erreur(… » → « ) return erreur('tache : un uuid.', 400) » | 1 | oui | FAIL UR-7 — entree, tache qui n'est pas un uuid : 502 (400 attendu) ; entree, tache qui n'est pas un uuid : 1 appel(s) SQL ou stockage (ops_tache_detenue) — aucun attendu ; entree, tache absente : 502 (400 attendu) ; en… |
| UR-7 | `app/api/agents/usine/depot/route.ts` | « if (!Array.isArray(b.fichiers) \|\| !b.fichiers.every(fichierValide)) r… » → «  » | 1 | oui | FAIL UR-7 — depot, fichiers qui n'est pas une liste : 1 appel(s) SQL ou stockage (ops_tache_detenue) — aucun attendu ; depot, octets en texte : 1 appel(s) SQL ou stockage (ops_tache_detenue) — aucun attendu |
| UR-8 | `app/api/agents/usine/depot/route.ts` | « import { depot, type FichierDepot } from '@/lib/agents/usineDepot' » → « import { depot, type FichierDepot } from '@/lib/agents/usineDepot' im… » | 1 | oui | FAIL UR-8 — app/api/agents/usine/depot/route.ts mentionne supabaseAdmin |
| UR-8 | `lib/agents/usineDepot.ts` | « depots.push({ nom: f.nom, url: s.data.signedUrl, jeton: s.data.token … » → « console.error('[usine] dépôt signé', s.data.signedUrl) depots.push({ … » | 1 | oui | FAIL UR-8 — un jeton de signature du stockage est écrit sur la console ; une URL signée est écrite sur la console |
| UR-8 | `lib/agents/usineDepot.ts` | « if (error \|\| !Array.isArray(data)) return INDISPONIBLE » → « if (error \|\| !Array.isArray(data)) return INDISPONIBLE console.log('[… » | 1 | oui | FAIL UR-8 — un nom de fichier d'entrée est écrit sur la console |
| UR-9 | `lib/agents/usineLimites.json` | « "octets_total_max": 41943040 » → « "octets_total_max": 52428800 » | 1 | oui | FAIL UR-9 — livraison.octets_total_max = 52428800 (41943040 attendu) |
| UR-9 | `lib/agents/usineLimites.json` | « "font/woff2", » → « "font/woff2", "font/woff", » | 1 | oui | FAIL UR-9 — livraison.types ≠ contrat (en trop ["font/woff"], manquants []) ; livraison : types absents du bucket de 0110_usine_socle.sql : font/woff |
| UR-9 | `supabase/migrations/0110_usine_socle.sql` | « 'image/svg+xml', 'font/woff2', » → « 'image/svg+xml', » | 1 | oui | FAIL UR-9 — livraison : types absents du bucket de 0110_usine_socle.sql : font/woff2 |
| UR-10 | `lib/agents/usineDepot.ts` | « const LECTURE_S = 900 » → « const LECTURE_S: number = '900' » (une vraie erreur de type : tsc en code 2) | 1 | oui | FAIL UR-10 — npm run typecheck en code 2 : 1 erreur(s), lib/agents/usineDepot.ts(15,7): error TS2322: Type 'string' is not assignable to type 'number'. |
| UR-10 | `app/api/agents/usine/depot/route.ts` | « import { NextResponse } from 'next/server' » → « // @ts-nocheck import { NextResponse } from 'next/server' » | 1 | oui | FAIL UR-10 — app/api/agents/usine/depot/route.ts porte @ts-nocheck ; npm run typecheck non lancé : ces fichiers échapperaient à la vérification |
| UR-10 | `lib/agents/usineDepot.ts` | « const L = limitesDe(t.capacite) if (!L) return { status: 403, error: … » → « const L = limitesDe(t.capacite) // @ts-ignore if (!L) return { status… » | 1 | oui | FAIL UR-10 — lib/agents/usineDepot.ts porte @ts-ignore ou @ts-expect-error ; npm run typecheck non lancé : ces fichiers échapperaient à la vérification |
<!-- fin:usine-routes-qa -->
