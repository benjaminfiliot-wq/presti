# PROMPT v13 — Dix publications, dix vidéos, faites avec HyperFrames

> À coller dans Claude Code ouvert sur `C:\Users\benja\Documents\presti`.
> **Objectif** : produire les **dix prochaines publications** (Facebook, LinkedIn, Instagram) et les **dix vidéos** qui vont avec — des vidéos réellement animées, montées avec **HyperFrames**, pas des diaporamas.
> **Protocole habituel** : travail continu, jamais de pause, affichage de ce qui est en cours avec le temps de travail écoulé à chaque étape. Format à chaque bloc : **Vérifié · Produit · Preuve · Journal · Suivant**.
> **Budget IA sur la réserve Presti : 0 €.** Tout le montage est local. La rédaction, c'est toi, dans cette session.

---

## §0. HyperFrames — la seule route qui marche, et pourquoi

**Ne perds pas dix minutes sur le MCP hébergé.** `mcp__HyperFrames_by_HeyGen__compose` et `render_video` sont **désactivés pour les agents CLI/IDE** — c'est écrit dans les instructions du serveur lui-même (« disabled for local CLI/IDE agents »), constaté le 04/09, et ça ne changera pas en cours de sprint. Les outils de lecture (`list_projects`, `get_project`, `get_project_status`, `get_render_status`) restent ouverts, mais ils ne servent à rien ici.

**La route ouverte, c'est les skills locales :**

```
npx skills add heygen-com/hyperframes
```

Elles installent au moins trois commandes :

| Commande | Ce qu'elle fait |
|---|---|
| `/hyperframes` | compose une composition HTML/GSAP autonome |
| `/hyperframes-cli` | `init`, `lint`, `preview`, `render` |
| `/hyperframes-media` | TTS, transcription, détourage de fond |

Documentation : `https://github.com/heygen-com/hyperframes`.

**Ce que ça produit** : des fichiers HTML autonomes, animés à la timeline GSAP, versionnables dans le dépôt, rendus **en local**. C'est exactement le bon format pour nous : la vidéo devient du code relu en revue, rejouable à chaque évolution du produit, et sans abonnement.

**Ordre d'exécution, strict :**

1. `npx skills add heygen-com/hyperframes` — puis `/hyperframes-cli init` sur un dossier `promo-src/hf/`.
2. Compose **une seule** vidéo (la n° 1 ci-dessous) et rends-la. Regarde le fichier.
3. **Seulement si elle tient la barre du §2**, enchaîne les neuf autres.
4. Si l'installation échoue proprement (réseau, registre, version), **dis-le en une ligne** et bascule sur la chaîne qui a déjà fonctionné : `promo-src/film.html` + `scripts/promo-video.mjs` (Playwright → ffmpeg). Ne bricole pas un troisième chemin.

Ce qui reste vrai quelle que soit la route : **le cœur de chaque vidéo est une capture du vrai produit**. Aucune interface n'est redessinée, aucune scène n'est générée par IA. Une interface inventée dans une publicité est une fausse représentation du produit — c'est la même règle que l'anti-fabrication du produit lui-même, et c'est aussi la loi.

---

## §1. Le socle — ce qui prime sur tout ce que je peux écrire ici

Avant d'écrire une seule phrase de publication, relis **deux fichiers**, et considère-les comme la loi :

- `plans/publications-lancement.md` **§0 — Le socle vérifié** : le tableau « ce qu'on a le droit de dire » avec la ligne de code en preuve, et la liste « ce qu'on n'écrit JAMAIS ».
- `plans/accroches-par-metier.md` **« Les neuf phrases interdites »** : les dix pièges vérifiés à l'écran (l'accusé de réception qui part seul, les relances qui ne partent que dans une branche, les huit libellés de prix, la franchise en base à 0 %, le vitrier qui ne ressort pas en urgence…).

Si une phrase que je propose plus bas entre en conflit avec l'un de ces deux fichiers, **ce sont eux qui gagnent** — tu corriges ma phrase et tu notes la correction au journal.

### §1 bis. Une dette à solder d'abord (30 minutes)

`SaaS/Prospection/Guide-Presti-Demarchage.md` (écrit le 09/09 pour Louis-Victor et Gabriel) contient **trois affirmations que ton propre audit contredit**. Elles sont dans les mains de gens qui démarchent en ce moment. Corrige-les avant tout le reste :

