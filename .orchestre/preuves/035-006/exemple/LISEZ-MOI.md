Exemple. Bâti-Démo : jeu de données fictif (tâche 035-006, brief p5-jeu-donnees-batidemo)

Rien de réel. Chaque nom, adresse, montant et texte libre est fabriqué et commence par « Exemple. ».
Identifiants en 00000000-0000-4000-8000-… ; artisan_id = 00000000-0000-4000-8000-000000000001 sur chaque ligne de chaque table (D3) ; e-mails en @exemple.invalid ; téléphones en 06 39 98 00 0X (tranche réservée à la fiction, préfixe 639 98) ; montants en centimes, entiers.
Rôles des membres : titulaire, associé, administratif, compagnon, invité (avec accents, D4).
Ce dossier ne sert qu'à la démonstration. Il n'a été ni envoyé, ni écrit en base, ni dans n8n.

Fichiers (un par table, forme lue dans supabase/migrations/) :
- membres.json : 5 membres (titulaire, associé, administratif, compagnon, invité) ; migration 0183_organisations.sql.
- demandes.json : 30 demandes (table leads) ; migration 0010_hardening.sql.
- messages.json : 20 messages liés aux demandes ; migration 0010_hardening.sql.
- devis.json : 15 devis ; migration 0002_devis.sql.
- devis_lignes.json : 45 lignes de devis ; migration 0002_devis.sql.
- factures.json : 10 factures, chacune issue d'un devis accepté (DEV-2026-001 à 010) ; migration 0006_factures.sql.
- relances.json : 5 relances de demandes (table relances) ; migration 0010_hardening.sql.
- relances_impayes.json : 2 lignes du journal des relances de factures ; migration 0159_relances_impayes.sql.

Non écrit : factures_lignes (la table existe, migration 0006, mais le brief ne la liste pas parmi les fichiers attendus).

Cas limites (chacun porté par au moins une ligne, dans le champ cas_limite ; identifiant indiqué) :
1. sans_contact : demandes.json, lead …0130 (contact absent).
2. doublon : demandes.json, leads …0102 et …0103 (même client, client02@exemple.invalid).
3. stop : relances.json, relance …0703 (lead …0104, qui a écrit « Stop » : message …0216, entrant) ; la relance planifiée après ce message n'est pas envoyée.
4. litige : demandes.json, lead …0106 (message …0217 : « Je conteste ce montant »).
5. palier_manque : factures.json, facture FAC-2026-007 (…0507) ; le journal relances_impayes …0801 (rang 2 envoyé, rang 1 absent du journal).
6. prix_absent : devis.json, devis DEV-2026-012 (…0312) ; sa ligne devis_lignes …0436 n'a pas de prix_unitaire_ht.
7. escalade : demandes.json, leads …0120, …0121, …0122 (messages …0218 dégât des eaux, …0219 avocat, …0220 sinistre).

Cohérence : chaque facture renvoie à un devis accepté ; chaque relance de demande renvoie à une demande existante ; chaque ligne du journal renvoie à une facture existante.

Contrôle : chaque fichier JSON relu avec JSON.parse (node), 8 fichiers valides ; juge kit-entreprise-qa --donnees : aucun défaut.
