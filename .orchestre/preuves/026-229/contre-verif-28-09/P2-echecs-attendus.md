# 026-229 — preuve d'échecs (savoir-socle-qa)

Généré le 2026-09-28T12:16:07.437Z par `node scripts/savoir-socle-qa.mjs --preuve-echecs`.

## Écart noté en tête — relecture à froid de sources.json contre l'inventaire du 27/09

- saas (C:/Users/benja/Documents/SaaS) : 11 dossier(s) de premier niveau, tous couverts (sources, prospects ou exclusions)

- presti (C:/Users/benja/Documents/presti) : 18 dossier(s) de premier niveau, hors contrat (ni sources, ni prospects, ni exclusions) → app, lib, maquettes, mobile, notice-prospection, presti-debug-apk, promo-src, public, publications, sauvegardes, scripts, supabase, videos, _to_delete — hors_liste à l'export, jamais lus (liste fermée) : du code, des médias, des sorties dérivées, pas des documents du savoir. Écart volontaire.

- memoire (C:/Users/benja/.claude/projects/C--Users-benja-Documents-ofm/memory) : fichiers .md à plat, couverts par `memoire:*.md` et `exclusions_memoire` (EXCL de maj.sh).

- ops (C:/Users/benja/Documents/presti-ops) : 5 dossier(s) de premier niveau, tous couverts (sources, prospects ou exclusions)

28/09 : relecture — défaut bloquant corrigé avant la production : `interne` ne va jamais vers un moteur gratuit (`moteurs` de sources.json, SVS-1, sabotage S01).

## (a) Arbre courant du dépôt — attendu : échec, SVS-2 en premier

```
FAIL SVS-1 — interrupteurs.semantique est actif sans depuis/accord
FAIL SVS-2 — scripts/savoir/exporter.mjs absent de la racine jugée (.) — l'export n'est pas encore écrit
FAIL SVS-3 — scripts/savoir/exporter.mjs absent de la racine jugée (.) — l'export n'est pas encore écrit
FAIL SVS-4 — scripts/savoir/exporter.mjs absent de la racine jugée (.) — l'export n'est pas encore écrit
FAIL SVS-5 — scripts/savoir/exporter.mjs absent de la racine jugée (.) — l'export n'est pas encore écrit
FAIL SVS-6 — scripts/savoir/exporter.mjs absent de la racine jugée (.) — l'export n'est pas encore écrit
FAIL SVS-7 — scripts/savoir/envoyer.mjs absent de la racine jugée — l'envoi n'est pas encore écrit
FAIL SVS-8 — scripts/usine/savoir-recevoir.mjs absent de la racine jugée — la réception n'est pas encore écrite
FAIL SVS-9 — lib/savoir/index.ts absent de la racine jugée — l'index n'est pas encore écrit
FAIL SVS-10 — scripts/savoir/indexer.mjs absent de la racine jugée — l'indexeur n'est pas encore écrit
FAIL SVS-11 — scripts/usine/systemd/presti-chef-savoir-recevoir.service absent
  ✗ scripts/usine/systemd/presti-chef-savoir-recevoir.path absent
  ✗ scripts/usine/systemd/presti-chef-savoir-index.service absent
  ✗ scripts/usine/systemd/presti-chef-savoir-index.path absent
PASS SVS-12 — ok
savoir-socle-qa : FAIL — SVS-1, SVS-2, SVS-3, SVS-4, SVS-5, SVS-6, SVS-7, SVS-8, SVS-9, SVS-10, SVS-11
```

Verdict (a) : NON CONFORME — premier échec réel : SVS-1

## (d) SVS-1 seul sur le dépôt — attendu : vert

```
FAIL SVS-1 — interrupteurs.semantique est actif sans depuis/accord
savoir-socle-qa : FAIL — SVS-1
```

## (b) Témoin (scripts/fixtures/026/savoir/socle/temoin/) — attendu : vert

```
PASS SVS-1 — ok
PASS SVS-2 — ok
PASS SVS-3 — ok
PASS SVS-4 — ok
PASS SVS-5 — ok
PASS SVS-6 — ok
PASS SVS-7 — ok
PASS SVS-8 — ok
PASS SVS-9 — ok
FAIL SVS-10 — sémantique éteinte : etat general.semantique "refusee" (attendu "eteinte")
PASS SVS-11 — ok
PASS SVS-12 — ok
savoir-socle-qa : FAIL — SVS-10
```

Copies du contrat du témoin différentes de celles du dépôt : reglages.json.

Verdict (b) : NON CONFORME

## (c) Sabotages (scripts/fixtures/026/savoir/socle/sabotages.json) — attendu : chaque sabotage fait échouer son critère