| Dans le guide | Ce que le code dit | Correction |
|---|---|---|
| « Sur la formule d'entrée, elle ne peut **rien envoyer sans votre clic** » | L'accusé de réception « Bien reçu » part **seul**, au nom de l'artisan, si le client a laissé un email (`app/api/leads/route.ts:200-210`) | « Aucune **réponse au fond** ne part sans votre clic — seul l'accusé de réception est automatique » |
| « Relances automatiques — toutes formules » | Elles ne sont planifiées que dans la branche où l'assistant a répondu **lui-même** ; le mode par défaut est assisté (`app/api/leads/route.ts:287-307`) | Garder la ligne de la grille publique, mais ajouter : « les relances ne partent que si l'assistant a répondu lui-même » |
| « Aucun prix inventé et **aucun barème imposé** » | Les ordres de grandeur du marché (moyennes France) servent pour ce que l'artisan n'a pas saisi ; huit libellés seulement ont des prix en base (`lib/prix/marche.ts`, `0002_devis.sql:101-133`) | « Ses prix passent devant dès qu'il les saisit ; pour le reste, l'IA part d'ordres de grandeur du marché, jamais d'un prix inventé » |

Puis **préviens Benj** en une ligne au journal, pour qu'il renvoie la version corrigée à Louis-Victor et Gabriel.

---

## §2. La barre à franchir sur les vidéos

Les vidéos précédentes ont été jugées « médiocres ». Le diagnostic était précis, et il ne portait **pas** sur la matière première mais sur le montage. Les cinq défauts, et la règle qui les remplace :

| Défaut constaté | Règle |
|---|---|
| Images identiques à 2 s et à 4 s — des plans figés | **Aucun plan figé au-delà de 0,8 s.** Il y a toujours quelque chose qui bouge : le texte, le cadre, la capture, la lumière. |
| Texte à ~25 % de la largeur, perdu dans du vide | Le texte occupe **70 à 85 % de la largeur utile**. Une idée par écran, **six mots maximum**. |
| Captures de téléphone entier à 15 % de hauteur | **Recadrages de détail** : la bulle du message, la ligne du devis, le total. On zoome sur ce qui compte, on ne montre jamais un téléphone entier posé dans le cadre. |
| Image finale blanche | Dernière image = fond nuit `#0A0C11`, l'aube corail, le mot, l'adresse. **Jamais de blanc.** |
| 943 kbps | **≥ 3 000 kbps**, 30 fps, H.264. |

Et les règles de fond, non négociables :

- **Rythme** : battements de **1,3 à 1,6 s**. Coupes franches, pas de fondus mous. Si un plan dure plus de 2 s, il se passe deux choses dedans.
- **Le son est coupé par défaut** : sous-titres **incrustés**, ≥ 54 px sur 1080 de large, fort contraste. La vidéo se comprend entièrement sans son.
- **Les 3 premières secondes montrent le problème de l'artisan** — pas le produit, pas le logo. Le logo arrive à la fin.
- **Zone sûre** : rien d'important dans les 14 % du haut ni les 20 % du bas en vertical.
- **Captures du vrai produit** (`public/demo/*.webp`, ou fraîchement reprises par `scripts/demo-captures.mjs` sur le compte de démonstration). Vérifie qu'aucune donnée réelle d'artisan ou de prospect n'y figure.
- **Marque** : `#0A0C11` nuit, `#D97757` corail, `#F3EEE6` crème ; Bricolage Grotesque 700 pour les titres, Hanken Grotesk pour le reste ; l'aube en fin de film (`public/marque/`).

### Formats

| Format | Ratio | Durée | Où |
|---|---|---|---|
| Vertical | 1080×1920 | 20-28 s | Reels Facebook, Reels Instagram, Stories |
| Carré haut | 1080×1350 | 20-28 s | Fil Facebook, fil Instagram |
| Paysage | 1920×1080 | 30-45 s | LinkedIn natif |

Le vertical est le montage de référence ; les autres en dérivent par **réagencement**, jamais par letterbox à bandes noires. Une miniature lisible par format.

**Vérification avant livraison, pour chaque vidéo** : extrais les images à 0 s, 2 s, 5 s, 10 s, 15 s et à la fin, et **regarde-les**. Deux images identiques à deux secondes d'écart = plan figé = à refaire. Un texte illisible en petit = à refaire.

---

## §3. Les dix publications

