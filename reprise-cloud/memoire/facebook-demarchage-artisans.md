---
name: facebook-demarchage-artisans
description: "Démarcher des artisans sur Facebook — la Page ne peut pas écrire la première, le profil perso oui ; les groupes par métier, et le risque qui pèse sur la Page Presti"
metadata: 
  node_type: memory
  type: project
  originSessionId: 80cc957c-aa60-452a-9898-68b6b198a63a
  modified: 2026-09-10T18:19:27.525Z
---

Mesuré le **2026-09-10** en pilotant le vrai Chrome de Benj, compte **Benjamin Filiot** (vérifié
avant d'agir — voir [[facebook-page-pieges]]).

## La contrainte qui décide de tout

**Une Page Facebook ne peut pas écrire la première.** Elle ne peut que *répondre* à quelqu'un qui l'a
contactée. Le mode opératoire d'Instagram (profil → « Contacter » → message privé) **n'existe pas**
depuis la Page Presti. Ce n'est pas un réglage à trouver.

Restent trois routes : commenter depuis la Page sous les publications d'autres Pages · les groupes ·
le message privé depuis le **profil personnel**.

## Le message privé depuis le profil perso : ça marche

Testé une fois, parti et confirmé « Envoyé ». La séquence :

1. Groupe → onglet **Personnes** → un membre → sa page `/groups/<id>/user/<uid>/`
   (elle montre son **activité récente dans le groupe** : c'est la matière à personnaliser).
2. Cliquer **Message** par script → une mini-fenêtre Messenger s'ouvre en bas à droite.
3. Le composeur est `[role="textbox"][contenteditable="true"]`, repérable par son placeholder `Aa`.
4. **Même parade de focus que sur Instagram** ([[instagram-dm-automatisation]]) : les clics par
   coordonnées ratent leur cible, la séquence `pointerdown → mousedown → focus → pointerup → click`
   plus un `Range` collapsed en fin de contenu donne un vrai focus.
5. Relire le champ, envoyer par `Return`, **vérifier dans `/messages/t/`** — pas dans le composeur.

## Le risque, différent d'Instagram

**Le profil personnel administre la Page Presti.** Un profil épinglé pour spam emporte la Page avec
lui. Sur Instagram le pire est un bridage de quelques heures ; ici c'est l'actif qui saute. Le compte
est neuf, sans historique : c'est le profil type que Facebook restreint le plus vite. Doser.

## Les groupes : la qualité varie énormément

8 groupes rejoints (validation immédiate, ~306 000 membres). Mais le nombre de membres ne dit rien :

- ✅ **Électricien : Dépannage, Travaux, Mise aux normes** (39,8 K) — vrais électriciens français,
  ils parlent parafoudre, NF, budget client. Les artisans sont ceux qui **répondent**, pas ceux qui
  demandent (ceux-là sont souvent des particuliers).
- ❌ **Sous-Traitance de chantiers du bâtiment** (73 K) — rempli d'annonces de ménage en espagnol.
  Le plus gros groupe généraliste est le moins exploitable.
- Les groupes **par métier** (Plâtrier-plaquiste 105 K, Charpente/Couvreur 64 K, Électricien 39 K)
  sont plus gros ET mieux ciblés que les généralistes, et ils se branchent sur
  `presti/plans/accroches-par-metier.md`, qui a une phrase vraie par métier.
- Écarter *Recherche un artisan pour travaux*, *Allo voisins*, *Salle de bain inspirations*,
  *Rénovation Maison* : ce sont des particuliers.

Un post promotionnel dans ces groupes se fait supprimer et le compte bannir — d'autant plus depuis un
profil qui vient d'arriver.

**Un concurrent y est déjà** : « AtelierPilot AI » est membre du groupe Électricien.

## Ce qui n'est pas prouvé

Le taux de réponse. Un seul message envoyé, et sur Instagram on est à **0 réponse sur 12** — voir
[[presti-qui-tient-quel-reseau]]. Le canal s'ouvre ; rien ne dit encore qu'il convertit.

## Le charabia accentué n'est PAS un bridage — c'est un clic qui rate

**Deux diagnostics faux ont été écrits ici avant d'être tranchés le 10/09 au soir.** D'abord « le
compte est bridé », puis « seul le premier message de la session passe ». Les deux sont morts : après
correction, trois messages sont partis d'affilée sans le moindre freinage.

**La vraie cause, en deux morceaux :**

### 1. Les coordonnées de clic sont peu fiables — et un dialogue invisible les avale

`computer left_click` ne se cale ni sur les coordonnées DOM, ni sur celles lues à l'œil sur une
capture, et le rapport change d'une vue Messenger à l'autre. Trois envois ont réussi en tombant juste
par tâtonnement ; une dizaine de tentatives ensuite ont échoué en visant « logiquement ».

**Le piège qui coûte le plus cher** : un **`dialog "Notifications"` resté ouvert** recouvre la page et
intercepte tous les clics, en silence — les clics « tombent » sur des liens de la barre latérale ou
sur `BODY`, et on croit à un champ mort. **Avant toute campagne de clics, vérifier :**

```js
[...document.querySelectorAll('div[role="dialog"]')].map(d => d.getAttribute('aria-label'))
```

et fermer avec `Escape`. Vérifier aussi `document.activeElement` après CHAQUE clic
(`aria-placeholder === 'Aa'` = on est bien dans le composeur) plutôt que de supposer.

**Ce qui marche à coup sûr, quand ça existe** : `find` puis `computer` avec `ref` (a marché pour
« Continuer » et « Envoyer un message »). Le composeur, lui, ne ressort pas dans l'arbre
d'accessibilité — d'où le tâtonnement.

**La leçon de méthode** : au-delà de deux ou trois tentatives infructueuses, livrer les messages
rédigés à coller à la main plutôt que de continuer à traquer le clic. Le travail de valeur est la
recherche du prospect et la phrase juste, pas l'automatisation du collage.

### 2. Quand le clic rate, la frappe se disperse — et ça RESSEMBLE à un bridage

`f.focus()` par script donne le focus **au DOM**, mais les frappes simulées, elles, partent vers
l'élément que le **navigateur** croit actif. Résultat : les lettres ASCII sont avalées par les
raccourcis clavier de Facebook, tandis que les caractères accentués passent quand même par la voie
d'insertion de texte. D'où `éÉ—ééééçééî—ïÇêç` — **le symptôme d'un focus raté, pas d'un compte
freiné**. Un vrai blocage rejetterait tout, accents compris.

⚠️ **Corriger aussi [[instagram-dm-automatisation]]**, qui attribue le même charabia à un bridage
d'Instagram « vers 6 messages ». Ce plafond n'a jamais été démontré ; il vient probablement de la
même erreur de clic. Ne pas s'auto-limiter dessus sans le remesurer.

### 3. La porte « Continuer » du chiffrement

Une conversation **neuve** avec une personne ouvre sur un bouton **« Continuer »** (accepter le
chiffrement de bout en bout) et **aucun composeur n'existe** tant qu'on ne l'a pas cliqué. Passer par
`facebook.com/messages/t/<uid>` (pleine page, grand composeur) plutôt que par la mini-fenêtre du
profil, cliquer « Continuer » s'il est là, puis cliquer le champ pour de vrai.

**Résultat après correction, le 10/09 :** Daniel Bouquerel, Alain Metter et On Off Solutions — trois
messages partis, relus avant envoi, tous confirmés dans `/messages/t/`.

## ⚠️ L'erreur du 10/09 : un message parti chez le mauvais artisan

Les mini-fenêtres Messenger **s'empilent** au fil des profils visités. Le `Tab → Shift+Tab` qui donne
le focus réel peut atterrir sur **une autre fenêtre que celle qu'on vient d'ouvrir**. Un message
destiné à Exo Cet est ainsi parti chez On Off Solutions, qui avait déjà reçu le sien — il a reçu un
texte parlant d'un brassage informatique qu'il n'avait jamais publié.

**Le garde-fou était trop lâche** : je vérifiais `/^Écrire à /` au lieu du **nom complet attendu**.

**Règles :**
- Toujours contrôler `document.activeElement.getAttribute('aria-label') === 'Écrire à <Nom exact>'`
  — le nom, pas le préfixe.
- **Fermer les mini-fenêtres entre deux prospects** (`aria-label` « Fermer la discussion »), ou
  passer par `/messages/t/<uid>` en pleine page où il n'y a qu'un composeur.
- Se rappeler que la touche **Entrée n'envoie pas** dans la mini-fenêtre : cliquer le bouton
  `aria-label="Appuyer sur Entrée pour envoyer"` **de la fenêtre du bon destinataire**.
- `champVide === true` après l'envoi est le seul signal fiable qu'un message est parti.

**Retirer un message envoyé par erreur n'est pas automatisable** : le menu « Autres actions » d'un
message n'apparaît qu'au survol réel. À faire à la main (survoler le message → … → Retirer).

## Mesures du 14/09 — trois faits qui décident

**1. Page → Page est fermé aussi.** En agissant *en tant que Presti* (bascule de profil), la Page d'un
artisan n'offre que « Suivre » et « Rechercher dans cette Page » — le bouton « Message » n'existe
qu'en tant que personne. Et en voix Page, `/messages` redirige vers la boîte Meta Business Suite de
la Page (`business.facebook.com/latest/inbox`), vide. Donc **aucun DM ne peut partir d'une Page**,
ni vers une personne, ni vers une Page. La seule action qu'une Page initie : **commenter**.
Décision Benj (14/09) : 20 commentaires depuis la Page plutôt que des DM.

**2. Un DM depuis un profil non-ami est six fois sur neuf invisible.** Quatre jours après les 9
envois du 10/09 : 1 réponse (Richard), 2 lus sans suite (Alain, Daniel), et **6 « Message non lu »**.
Attention à la lecture : dans la liste Messenger, « Message non lu : | Vous: … » marque un message
que **le destinataire n'a pas ouvert** (tombé dans ses « Invitations »), pas une réponse non lue.
Le repère fiable pour « ils ont répondu » : l'aperçu du fil ne commence pas par « Vous: ».

**3. Fenêtre Chrome cachée = clavier mort, script vivant.** Symptôme trompeur : `javascript_exec`
répond normalement, mais `type` n'écrit rien, `Tab` laisse `activeElement` sur `BODY`, et
`screenshot`/`zoom` échouent avec « 0 width ». Vérifier AVANT de chercher un bug de focus :
```js
JSON.stringify({v:document.visibilityState, w:innerWidth, h:innerHeight})
```
`hidden` / `0` / `0` → la fenêtre est réduite ou l'onglet n'est pas affiché ; seul Benj peut la
remettre au premier plan. Ne pas tenter de contournement, ils échouent tous.

**Bascule de voix** : menu avatar (`aria-label="Votre profil"`) → bouton « Basculer sur Benjamin
Filiot » / « Presti ». Les fils chiffrés de bout en bout demandent un **code PIN** pour être
restaurés — ne jamais le saisir ; fermer le dialogue et lire la liste par `document.body.innerText`.

## 14/09 — commenter en tant que Presti SANS clavier : la recette qui marche

Premier commentaire posté par la Page (post « Consuel validé » d'Anthony Vercruysse, groupe
Électricien), fenêtre Chrome cachée, zéro frappe réelle :

1. La Page doit être **membre du groupe** (adhésion immédiate sur Électricien et Plâtrier-plaquiste
   le 14/09 — les deux acceptent les Pages) et la voix sur **Presti** (menu avatar → « Basculer sur
   Presti », en cliquant par `dispatchEvent(new MouseEvent('click'))`, jamais par référence).
2. Sur une page de recherche du groupe, chaque carte a un contrôle `aria-label="Laissez un
   commentaire"` : le cliquer par script **navigue vers le permalien du post**
   (`/groups/<slug>/permalink/<id>/`). C'est la façon fiable d'obtenir un permalien — les `href`
   `/posts/` n'existent pas dans le DOM.
3. Sur le permalien : composeur `[contenteditable="true"][role="textbox"]` avec
   `aria-label="Commenter en tant que Presti"` → `focus()` + Range collapsée en fin →
   `document.execCommand('insertText', false, texte)` → relire (`innerText === texte`, en laissant
   2-3 s : l'éditeur met à jour en différé).
4. **Il n'y a pas de bouton d'envoi** : Facebook envoie par Entrée. Une Entrée *synthétique* suffit :
   `f.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true}))`
   (plus keypress/keyup). Vérifier ensuite : composeur vide ET le texte apparaît une fois dans la
   page, précédé de « Presti ».

⚠️ **L'auteur d'une carte de recherche ne se lit pas par le premier lien `/user/`** : c'est souvent
un commentateur (l'uid noté pour « Plafond placo terminé » menait à Ike Zubir, un particulier). Lire
l'auteur sur le permalien (`[data-ad-rendering-role="profile_name"]`), et repérer les posts par leur
texte (`[data-ad-rendering-role="story_message"]`).

Règle de contenu tenue : un commentaire **utile et sans promo** (une vraie question ou un vrai avis),
la signature « Presti » fait le reste. Un post promotionnel dans ces groupes se fait supprimer.