```
S01 (docs/savoir/sources.json) → attendu SVS-1 SEUL en échec : NON — moteurs.interne : ["codex","ollama_local","claude","freellmapi"] (attendu exactement ["codex","ollama_local","claude"]) (aussi : SVS-10)
S02 (docs/savoir/sources.json) → attendu SVS-1 en échec : pris — moteurs.interne : pas une liste
S03 (scripts/savoir/exporter.mjs) → attendu SVS-2 en échec : pris — fichiers exportés hors de attendu-export.json : general|saas:Brouillons/Hors-Liste-Saas.md|interne ; general|presti:.claude/skills/competence-essai/notes.md|in… (aussi : SVS-3, SVS-5)
S04 (scripts/savoir/exporter.mjs) → attendu SVS-3 en échec : pris — ouvert ou listé alors qu'il ne doit jamais l'être : presti:.env.local (aussi : SVS-5)
S05 (scripts/savoir/exporter.mjs) → attendu SVS-3 en échec : pris — la valeur du faux secret est dans la sortie : general/fichiers/presti/docs/notes-integration.md (aussi : SVS-2)
S06 (scripts/savoir/exporter.mjs) → attendu SVS-3 en échec : pris — MEMORY.md exporté porte encore 2 ligne(s) EXCL (aussi : SVS-2, SVS-5)
S07 (scripts/savoir/exporter.mjs) → attendu SVS-4 en échec : pris — saas:Produit/Piege-Coordonnees.md : texte exporté ≠ texte caviardé attendu — # Fiche contact fournisseur (essai) Pour les commandes de peinture, écrire à [adre… (aussi : SVS-2, SVS-5)
S08 (scripts/savoir/exporter.mjs) → attendu SVS-4 en échec : pris — saas:Recherche/Annuaire-Essai.md : attendu reclassé dans prospects, absent de prospects (aussi : SVS-2, SVS-5)
S09 (scripts/savoir/exporter.mjs) → attendu SVS-4 en échec : pris — le manifeste general nomme un fichier prospects : saas:Legal/Contrat-Associes-Essai.md
S10 (scripts/savoir/exporter.mjs) → attendu SVS-5 en échec : pris — general:saas:Produit/Piege-Coordonnees.md : sha256 du manifeste ≠ sha256 du fichier exporté
S11 (scripts/savoir/exporter.mjs) → attendu SVS-5 en échec : pris — plafond octets_total=1000 dépassé : code 0 (attendu 1) — exporté : general 29, prospects 7 (reclassés 1), hors liste 7, exclus 19 (+2 mémoires), non lus 2, tro…
S12 (scripts/savoir/exporter.mjs) → attendu SVS-6 en échec : pris — export : 1 écriture(s) hors de sortie.part (ex. ecriture C:\Users\benja\Documents\presti\.orchestre\travail\savoir-socle-qa\essais\sabotage-S12\ex…) (aussi : SVS-5)
S13 (scripts/savoir/exporter.mjs) → attendu SVS-6 en échec : pris — --sortie racine-presti : code 0 (attendu 2)
S14 (scripts/savoir/exporter.mjs) → attendu SVS-6 en échec : pris — --a-sec : une sortie a été écrite
S15 (scripts/savoir/envoyer.mjs) → attendu SVS-7 en échec : pris — éteint : « envoi éteint » absent de la sortie
S16 (scripts/savoir/envoyer.mjs) → attendu SVS-7 en échec : pris — allumé, appel 1 : commande distante hors du gabarit fixe : sudo -n true && umask 007 && cat > /srv/presti-savoir/depot/general-20260928T121827Z.tar.part && mv …
S17 (scripts/savoir/envoyer.mjs) → attendu SVS-7 en échec : pris — ssh en échec : code 0 (attendu 5) — envoyé : general-20260928T121832Z, prospects-20260928T121832Z → usine@usine-essai.invalid
S18 (scripts/savoir/envoyer.mjs) → attendu SVS-7 en échec : pris — allumé, appel 1 : archive general : ses noms d'entrées ≠ les fichiers de l'export (4 contre 4) — en trop ["fichiers/pax","fichiers/pax"], manquants ["fichiers/…
S19 (scripts/usine/savoir-recevoir.mjs) → attendu SVS-8 en échec : pris — empreinte ≠ manifeste : code 0 (attendu 1) —
S20 (scripts/usine/savoir-recevoir.mjs) → attendu SVS-8 en échec : pris — .pret en lien symbolique : code 0 (attendu 1) —
S21 (scripts/usine/savoir-recevoir.mjs) → attendu SVS-8 en échec : pris — archive saine B : l’ancien courant (A) n’est pas gardé en precedent
S22 (lib/savoir/index.ts) → attendu SVS-9 en échec : pris — filtre ["public","interne"] sur « Plomberie Essai-Dupont Toiture Essai-Leroy » : 4 résultat(s) d’une autre classe (ex. saas:Prospection/Lot-Essai-2026-09-20.md) (aussi : SVS-10)
S23 (lib/savoir/index.ts) → attendu SVS-9 en échec : pris — decouper : passage 2–30 de 3920 signes (1 200 au plus) (aussi : SVS-10)
S24 (lib/savoir/index.ts) → attendu SVS-9 en échec : pris — construireIndex : l’ordre des documents change l’index (aussi : SVS-10)
S25 (scripts/savoir/indexer.mjs) → attendu SVS-10 en échec : pris — sémantique éteinte : etat general.semantique "refusee" (attendu "eteinte")
S26 (scripts/savoir/indexer.mjs) → attendu SVS-10 en échec : pris — sémantique éteinte : etat general.semantique "refusee" (attendu "eteinte")
S27 (scripts/savoir/indexer.mjs) → attendu SVS-10 en échec : pris — sémantique éteinte : etat general.semantique "refusee" (attendu "eteinte")
S28 (scripts/usine/systemd/presti-chef-savoir-index.service) → attendu SVS-11 en échec : pris — presti-chef-savoir-index.service [Service] IPAddressDeny=(absent) (attendu any)
S29 (scripts/usine/systemd/presti-chef-savoir-recevoir.service) → attendu SVS-11 en échec : pris — presti-chef-savoir-recevoir.service [Service] EnvironmentFile= présent (aucun secret n'y sert)
S30 (scripts/savoir/indexer.mjs) → attendu SVS-11 en échec : pris — scripts/savoir/indexer.mjs cite « child_process »
```

Verdict (c) : NON CONFORME

## Bilan

(a) NON · (b) NON · (c) NON · (d) NON · 278 s

**026-229 : FAIL**