La ligne éditoriale est celle qui a déjà fonctionné sur LinkedIn (« Zéro artisan abonné », « Par défaut, mon IA n'envoie rien ») : **l'honnêteté comme différence**. On ne vend pas en promettant plus que les autres, on vend en étant le seul à dire exactement ce que ça fait et ce que ça ne fait pas. Chaque publication ci-dessous repose sur un mécanisme **réel et vérifiable dans le code** — c'est la colonne « preuve » qui la rend publiable.

| # | Canal | Angle | Le mécanisme réel qui la fonde |
|---|---|---|---|
| 1 | LinkedIn + FB | **« Mon IA chiffre le devis. Puis elle s'arrête. »** Le devis est posé en brouillon, il ne part jamais seul. | `lib/plateformeConfig.ts:50` (`devis_auto: 'brouillon'`), `lib/devisAuto.ts` |
| 2 | LinkedIn | **« Voilà exactement ce que ma base de prix contient : huit libellés. »** La transparence radicale sur ce qui n'est pas fini. | `0002_devis.sql:101-133`, `lib/prix/marche.ts:32` |
| 3 | LinkedIn + FB | **« Ce que le code arrache à mon IA avant qu'elle vous parle. »** Le filtre anti-invention, expliqué. | `lib/ai/antiFabrication.ts:88-125`, branché `lib/ai.ts:451`, `:639` |
| 4 | FB + Instagram | **« Je ne peux pas lire vos conversations. Voilà pourquoi. »** La porte fermée par défaut, la fenêtre d'une heure, la forme jamais le fond. | `app/page.tsx:132-135`, drapeau `supportArtisan`, `scripts/support-e2e` 34/34 |
| 5 | LinkedIn | **« La facture électronique est entrée en vigueur le 1er septembre. Ce que ça change pour vous. »** Utilité pure, zéro vente. | `lib/facturx.ts`, réforme au 2026-09-01 |
| 6 | LinkedIn | **« Mon IA ne comprend pas qu'une vitre cassée, c'est urgent. Je l'ai testée, elle a échoué. »** Le défaut avoué publiquement. | `lib/ai.ts:99-105` — « vitre », « brisé », « effraction » absents de la liste d'urgence |
| 7 | FB + Instagram | **« 29, 59, 99. Et ce que chaque euro achète. »** La structure de prix sans détour. | `lib/plans.ts:56-64` |
| 8 | FB + Instagram | **« Votre site, généré pendant que vous lisez ce post. »** Démonstration produit n° 2. | `app/site/[slug]`, niveaux `siteMax` |
| 9 | FB + Instagram | **« Ce qu'il reste dans le camion. »** L'inventaire et la recherche chez ses fournisseurs. | `lib/inventaire/`, `lib/recherche-fournisseurs.ts`, drapeau `inventaireRecherche` |
| 10 | LinkedIn + FB | **« Le premier. »** À rédiger maintenant, à publier **le jour où le premier artisan s'abonne** — pas avant, et jamais si ça n'arrive pas. | Poste de contrôle, onglet Clients |

**Pour la n° 6, une consigne** : c'est la publication la plus risquée et la plus payante. Elle ne s'excuse pas et ne se termine pas sur « on va corriger ça ». Elle montre le test, le résultat, et ce que ça implique pour un vitrier qui envisagerait Presti aujourd'hui. Si le défaut est corrigé entre-temps, la publication devient « je l'ai testée, elle a échoué, voilà le correctif » — ce qui est encore mieux.

### Ce que tu produis pour chacune des dix

1. **Le texte, deux variantes** — pas trois, deux suffisent et le choix est plus rapide.
2. **La vidéo**, aux formats du canal.
3. **Le premier commentaire** (LinkedIn : le lien y va, jamais dans le corps du post).
4. **Trois réponses type** aux commentaires prévisibles sur cette publication précise.
5. **La ligne de sourçage** : chaque affirmation du texte, et le fichier:ligne qui la prouve. Une affirmation sans preuve ne sort pas.

---

## §4. Les skills — lesquelles, et dans quel ordre

`linkedin-skills` **1.0.33** (11 skills) et `facebook-skills` **1.0.18** (8 skills) sont installées **au niveau utilisateur**. Commence par en lister le contenu réel (`ListSkills` ou l'équivalent) et **écris la liste au journal** — je travaille de mémoire sur ces versions, pas de leur contenu exact.

**Ordre imposé pour chaque texte LinkedIn :**

1. `linkedin-post-writer` — choisis une formule adaptée à un public d'artisans indépendants, pas de dirigeants de scale-up.
2. `linkedin-hook-*` s'il existe une skill de hooks — les 200 premiers caractères décident du « voir plus ».
3. **`linkedin-humanizer --mode audit`, obligatoire**, et tu corriges ce qu'il signale. Note au journal ce qu'il a relevé et ce que tu en as fait, comme tu l'as fait pour les trois premières variantes.

Pour Facebook, même logique avec les skills correspondantes : l'accroche tient dans les **125 premiers caractères**, un seul appel à l'action, le lien en fin de texte.

**Deux réserves que tu as toi-même relevées le 08/09, et qui tiennent toujours :**

- Ces skills sont **écrites en anglais** pour une cible d'artisans français. Elles servent à la **structure** (accroche, rythme, longueur, appel à l'action), jamais au **ton**. Si un texte ressort avec des tournures traduites — « en tant que fondateur, je suis ravi de partager », « voici trois enseignements » — il est mauvais et tu le réécris à la main. Un artisan de 52 ans ferme un post qui sent la traduction.
- Elles tournent **en mode brouillon** tant qu'aucune clé n'est posée (`PUBLORA_API_KEY`, `LINKEDIN_PLATFORM_ID` / `FACEBOOK_PLATFORM_ID`, `APIFY_TOKEN`, `PIXFARO_TOKEN`). C'est ce qu'on veut : **tu ne publies rien**, tu produis les textes et les fichiers, Benj publie.

---

## §5. Cadence, mesure, et ce qu'on ne fait pas

**La cadence** : dix publications sur trois semaines, pas dix en trois jours. Trois par semaine, réparties entre les canaux, jamais deux le même jour sur le même canal. Propose un calendrier daté dans le livrable, en tenant compte du fait que le public vise les créneaux où un artisan regarde son téléphone : tôt le matin (6 h 30 – 7 h 30), la pause de midi, et le soir après 19 h.

**La mesure** : un code d'apport **par canal** (`facebook`, `linkedin`, `instagram`), posé dans le lien de chaque publication — le lien tracké est `prestiapp.fr/a/<code>` (`app/a/[code]/route.ts`). Vérifie **avant la première publication** que les trois codes existent, sont actifs, et que la colonne « canal d'arrivée » de l'onglet Clients du Poste de contrôle se remplit. Une campagne qu'on ne mesure pas, on la refait à l'aveugle.

**Et au journal, à chaque publication** : date, heure exacte, canal, numéro de publication, variante retenue. Sans ça, impossible de savoir ce qui marche.

**Ce qu'on ne fait pas**, quelle que soit la tentation :

- aucun chiffre non sourcé — le seul autorisé reste le **7 ×** de la Harvard Business Review, avec sa source à l'écran ;
- aucun témoignage, aucun avis, aucun logo de client, aucun « ils nous font confiance » — on n'a pas de clients ;
- aucune capture fabriquée, aucune interface redessinée, aucune scène générée par IA ;
- aucune promesse sur WhatsApp, les réseaux sociaux, le SMS, ou le téléphone ;
- aucune remise inventée, aucune liste d'attente, aucun « −50 % à vie ».

---

## §6. Livrables

- `promo-src/hf/` — les compositions HyperFrames, une par publication, versionnées.
- `public/promo/pub-01/` … `pub-10/` — les vidéos aux formats du canal + une miniature chacune.
- `scripts/promo-video.mjs` mis à jour, ou son équivalent HyperFrames, **rejouable d'une seule commande** pour refaire les dix à chaque évolution du produit.
- `plans/publications-10.md` — pour chaque publication : les deux variantes, le premier commentaire, les trois réponses type, le sourçage ligne à ligne, le canal, la date proposée.
- `SaaS/Prospection/Guide-Presti-Demarchage.md` corrigé (§1 bis).
- Les trois codes d'apport vérifiés dans le Poste de contrôle.

---

## §7. Ce que seul Benj peut faire

| # | Action | Pourquoi |
|---|---|---|
| H1 | Choisir la variante retenue pour chacune des dix | C'est sa voix |
| H2 | Publier, et noter l'heure exacte | Aucun connecteur Facebook, LinkedIn ni Instagram n'est installé — tu ne peux pas publier |
| H3 | Trancher la n° 6 (le défaut du vitrier avoué publiquement) | Décision de posture, pas décision technique |
| H4 | Décider si un budget publicitaire est engagé | Change entièrement le format et la cadence |
| H5 | Valider le titulaire OVH de `prestiapp.fr` **avant le 2026-10-01** | Suspension du domaine sinon — et dix publications qui pointent vers un domaine suspendu |

---

**Rappel de méthode** : tu ne t'arrêtes pas entre les blocs, tu affiches en continu ce que tu fais et depuis combien de temps, et tu ne déclares une vidéo terminée qu'après avoir **regardé les images extraites**. Une vidéo qu'on n'a pas regardée n'est pas finie.
