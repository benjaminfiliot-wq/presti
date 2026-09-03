# Inventaire

Ce que l'artisan possède, ce qu'il achète, chez qui, et à quel prix il l'a VU. Le vocabulaire ci-dessous vaut pour le code, l'interface et les tests.

## Language

**Matériau** :
Un article que l'artisan stocke ou achète (fourniture, consommable, outillage), identifié chez lui par son nom et sa référence fabricant.
_Avoid_ : article, produit, item, ligne de stock

**Fournisseur** :
Un vendeur chez qui l'artisan achète, désigné par lui, avec le site où il le consulte. La liste de ses fournisseurs borne toute recherche de prix.
_Avoid_ : grossiste, négoce (c'est un *type* de fournisseur), site, source

**Observation de prix** :
Un prix relevé à un instant donné sur une page précise d'un fournisseur (ou saisi, ou lu sur une facture), horodaté, cité tel quel. Elle appartient à l'artisan qui l'a demandée et n'est jamais partagée.
_Avoid_ : prix scrapé, cotation, tarif public, prix de marché

**Prix d'achat** :
Le prix HT que l'artisan paie réellement chez son fournisseur (négocié, remisé). C'est le seul prix qui sert au chiffrage.
_Avoid_ : prix catalogue, prix public

**Prix vu** :
La dernière observation de prix d'un matériau. Passé 30 jours, elle est « à revérifier » : on la montre, on ne s'y fie plus.
_Avoid_ : prix actuel, prix estimé

**Liste de départ** :
Les fournisseurs vérifiés (`docs/fournisseurs.md`) proposés à l'artisan, insérés uniquement s'il le demande. Ceux qui cachent leurs prix derrière un compte le disent dans leur note d'accès.
_Avoid_ : fournisseurs par défaut, données de démo

**Lieu** :
L'endroit physique où se trouve une quantité d'un matériau (atelier, camion). Le stock n'a de sens que par lieu.
