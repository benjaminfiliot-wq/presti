---
name: instagram-dm-automatisation
description: "Envoyer des messages privés Instagram en pilotant le navigateur — ça marche, mais le compte se fait freiner vers 6 messages, et voici la seule séquence fiable"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-09T20:50:05.113Z
---

Mesuré le **2026-09-09** en pilotant le vrai Chrome de Benj, depuis `@prestiapp` (6 abonnés,
**0 publication**). Contrairement à la vidéo — voir [[upload-video-reseaux-impossible]] — le **message
privé Instagram passe**. Mais deux choses cassent, et elles ne se devinent pas.

## Le plafond : ~6 messages, puis le champ meurt

Six messages en quinze minutes (trois tapés par Benj, trois par moi) et le composeur est devenu
inerte. La panne se présente en deux temps :

1. d'abord **seuls les caractères accentués entrent** — on tape « Bonjour Laurent » et le champ
   affiche `éçéééééàéÇç` ;
2. puis **plus rien du tout**, et `document.activeElement` n'est jamais le champ, même après un vrai
   clic, même après rechargement de la page.

C'est un blocage doux qui se lève seul en quelques heures. Le déclencheur n'est pas le volume seul :
c'est le volume **depuis un compte sans publication**. Ne pas dépasser trois ou quatre par jour tant
que le compte est vide, et publier avant de démarcher.

## La seule séquence qui envoie vraiment

1. aller sur le profil, puis cliquer « Contacter » **par script** :
   `[...document.querySelectorAll('div[role="button"],button')].find(x=>x.innerText.trim()==='Contacter').click()`
2. attendre l'ouverture du panneau (6 s), puis **un VRAI clic** sur le champ, en bas à droite, autour
   de `(1317, 547)` en cadre 1568×604. **`element.focus()` par script ne suffit pas** : le champ
   reçoit alors les accents et rien d'autre.
3. taper paragraphe par paragraphe, avec **`shift+Return` ×2** entre chaque — un `\n` dans le texte
   tapé enverrait le message en plein milieu ;
4. **relire le champ avant d'envoyer** :
   `document.querySelector('div[contenteditable="true"][role="textbox"]').innerText`
   C'est ce contrôle qui a évité d'envoyer deux messages en charabia à de vrais artisans ;
5. envoyer avec `Return` (le clic sur la flèche marche aussi, la touche est plus sûre).

## Et la vérification qui tranche

`instagram.com/direct/inbox/` — la liste des conversations affiche l'aperçu **complet** de chaque
message envoyé. C'est là qu'on vérifie ce qui est parti et dans quel état, pas dans le composeur
qu'on vient de manipuler. Même règle que pour le Reel Facebook.

## Deux pièges de plus, mesurés le 2026-09-10

**Le début du message se fait avaler.** Taper juste après le clic sur le champ produit un message
**décapité** : les ~85 premiers caractères manquent, le reste est parfait. Ça ne ressemble pas à du
charabia, ça ressemble à un message qui commence au milieu d'une phrase — donc invisible si on ne
relit pas. La parade : après le clic, **vérifier le focus** avant de taper
(`document.activeElement === champ || champ.contains(document.activeElement)`), et si le champ est
déjà sale, `ctrl+a` puis `Delete` et contrôler qu'il est vide. C'est la relecture de l'étape 4 qui a
rattrapé le coup, une deuxième fois.

**Le `type` rend une erreur alors qu'il a réussi.** `CDP sendCommand "Input.dispatchKeyEvent" timed
out after 30000ms — the renderer may be frozen` sur un texte long : le texte est pourtant **entier**
dans le champ. Ne pas retaper sur cette erreur (on doublerait le message) — relire le champ d'abord.

**Les coordonnées de l'outil sont celles du DOM, pas de la capture** : facteur ≈ 1,28 entre les deux
(capture 1568×606 d'une fenêtre ~2005×775). Cliquer aux coordonnées lues sur une capture rate la
cible. Prendre `getBoundingClientRect()`, ou accepter que le (1317, 547) noté plus haut est bien une
coordonnée DOM. Attention aussi : une ligne « Suivi(e) par … » qui s'insère APRÈS la capture décale
les boutons vers le bas — d'où un clic « Contacter » qui ouvre la liste des abonnés.

## ⚠️ Correction du 2026-09-10 : le « plafond de 6 messages » n'est pas démontré

Tout ce qui précède sur le **bridage** est à prendre avec des pincettes. Le 10/09, la signature
exacte du charabia accentué est apparue sur **Facebook dès le premier message** — puis a disparu dès
qu'un clic a réellement atteint le champ. Cause identifiée : le cadre de clic n'est pas celui du DOM
ni celui de la capture (facteur ≈ 0,305 ce jour-là, et il change avec la taille de la fenêtre). Quand
le clic rate, `focus()` par script donne le focus au DOM mais les frappes partent ailleurs : l'ASCII
est avalé par les raccourcis clavier du site, les accents passent quand même.

**Donc `éçéééé…` = un focus raté, pas un compte freiné.** Un vrai blocage rejetterait tout.

Le plafond de ~6 messages/jour vient probablement de la même erreur, un jour où les clics rataient.
**Le remesurer avant de s'y tenir** — voir [[facebook-demarchage-artisans]] pour la méthode de clic.

## 14/09 — envoyer SANS clavier : insertText + Entrée synthétique

Fenêtre Chrome cachée (`document.visibilityState === "hidden"`) : `type` n'écrit rien (ou seulement
les accents), `Tab` ne déplace pas le focus, `execCommand('delete')` n'efface rien, et le bouton
« Envoyer » n'apparaît jamais après une insertion par script. Ce qui marche quand même :

1. profil → « Contacter » cliqué par script ; composeur `div[contenteditable="true"][role="textbox"]` ;
2. `f.focus()` + Range collapsée en fin, puis `document.execCommand('insertText', false, texte)` ;
3. **attendre 2-3 s** avant de relire (`innerText === texte`) — l'éditeur met à jour en différé ;
4. `f.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', code:'Enter', keyCode:13, which:13,
   bubbles:true, cancelable:true}))` → le message part (composeur vide) ;
5. confirmer dans `/direct/inbox/` : le fil apparaît avec « Vous: … ».

Premier envoi réussi ainsi : `kosta.renovation.lr`, 14/09. Un brouillon pollué (accents parasites)
se jette en fermant le panneau par la croix et en rechargeant le profil — il ne persiste pas.
Même recette côté Facebook pour les commentaires de Page (voir [[facebook-demarchage-artisans]]).

**Sauts de ligne (14/09)** : `execCommand('insertText')` avec des `\n` les **avale** (message collé :
« …prestiapp.fr/06 30 78 16 47 »). Recette qui donne de vrais paragraphes : insérer **paragraphe par
paragraphe**, et entre deux, dispatcher un **Maj+Entrée synthétique**
(`new KeyboardEvent('keydown', {key:'Enter', code:'Enter', keyCode:13, which:13, shiftKey:true, bubbles:true, cancelable:true})`)
après avoir replacé la sélection en fin de contenu. Relire avec `innerText.replace(/\n+/g,'\n')`
et comparer à `paras.join('\n')` — 8 lignes attendues, 8 lignes obtenues. Entrée synthétique **sans**
`shiftKey` envoie.
