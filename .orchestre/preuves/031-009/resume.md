# 031-009 — santé du réseau, révision espacée, contradictions entre notes (02/11/2026)

Source : vidéo metakaihos (`plans/analyse-videos.md:1368-1475`, actions « cerveau_obsidian » l.1427-1428) et prompt de lancement
phase 1.3 point 6. Réseau neuronal consulté d'abord : `regles_pour` (aucune règle propre à la tâche, seulement l'intouchabilité
des comptes réseaux non Presti, sans objet ici). Rien n'a été commité, poussé, construit ni migré ; aucun secret lu ni affiché.

## Fichiers modifiés (6, tous dans le périmètre, dépôt `C:/Users/benja/Documents/cerveau`)

| Fichier | Changement |
|---|---|
| `src/sante.mjs` | « à revoir » lit `reconfirme_le` ; fonctions `blocHot` / `poserBlocHot` ; ligne « À revoir : N dues… » |
| `scripts/sante-dans-hot.mjs` | NOUVEAU : recopie la santé dans le bloc balisé de `wiki/hot.md` (`--a-blanc`, idempotent, écriture atomique) |
| `scripts/test-sante.mjs` | 57 vérifications (de 18 à 57) |
| `scripts/contradictions.mjs` | passe 2 vault × vault, `--sortie=`, rapport avec l'origine de chaque côté |
| `scripts/test-contradictions.mjs` | 28 vérifications (de 12 à 28) |
| `wiki/hot.md` (vault) | le seul bloc `<!-- sante-reseau:debut -->…<!-- sante-reseau:fin -->`, posé après l'en-tête YAML |

## 1. Champ `reconfirme_le` (révision espacée)

