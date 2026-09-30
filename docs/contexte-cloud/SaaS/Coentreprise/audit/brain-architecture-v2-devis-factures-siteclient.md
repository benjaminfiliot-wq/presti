# Architecture v2 — Devis · Factures · Site client (étapes 7 → 10)

> Cadre : niveau « digne d'Anthropic », adaptabilité hors norme, conformité légale automatique. S'appuie sur [[Besoins-artisans-et-legal-devis-factures]]. Complète l'[[Architecture]] existante (moteur auth/leads/IA/relances déjà livré et en prod : presti-ashen.vercel.app). Deadline **DEVIS = mercredi 19/08**.

## Principe directeur
L'artisan ne doit **jamais** avoir à connaître la loi ni à se battre avec l'outil. Il **décrit** (en langage naturel), Presti **produit** un document **conforme, chiffré, adaptable**, qu'il ajuste puis envoie. L'IA fait le brouillon intelligent ; l'artisan garde la main ; la conformité est garantie par le système.

---

## A. Modèle de données (nouvelles tables Supabase)

### Extension `artisans` (infos légales — remplies une fois, réutilisées partout)
`siret`, `forme_juridique`, `adresse`, `code_postal`, `ville`, `tel`, `logo_url`,
`assurance_nom`, `assurance_adresse`, `assurance_contrat`, `assurance_activites`, `assurance_zone`,
`iban`, `bic`, `mentions_paiement` (délai, pénalités, acompte par défaut),
`tva_regime` ('franchise' | 'reel'), `numero_tva` (si réel),
`compteur_devis` int, `compteur_facture` int (numérotation continue, incrément atomique via RPC).

### `clients` (carnet)
`id, artisan_id, nom, email, tel, adresse, code_postal, ville, siret (si pro), created_at`.

### `devis`
`id, artisan_id, client_id?, numero (DEV-2026-0001), objet, statut ('brouillon'|'envoye'|'accepte'|'refuse'|'expire'),
date_emission, validite_jours (def 90), remise_pct, acompte_pct, conditions, notes,
total_ht, total_tva, total_ttc (dénormalisés pour l'affichage), created_at, updated_at`.

### `devis_lignes`
`id, devis_id, ordre, designation, quantite, unite, prix_unitaire_ht, tva_taux (5.5|10|20), total_ht (calc)`.

