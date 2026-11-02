# 031-008 — garde de contenu : reprise après le refus du vérificateur (02/11/2026)

Exécutant : claude-code. Périmètre touché : `cerveau/src/garde-contenu.mjs`, `src/prenoms-complement.mjs`, `src/mots-communs.mjs`
(régénéré), `scripts/generer-mots-communs.mjs`, `src/capture-session.mjs`, `scripts/test-garde-noms.mjs`, `scripts/test-capture-session.mjs`.
`src/ecriture.mjs`, `src/prenoms-insee.mjs` et `scripts/test-ecriture.mjs` n'ont pas été modifiés. Ni commit, ni push, ni build, ni typecheck.

## État de départ
`node --check` passait sur les 10 fichiers ; les suites étaient vertes (546, 53, 115). La garde refusée a été reconstruite à l'octet
(51 086 octets, même taille que l'originale ; capture 4 505 octets ; complément de prénoms 4 903 octets) dans le scratchpad
(`…/90d68f92-…/scratchpad/refusee/`). Elle sert de « AVANT » pour les mesures et les mutations.

## Vérification (`node scripts/orchestre.mjs verifier 031-008`)
Voir `verifier.log` (dernier passage, après le passage en `fait/`) : test-garde-noms **904 / 0 échec**, test-capture-session **67 / 0**,
test-ecriture **115 / 0**.

## Défauts du vérificateur, et ce qui les corrige
| Défaut (A-verdict1) | Correctif (`garde-contenu.mjs` sauf mention) |
|---|---|
| ReDoS de l'adresse sans numéro (93 s pour 27 « D'Ab ») | `MOT_VOIE` n'a qu'une lecture (pas d'élision ni d'article suivi d'un blanc en tête de mot) ; nom de voie à 6 mots au plus ; ville sans trait d'union dans le mot, 6 morceaux au plus |
| Autres coûts quadratiques trouvés par le banc | `R_WIKI`/`R_LIEN` sans « [ » dans le texte du lien ; domaine nu qui ne repart pas d'un point ; noms et prénoms composés à 4 moitiés ; clé en minuscules sans départ à chaque tiret ; « arobase … point » à 4 morceaux ; pseudos lus ligne par ligne ; début de titre lu sur 16 signes ; `blanchir` en une passe ; `dansUrl` par dichotomie ; blancs à une seule lecture dans les motifs de mot de passe |
| Remplissage hangûl ou braille devant @ | ils sont RETIRÉS quand ils touchent « @ » (plus changés en blanc) ; les autres ignorables sont retirés avant |
| E-mail espacé d'un seul côté | nouvelle graphie pour tout domaine à extension connue ; la partie locale ne doit pas être un mot courant (« par @studio.ai » cite un compte) |
| SIREN à clé juste dans une fiche d'annuaire | dans une adresse web : refusé si clé de Luhn juste ET annuaire (annuaire-entreprises, recherche-entreprises, Pappers, societe.com, Infogreffe…) ou « siren/siret » dans l'adresse ; tout le chemin de la fiche est masqué (le slug porte le nom) ; ailleurs, un identifiant d'article reste permis |
| Clés hexadécimales, Basic, `fish_api_key=` | « clé hexadécimale » refusée si un mot de clé la précède (sauf mot d'empreinte plus proche : commit, sha, hash…) ; masquée à la capture sauf empreinte annoncée ; `Basic`/`Token` + valeur codée ; affectation en minuscules et camelCase |
| Digicodes, « mot de passe, c'est », « pass: » | `CODE_PORTE` (digicode, code de la porte, du portail, PIN, alarme…) ; virgule permise avant la liaison ; « pass: » à lettres et chiffres mêlés |
| Faux positifs « Merci Jean », « ### B. Objectifs », « un ange gardien », « commit 0612…abcdef », « 1 quai de chargement » | `FORMULES` (merci, bonjour, coucou…) jamais un nom ; initiale de titre ou de mot de structure (Lot, Phase…) ignorée ; prénom en minuscules après un déterminant ignoré ; téléphone à frontière de mot (sauf collé à « tel ») ; voie qui est aussi un nom commun + mots courants en minuscules sans code postal : pas une adresse |
| Mots courants perdus à la régénération | le générateur compte aussi les mots à majuscule de début de phrase, s'ils sont écrits au moins une fois en minuscules et ne sont pas des prénoms : 6 198 → 6 309 mots (merci, bonjour y reviennent) ; aucun des 25 jetons de l'audit |
| Markdown cassé autour d'un masque | une étendue vue à l'affichage qui traverse une marque prend les marques qui l'ouvrent et la ferment (« **Jean** Dupont » → « [nom masqué] ») ; un lien Markdown s'affiche par son seul texte |
| Formats de noms : « ZORVANEK, Kevin », « KEVIN Zorvanek », « kevin Zorvanek », MR/DR/PR, « Madame zorvanek », « Nom : X », J.P./JP/J-P, « Jean P Dupont », Ait, St-, Ly/Vo | une règle chacun (règles A à E de `nomsDePersonne`) |
| Prénoms absents (Marek, Monika, Jacek, Dmitri, Svetlana, Zoran, Wei, listes du vérificateur) | +308 prénoms écrits de mémoire dans `prenoms-complement.mjs` (379 → 687), sans téléchargement |
| Homoglyphes arméniens, petites capitales, cherokee, Ү, ɑ | table étendue, appliquée par une classe bâtie sur ses clés |
| « (+33) » | motif à parenthèses |
| Pseudos @ de prospects | « pseudo de réseau d'un prospect » : refusé et masqué si sa ligne parle de prospect (pas « prospection »), relance, DM/MP, démarchage, message privé, contacté ; gardé s'il est cité comme référence dans les 40 signes qui le précèdent, et pour les comptes Presti (`presti.*`) |
| Coût du masquage de la capture | `capture-session.mjs` borne le message à 50 000 signes (coupés à un blanc) avant de masquer, puis coupe à 1 200 |

## Performance adverse (`test-garde-noms.mjs`)
49 pièges de 10 000 signes (et le piège court de l'audit), chacun lancé dans un fil arrêté au bout de 3 s. Aucun détecteur au-dessus de
50 ms, premierInterdit et masquer sous 100 ms. Banc à la main sur la garde actuelle : pire détecteur 16 ms (scratchpad `banc.mjs`).
Contre la garde refusée, « place D'Ab (audit) », « place D'Ab » et « rue La La » dépassent 3 s ; « crochets [ » prend 262 ms et
« Jean-Jean » 54 ms par détecteur.

## Mesure sur le vault (chemin et type seulement ; `mesure-vault.mjs`)
1 148 notes .md dans `C:/Users/benja/Documents/SaaS`. Refusées AVANT (garde refusée) **28**, APRÈS **29**, soit +1 (0,1 % des notes, sous les 10 %).
- Nouvellement refusée : `inbox/sessions/2026-10-27-22h38-b6e06ae6-avant-compression.md` — pseudo de réseau d'un prospect (ligne 89).
  Vrai positif : la ligne liste les pseudos TikTok de 12 artisans démarchés (donnée de prospect dans le vault).
- Plus refusées : aucune. Type changé : `Prospection/Messages-influenceurs-2026-10-27.md`, nom de personne → pseudo d'un prospect (influenceurs contactés en DM).
- Trois faux positifs vus en route sur le vault ont été corrigés et sont tenus par des tests : « par @studio.ai » (e-mail), « **PASS** : 17/17 » (mot de passe),
  « prospection » dans le titre d'une vidéo citée et « TikTok » pris pour une référence (pseudos).
- Temps de premierInterdit sur tout le vault : 6,9 s avant, 8,7 s après.

## Coût de la capture (`cout-capture.mjs`, temps seulement, vault jetable effacé)
Trois plus grosses transcriptions du PC (4,3 à 4,7 Mo), la capture d'avant la nuit contre la nouvelle : 362 ms contre 514 ms au total,
soit **1,42 fois** (plafond : 2). Collage géant piégé de 240 000 signes : la capture finit en moins de 10 s (test) ; la capture refusée
y est tuée à 30 s sans écrire de note.

## Mutations
- Garde refusée entière (`CERVEAU_GARDE=…/refusee/garde-contenu.mjs`) : **745 passées, 136 en échec, code 1** (dont 5 pièges de performance).
- Capture refusée (`CERVEAU_CAPTURE=…/refusee/capture-session.mjs`) : **59 passées, 8 en échec, code 1** (crochet tué à 30 s par le collage piégé).
- Mutants ciblés, un correctif défait à la fois (`mutations.mjs`, 44 mutants, garde mémoire : arrêt sous 300 Mo libres).
  - Premier essai : arrêté par Claude Code faute de mémoire après 2 mutants, tous deux tués. Question posée, réponse de Benj :
    option 1, avec repli sur l'option 3 si la mémoire libre passe sous 300 Mo.
  - Option 1 relancée : **arrêtée par la garde mémoire** (243 Mo libres) après 4 mutants. ReDoS et noms composés ont été tués.
    Liens « [ » et domaines nus ont survécu : le seuil de 250 ms sur premierInterdit et masquer était trop lâche
    (la garde refusée y mettait de 120 à 260 ms). Le seuil est ramené à **100 ms** ; le pire cas de la garde actuelle est à 38 ms.
  - **Option 3 jouée à la place** (les 10 correctifs de priorité 1 à 3, mémoire libre la plus basse : 327 Mo) :

| mutant (un correctif défait) | verdict | échecs | premiers échecs |
|---|---|---|---|
| ReDoS : mot de voie à double lecture, répétition non bornée | tué | 3 | performance adverse : « place D'Ab (audit) », « place D'Ab » |
| liens : « [ » permis dans le texte du lien | tué | 1 | performance adverse : « crochets [ » |
| adresse web : domaine relu depuis chaque point | tué | 6 | performance adverse : « domaines a.a. », « a- » |
| noms composés non bornés | tué | 1 | performance adverse : « Jean-Jean » |
| remplissage devant @ changé en blanc | tué (rejoué) | 5 | refusé : remplissage devant @, extension rare ; partie locale courante |
| SIREN jamais vu dans une adresse web | tué | 11 | refusé et masqué : SIREN dans annuaire-entreprises |
| fiche d'annuaire : SIREN seul masqué | tué | 7 | masqué : SIREN et nom dans un slug Pappers |
| clé hexadécimale annoncée non vue | tué | 2 | refusé : clé hexadécimale annoncée, clé Fish Audio |
| authentification Basic non vue | tué | 3 | refusé : authentification Basic |
| digicodes non vus | tué | 8 | refusé et masqué : digicode : |

  Le mutant « remplissage » survivait au premier passage : la règle de l'e-mail espacé d'un seul côté rattrapait les cas existants.
  Deux cas que seul le retrait du remplissage attrape ont été ajoutés (extension `.bzh`, partie locale « contact ») ; rejoué seul, il est tué.
  **Non prouvés un par un** : les 34 mutants des priorités 4 et 5 (faux positifs, Markdown, formats de noms, prénoms, pseudos, « (+33) »).
  La mutation globale ci-dessus les couvre (136 échecs), mais pas correctif par correctif.
- Banc de performance sous charge : pendant que la mémoire était basse, un passage a donné 8 échecs (« (+33) » et « tel06 » au-delà
  de 3 s). Le passage suivant, mémoire revenue à 663 Mo, était vert : le même piège prend 2 ms. Le banc peut donc rougir à tort sur
  une machine qui pagine.

## Risques et points à valider
- Prénoms : la liste se complète, la règle n'est pas structurelle (limite écrite dans l'en-tête).
- La masquage de toute suite hexadécimale de 32 signes et plus non annoncée comme empreinte peut masquer un identifiant de capture
  sans danger (perte de lisibilité, pas de fuite).
- Les fichiers du cerveau ne sont toujours pas suivis par git (`??`) : rien n'est commité.
