# Stratégie e-commerce adaptée aux nouvelles vidéos (06/10/2026)

**Pour les agents du Chef.** Sources : `sources/ecomsantiagoo-7664657468739374366.analyse.md` (méthode de repérage et de contenu), `sources/restructureai-7690784360898874645.analyse.md` (architecture d'agents et rapport de bénéfice), `decision-methodes.md` (règles des plateformes), `recherches/produits-candidats-0510.md` (catégories et relevé eBay). Décision de Benj : **eBay (compte particulier) + TikTok Brico Travaux (+ TikTok Shop si la boutique est acceptée) ; AliExpress et Alibaba pour repérer ; niche outils et bricolage.** Les agents font le travail ; Benj approuve les achats d'essai.

## Ce que les deux vidéos changent
1. **Partir de la demande, pas du fournisseur.** Un produit est candidat parce que des vidéos récentes du même produit font de grosses vues et que les commentaires demandent où l'acheter ; le fournisseur vient ensuite. (Vidéo 1.)
2. **Un produit à la fois, du contenu en volume.** 5 à 10 vidéos courtes organiques par produit (accroche différente à chaque fois), sans pub payante au départ. (Vidéo 1.)
3. **On refait, on ne copie pas.** Scénario neuf, visuels générés, musique libre : jamais la vidéo d'un autre republiée ni ses scènes recopiées. (Vidéo 1, écartée côté droit d'auteur.)
4. **Le bénéfice, pas le chiffre d'affaires.** Chaque produit a un rapport quotidien : coût d'achat rendu, frais, port, retours, **bénéfice net** ; décision automatique proposée (continuer, augmenter, pause). (Vidéo 2.)
5. **Une file d'approbation courte.** Les agents préparent 30 variantes d'accroches et de scripts ; Benj ne tranche que les achats et les mises en ligne. (Vidéo 2.)
6. **Les retours et les remboursements se préparent seuls**, seuls les cas bloqués arrivent à Benj. (Vidéo 2.)

## La boucle quotidienne (qui fait quoi)
| Étape | Agent / outil | Sortie | Règle de qualité |
|---|---|---|---|
| 1. Repérage de demande | veille (Hermes pour le web, lancé par la supervision) | liste de produits avec 5 vidéos récentes (vues, date, lien) | aucune vue inventée : « à vérifier » |
| 2. Notation | preneur (tâche `tri`) | note sur les 5 critères de `produits-candidats-0510.md` | un produit sans les critères 1 à 5 n'avance pas |
| 3. Contenu | preneur (`redaction_interne`) puis Studio | 3 scripts de 20 s par produit, 30 accroches | pas de promesse mensongère, pas de faux prix barré |
| 4. Annonce eBay | preneur (`redaction_interne`) | titre, description, 5 questions d'acheteurs avec réponses | honnête, délais réels, notice en français |
| 5. Essai | **décision de Benj (un clic)** | lot de 3 à 5 unités, 40 à 60 € | aucun agent n'a accès au paiement |
| 6. Suivi | trésorier | rapport de bénéfice par produit, 7 h 35 avec le bilan du Chef | bénéfice net, pas chiffre d'affaires |
| 7. Retours | SAV | réponses préparées, cas bloqués signalés | ton humain, aucun engagement non tenu |

## Règles de décision (hypothèses à ajuster avec les premières ventes)
- **Arrêt** d'un produit : 14 jours sans intention d'achat mesurable, ou marge nette sous 20 %.
- **Passage à l'échelle** : au moins 3 ventes par semaine avec une marge nette d'au moins 30 %.
- **Jamais** : marque protégée, produit sans marquage CE exigé, promesse non tenue, plus de 150 annonces par mois (limite eBay pour un particulier).

## Ce qui manque aujourd'hui (et qui le règle)
- **Prix réellement vendus** (eBay) et **prix d'achat rendus en Europe** (AliExpress/Alibaba) : API eBay en cours de vérification, jeton Apify absent ; en attendant, relevé des prix demandés par Firecrawl (fait pour 5 catégories).
- **Un agent « demande »** qui lise TikTok chaque jour : à confier à Hermes par la supervision, tant que le preneur n'a pas d'accès web.
- **Rapport de bénéfice** : à écrire dès la première vente.