### `factures` / `facture_lignes`
Miroir de devis, + `devis_id?` (facture issue d'un devis), `echeance`, `acompte_montant`,
`statut ('brouillon'|'emise'|'payee'|'retard')`, `date_paiement?`. **Numéro FAC-2026-0001 en séquence continue.**

### `postes_types` (bibliothèque d'adaptabilité — le « hors norme »)
`id, metier, designation, unite, prix_ht_min, prix_ht_max, tva_defaut`.
Seed initial par métier (plombier, électricien, maçon, peintre, menuisier, carreleur, chauffagiste, couvreur) → nourrit l'autocomplétion + guide l'IA. S'enrichit avec l'usage (prix réellement utilisés par l'artisan).

> RLS : tout est scoping `artisan_id = auth.uid()` (comme l'existant). Insert public interdit.

---

## B. Moteur d'adaptabilité (le différenciateur)
1. **Contexte métier** injecté dans chaque génération (métier de l'artisan + `postes_types` du métier + ses prix passés).
2. **Génération IA d'un devis depuis une description** : `POST /api/devis/generer` → l'IA renvoie un **JSON structuré** (lignes : designation/quantite/unite/prix_unitaire_ht/tva_taux + hypothèses). Sortie structurée (JSON schema) pour fiabilité.
3. **Défauts intelligents de TVA** : rénovation logement >2 ans → 10 % ; rénovation énergétique → 5,5 % ; sinon 20 %. Modifiable par ligne.
4. **Apprentissage léger** : les prix validés par l'artisan mettent à jour sa bibliothèque perso (fourchettes affinées).
5. **Éditable à 100 %** : tableau de lignes modifiable (ajout/suppression/réordonnancement), recalcul live des totaux.

---

## C. Conformité légale (garantie par le système)
- **Devis** : gabarit PDF intégrant automatiquement TOUTES les mentions (identité+SIRET, validité, désignation/qty/unité/PU HT, TVA par ligne, totaux HT/TTC, conditions paiement, bloc **assurance décennale** depuis le profil, mention **« Devis reçu avant exécution »**, gratuit/payant). L'artisan ne peut pas en oublier.
- **Facture** : **numérotation continue** garantie (RPC atomique — pas de trou/doublon), mentions complètes, **pénalités + indemnité 40 €**, et **mention TVA franchise = CIBS** (`« TVA non applicable, art. L.223 et s. du CIBS »`) à partir du 01/09/2026 (293 B en repli jusqu'au 31/12/2027).
- **E-invoicing ready** : données structurées + PDF/A ; roadmap **Factur-X + PDP** avant l'obligation d'émission micro (**01/09/2027**). Non bloquant V1.

---

## D. Génération PDF
- Lib : **@react-pdf/renderer** (React → PDF, marche en serverless Vercel, contrôle total du gabarit). Alternative écartée : Puppeteer (trop lourd sur Vercel).
- Un gabarit `DevisPDF` + `FacturePDF` partagés (en-tête artisan+logo, bloc client, tableau lignes, totaux, mentions légales, pied assurance).
- Route `GET /api/devis/[id]/pdf` (auth) → stream PDF. Idem factures.

---

## E. Numérotation (RPC atomique)
Fonction SQL `next_numero(artisan_id, type)` : `UPDATE artisans SET compteur_X = compteur_X + 1 RETURNING` dans une transaction → garantit une séquence continue même en cas d'appels concurrents. Format `PREFIX-ANNEE-000N`.

---

## F. Site client (auto-réponse premium — offre Pro)
Élévation de l'actuel `/l/[slug]` : **mini-site public brandé** par artisan (nom, métier, présentation, réassurance, formulaire de demande soigné). Le client pose sa demande → lead créé → **réponse auto IA** (déjà en place) → **artisan notifié** (email Resend + dashboard). Réservé/valorisé dans l'offre **Pro**. Dépend de **Resend vérifié** (domaine) pour la délivrabilité réelle.

---

## G. Découpage & planning
| Étape | Contenu | Cible |
|---|---|---|
| **7 · DEVIS** ⭐ | Tables devis/lignes + champs légaux profil + éditeur (génération IA + tableau éditable + TVA + totaux) + numérotation + **PDF conforme** + envoi/téléchargement | **Mercredi 19/08** |
| **8 · FACTURES** | Tables factures + **devis→facture 1 clic** + numérotation continue + PDF conforme (CIBS) + statut/paiement + relances impayés | Après devis |
| **9 · SITE CLIENT** | Mini-site public premium + notifications fiables (Resend vérifié) + gating offre Pro | Après factures |
| **10 · PAIEMENT (Stripe)** | Abonnements Gratuit/Pro 39/Business 79, gating des features | Après |

### Spéc. DEVIS (étape 7, détaillée)
1. Onglet **« Devis »** dans l'espace (`/devis`), liste des devis + bouton « Nouveau devis ».
2. **Création** : (a) choisir/saisir le client, (b) **décrire le chantier** → « Générer » → l'IA remplit les lignes ; ou partir d'un tableau vide.
3. **Éditeur** : tableau lignes (designation, qté, unité, PU HT, TVA%) éditable + ajout/suppr ; **remise** ; **acompte** ; **validité** ; **conditions** ; totaux live (HT/TVA/TTC).
4. **Profil légal** : à la 1re utilisation, compléter SIRET + assurance (formulaire dédié, réutilisé ensuite).
5. **Aperçu + PDF** conforme ; **Télécharger** / **Envoyer au client** (Resend).
6. **Statuts** : brouillon → envoyé → accepté/refusé/expiré. (Accepté → base de la future facture.)

### Pré-requis technique à ajouter
`@react-pdf/renderer` (PDF), une **RPC de numérotation**, extension de la table `artisans`, tables devis. Migrations SQL versionnées dans `presti/supabase/`.

---

## Décisions & hypothèses (à valider par Benj)
- Devis d'abord (deadline), puis factures, puis site client, puis Stripe. ✅ (demandé)
- Modèle IA génération devis : `claude-haiku-4-5` (coût), bascule Opus si qualité insuffisante. À tester.
- PDF via @react-pdf/renderer. 
- Bibliothèque de prix = seed manuel + apprentissage ; prix = **fourchettes indicatives à ajuster** (jamais imposés — l'artisan reste maître de ses prix).
- Factur-X/PDP = roadmap (pas V1).
