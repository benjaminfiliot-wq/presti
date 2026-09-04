# Ce que Presti coûte à faire tourner, et quoi surveiller

> Écrit le 04/09/2026, après une panne réelle : le solde de l'API Anthropic s'est vidé en pleine
> journée. Toutes les réponses d'assistant, tous les devis et toutes les recherches ont échoué en
> même temps, et **rien ne le disait** — ni à l'artisan, ni à nous. Le défaut a été trouvé à la
> main, longtemps après, en cherchant pourquoi une recherche ne rendait plus de prix.
>
> Ce document existe pour que cela ne se reproduise pas, et pour qu'on sache à tout moment où part
> l'argent. À relire avant toute décision de prix.

## La règle en une phrase

Une seule clé d'API alimente **tout** : les réponses de l'assistant, le chiffrage des devis, la
recherche chez les fournisseurs. Quand le solde tombe à zéro, le produit entier s'arrête d'un
coup, pour tous les artisans. Ce n'est pas une panne partielle, c'est l'extinction.

## Ce que coûte chaque fonction, mesuré

Chiffres relevés sur des appels réels le 04/09/2026, tarifs Anthropic du moment.

| Fonction | Coût par appel | Ce que l'artisan paie |
|---|---|---|
| Réponse de l'assistant à un client | ~0,005 € | 1 crédit |
| Devis chiffré par l'IA | ~0,01 € | 1 crédit (3 en Expert) |
| Recherche chez les fournisseurs, à froid | 0,17 € Standard · 0,21 € Pro · 0,27 € Expert | 2 crédits (3 en Expert) |
| Recherche servie par le cache | 0 € | gratuit |

Et ce qu'un crédit rapporte, selon la formule :

| Formule | Prix mensuel HT | Crédits | Valeur d'un crédit |
|---|---|---|---|
| Essentiel | 29 € | 80 | 0,363 € |
| Studio | 59 € | 250 | 0,236 € |
| Signature | 99 € | 600 | 0,165 € |

**Conclusion à retenir.** Les conversations et les devis rapportent trente à cinquante fois leur
coût : c'est là qu'est la marge, et elle est confortable. La recherche fournisseurs était la seule
fonction à marge négative, et la seule dont le coût grimpait avec le nombre de clients au lieu de
baisser. Tout ce qui suit existe à cause d'elle.

## Les trois protections en place

**1. L'alerte.** `lib/alerteService.ts`. Dès qu'un appel d'IA échoue pour une raison de compte —
solde épuisé, clé refusée, débit saturé, surcharge — un email part vers l'adresse de l'entreprise,
avec ce qui s'est passé et quoi faire. Une seule alerte par heure et par motif, pour prévenir sans
inonder. Elle est branchée sur les trois chemins qui appellent l'IA : la conversation en flux, la
conversation classique, et le chiffrage automatique d'un devis.

**Si tu reçois cet email, tu as quelques minutes pour recharger avant que des artisans le voient.**

**2. Les plafonds de dépense.** `app/api/inventaire/recherche/route.ts`. Vingt recherches par
heure, trente par jour, deux cents par mois et par artisan. Les plafonds quotidien et mensuel ne
se consomment que lorsqu'un appel payant a réellement lieu : une réponse venue du cache ne compte
pas, sinon on punirait l'artisan de chercher souvent, alors que c'est précisément ce qui remplit le
cache. Ils s'appliquent **aussi aux comptes fondateur**, qui ne consomment aucun crédit : c'est là
que la dérive était invisible, et c'est de là que venait l'essentiel de la dépense.

Sans ces plafonds, un seul artisan pouvait déclencher plusieurs milliers d'euros d'API dans le mois
sur un abonnement à 59 €.

**3. Le cache mutualisé.** Migration 0056, `lib/inventaire/cachePrix.ts`. Un prix public relevé
chez Castorama sert à tous les artisans pendant 72 heures. Le coût est payé une fois, la marge
monte avec le nombre de clients, et l'artisan est servi instantanément au lieu d'attendre
vingt-cinq secondes. Projection : dix artisans font tomber le coût moyen à 0,10 € par recherche,
cinquante à 0,06 €, deux cents à 0,03 €.

Ce qui n'entre **jamais** dans ce cache : les prix négociés, le nom que l'artisan donne à ses
fournisseurs, ses requêtes longues (qui peuvent contenir un nom de client), et les prix venant
d'ailleurs que des trois enseignes vérifiées à la main.

## Quoi surveiller, et à quelle fréquence

**Chaque semaine, deux minutes.** Le solde sur console.anthropic.com. Poser une alerte de
rechargement automatique sur ce compte est le meilleur usage de cinq minutes disponible : c'est la
seule panne qui touche tous les clients à la fois.

**Chaque mois.** La colonne `hits` de la table `recherche_cache` dit combien d'appels payants le
cache a évités. C'est la mesure de ce qu'il rapporte, et le seul moyen de régler la durée de
validité sur des faits plutôt que sur une intuition. Si le taux de réussite reste bas avec
plusieurs artisans actifs, la durée de 72 heures mérite d'être rediscutée.

**Avant d'ajouter une fonction qui appelle l'IA.** Se demander ce qu'elle coûte par appel et ce
qu'elle rapporte. La recherche fournisseurs a été construite sans que ce calcul soit fait, et il a
fallu une panne pour s'en apercevoir.

## Ce qui reste fragile

- Les comptes fondateur ne consomment aucun crédit. Leur dépense reste réelle et n'apparaît dans
  aucun compteur. Les plafonds les bornent désormais, mais rien ne mesure ce qu'ils coûtent.
- Les plafonds comptent des **recherches**, pas des tokens. Une recherche particulièrement lourde
  coûte plus qu'une autre sans que rien ne le distingue.
- La moitié de la facture d'une recherche vient des résultats de recherche web eux-mêmes, que le
  cache n'évite que lorsqu'il répond. Une requête jamais posée coûte toujours le prix plein.