- La date d'une note « à revoir » est son champ d'en-tête `reconfirme_le: AAAA-MM-JJ` s'il existe, sinon la date du fichier
  (`src/sante.mjs`, fonctions `lireReconfirme` et `dateJour`, boucle « à revoir »). Le champ **prime** : une coquille corrigée
  hier ne vaut pas relecture si `reconfirme_le` dit 100 jours. Seuls les 4 premiers Ko d'un fichier sont lus, et seulement ceux
  des règles et décisions candidates. Un `reconfirme_le` qui n'est pas un vrai jour, ou qui tombe plus d'un jour dans le futur
  (coquille d'année), est ignoré : la note retombe sur la date du fichier au lieu de se cacher de la revue.
- Chaque entrée « à revoir » dit maintenant `date_reference`, `origine` (`reconfirme_le` ou `fichier`) et `reconfirme_le`.
- Preuve fabriquée (`test-sante.mjs`) : règle de 45 j reconfirmée hier → sort de « à revoir » ; sans le champ → y reste ; décision
  reconfirmée il y a 20 j → sort, il y a 61 j → revient ; futur et faux jour → ignorés ; lecture disque : champ simple, entre
  guillemets, BOM + fins Windows, sous `metadata:`, et un `reconfirme_le` **dans le corps** n'est pas l'en-tête.
- Sur le vrai vault, aujourd'hui : **aucune note ne porte encore `reconfirme_le`** (recherche dans `SaaS/**/*.md`), donc 74 notes
  à revoir (règles après 30 j, décisions après 60 j) ; la plus ancienne, `video-production-method`, 124 j. Reconfirmer ou corriger
  est le travail du brief `revoir-notes.md` (Claude Code seul, écriture dans le vault), pas de cette tâche.

## 2. Bloc de `wiki/hot.md` — avant et après

Avant (`hot-avant-30-lignes.txt`) : en-tête YAML (lignes 1-9), ligne vide, `# Contexte récent (à relire en début de session)`.
Après (`hot-apres-50-lignes.txt`) : le bloc s'insère entre la ligne vide et le titre ; extrait :

```
<!-- sante-reseau:debut -->
**Santé du réseau neuronal au 2026-11-02** — recopiée chaque soir par `cerveau/scripts/sante-dans-hot.mjs`, ne pas modifier à la main.

Réseau : 912 notes · 181 rattachées à une carte · 0 îlots · 30 isolées · 74 à revoir

- À revoir : 74 dues (règles après 30 j, décisions après 60 j) · la plus ancienne : video-production-method, 124 j
- Carte - Exploitation, docs et agents — 44 notes · 0 à relier
  … (26 cartes et index, une ligne chacun)
<!-- sante-reseau:fin -->
```

- Preuve que rien d'autre n'a bougé (`hot-controle.txt`) : le fichier privé de son bloc a le même md5 qu'avant
  (`89f19dcb1afb24a0c0d7a39c6606036f`, relevé avant la pose) ; la ligne `Réseau : ` est à la **ligne 15** (brief Hermes : dans
  les 30 premières).
- Idempotent : deuxième lancement le même jour → « hot.md déjà à jour : rien n'est écrit » (`sante-dans-hot-reel.txt`) ;
  lendemain → bloc remplacé, jamais empilé ; balises mal appariées → code 3, fichier intact.
- `--a-blanc` : affiche le bloc, dit « hot.md changerait », n'écrit rien (`sante-dans-hot-a-blanc.txt`).
- Lancé UNE fois pour de vrai sur le vrai `hot.md` (comme la tâche le demande). Le brief
  `plans/011-cadrage-01-11/briefs/sante-reseau.md` (lu, non modifié) est satisfait : code 0, ligne `Réseau : ` en sortie, même
  ligne dans les 30 premières lignes de `hot.md`.

## 3. Contradictions vault contre vault (`scripts/contradictions.mjs`, passe 2)

Chaque ADR **acceptée** (en-tête `status: acceptee`, 6 sur 7 : l'ADR-007 est « proposee » et n'engage personne) est confrontée :
(a) aux sections de `Decisions/Journal-Decisions.md` **datées de son jour ou après** (un journal plus ancien est ce que l'ADR
remplace) ; (b) aux notes du même sujet (BM25, une requête par phrase de l'ADR). Seules les sections qui décident comptent
(Décision, Conséquences, Garde-fous). Chiffres : l'heuristique de la passe 1 ; polarité : les deux sens, avec des négations de
journal en plus (« plus d'envoi », « en pause », « écarté »), et une règle « sans exception » qui n'exige qu'un mot rare commun
face au journal. Le rapport dit, pour chaque côté : source, fichier, section, ligne (`contradictions-reel.json`, champs
`regle` et `contre`, plus `passe`).

**Sortie réelle** (`contradictions-reel.json`, `--sortie=` : le `data/` du cerveau n'a pas été touché), 6 ADR comparées à
68 sections du journal et 92 notes voisines → 17 contradictions « à trancher » vault × vault. Celles de
`Journal-Decisions.md` ligne 18 (« E-mail seul canal automatique, chaîne serveur seule à envoyer : plus d'envoi en cliquant dans
Gmail, Brevo ou n8n ») :

| p | Côté ADR (source : fichier § section, ligne) | Côté journal |
|---|---|---|
| 0,69 | vault : ADR-004 § Décision, **l.91** « Intégration n8n native : node Brevo (contacts + envoi) + Brevo Trigger. » | `Journal-Decisions.md` § 2026-11-01 (soir), **l.18** |
| 0,62 | vault : ADR-001 § Décision, **l.94** « n8n est le moteur de toutes les automatisations, sans exception. » | idem l.18 |
| 0,77 | vault : ADR-005 § Conséquences, l.88 (« La tâche `presti-envoi-prospection` (Gmail) laisse la place à un workflow… ») | idem l.18 |
| 0,62 | ADR-002 § Décision l.72 et § Conséquences l.93 (n8n moteur de toutes les automatisations) | idem l.18 |

La passe 1 est conservée (147 règles des trois mémoires, 7 contradictions) et dit désormais d'où vient chaque règle
(`regle.source` : `memoire`, `memoire-presti`, `memoire-ops`).

Limite connue, à ne pas prendre pour une vérité : la passe signale, elle ne tranche rien (tout est « à trancher »). Faux positifs
vus sur le vrai vault : ADR-004 l.102 (« moins de 9000 e-mails **par mois** ») contre le journal l.27 (« 300 e-mails **par
jour** ») sort en « chiffre » alors que les unités de temps diffèrent ; plusieurs paires ADR × note d'« exécutants »
(ADR-002 contre `Antigravity.md`, `Methode Claude Code x executants.md`) disent la même chose en d'autres mots.

## 4. Tests et mutations (`mutants.txt`)

- `node scripts/test-sante.mjs` : **57 vérifications, 0 en échec** · `node scripts/test-contradictions.mjs` : **28 ✓, OK** ·
  `node scripts/sante-dans-hot.mjs --a-blanc` : code 0 · `node scripts/orchestre.mjs verifier 031-009` : PASS.
- Aucune donnée réelle dans les essais : réseau, vault et index fabriqués (mots inventés : zorvanek, quillon, Brevolx, Gmaxo),
  `hot.md` remplacé par une copie temporaire, dossiers supprimés ensuite. Les essais passent par `CERVEAU_DATA`, `CERVEAU_VAULT`
  et `--hot=`/`--sortie=` : jamais le vrai `data/`, jamais le vrai `hot.md`.
- Mutants (copies à côté des originaux, supprimées après) : **3 témoins verts, 23 mutants rouges, 0 raté** :
  S1 reconfirme_le ignoré · S2 le plus récent gagne · S3 futur accepté · S4 lecture du corps · S5 balises sans refus · S6 bloc avant
  l'en-tête · S7 ligne `Réseau : ` non isolée · S8 bloc empilé · H1 plus d'idempotence · H2 `--a-blanc` écrit · H3 `--date` ignorée ·
  H4 écriture non atomique · H5 code de sortie 3 · C1 passe vault × vault retirée · C2 filtre de date retiré · C3 ADR proposée
  acceptée · C4 Contexte comparé · C5 « 9 000 » lu « 0 » · C6 règle sans exception retirée · C7 négation sans « plus d'… » ·
  C8 un seul sens de polarité · C9 ligne jamais trouvée · C10 voisines jamais lues.

## Risques et points à valider (Benj)

1. **Le bloc fait 28 lignes en tête de `hot.md`**, relu au démarrage de chaque session : 26 cartes et index, dont la majorité avec
   « 0 à relier ». À trancher : garder tout (comme dit la tâche), ou ne garder que « Réseau : », « À revoir : » et les cartes qui
   ont des notes à relier. Le brief de Hermes n'en vérifie que la première ligne.
2. **Premier bloc posé à la main de cette tâche**, daté du 02/11 ; le prochain passage de Hermes (workflow n8n quotidien, à créer
   côté Oracle) le remplacera. Rien n'est déclenché automatiquement aujourd'hui.
3. **`reconfirme_le` n'existe encore dans aucune note** : tant que `revoir-notes.md` n'écrit pas le champ, « à revoir » reste à 74.
   Le champ doit être écrit dans l'en-tête YAML (haut ou sous `metadata:`).
4. `src/sante.mjs` lit désormais jusqu'à ~150 en-têtes sur disque à chaque appel de `sante_reseau` (4 Ko chacun) ; le serveur MCP
   (`src/mcp.mjs`, hors périmètre) l'appelle sans changement.
5. Le seuil de « mot rare » (8 morceaux au moins, 5 % de l'index sinon) et la probabilité 0,62 de la règle « sans exception » sont
   des choix de réglage, pas des mesures. Le vault ne reçoit pas de note d'apprentissage de ma part (écriture dans le vault hors
   périmètre) : à ranger par la tâche de rangement du soir.

Contrôle croisé avec le plan : points 1 (reconfirme_le), 2 (bloc balisé, daté, idempotent, `--a-blanc`), 3 (Journal l.18 face à
ADR-001 et ADR-004, origine de chaque règle) et 4 (tests fabriqués, mutations, un lancement réel) de la tâche : tous faits.
