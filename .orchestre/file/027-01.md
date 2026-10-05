---
id: 027-01
type: audit
objectif: Produire docs/refonte/audit/AUDIT.md (pages, défauts reliés à des fichiers, opportunités, priorités mesurées) et les 12 captures bureau et mobile des 6 pages publiques de prestiapp.fr, jusqu'au vert de scripts/refonte-audit-qa.mjs
perimetre: [docs/refonte/audit/**, .orchestre/preuves/027-01/**]
interdit: [app/**, lib/**, supabase/**, scripts/**, public/**, package.json, package-lock.json, proxy.ts, .orchestre/decisions.md, docs/refonte/BRIEF-REFONTE-0510.md]
verifier: node scripts/refonte-audit-qa.mjs
budget: { fichiers: 14, minutes: 45 }
preuve: sortie de verifier dans .orchestre/preuves/027-01/verifier.log, AUDIT.md (4 000 signes au moins) et 12 PNG réels dans docs/refonte/audit/captures/
executant: antigravity
---

# 027-01 — audit de l'existant avant la refonte de Presti

## Contexte
Benj veut refaire complètement le site (« très vieux comparé à nos connaissances ») : meilleure qualité, animations, vraies améliorations, vitrine qui vend d'abord des solutions en démo animée. Le brief complet est `docs/refonte/BRIEF-REFONTE-0510.md` : le lire en premier. Cette fiche ne CHANGE RIEN au site : elle le mesure. Les fiches de construction (027-02 et suivantes) seront écrites à partir de ses chiffres.

## Ce qu'il faut faire
1. Capturer en production, pour chacune des 6 pages publiques `/`, `/faq`, `/contact`, `/connexion`, `/essai-formulaire`, `/outils` (adresse `https://prestiapp.fr<chemin>`), une vue bureau et une vue mobile : `node scripts/capture-url.mjs https://prestiapp.fr/faq docs/refonte/audit/captures/tmp-faq`, puis copier les PNG produits sous les noms exacts `docs/refonte/audit/captures/bureau-<page>.png` et `mobile-<page>.png`, avec `<page>` parmi `accueil` (pour `/`), `faq`, `contact`, `connexion`, `essai-formulaire`, `outils`. Supprimer les fichiers `tmp-*` ensuite. **Regarder chaque capture** : une capture vide ou blanche est un échec.
2. Lire le code de ces pages (`app/page.tsx`, `app/faq/`, `app/contact/`, `app/connexion/`, `app/essai-formulaire/`, `app/outils/`, `app/globals.css`, `app/base.css`, `app/Motion.tsx`, `app/HeroApp.tsx`, `app/DemoSite.tsx`, `app/DemoSequence.tsx`) pour relier chaque défaut à un fichier réel.
3. Écrire `docs/refonte/audit/AUDIT.md` avec exactement ces quatre sections : `## Pages` (une ligne par page : ce qu'elle fait, ce qu'un visiteur comprend en 10 secondes), `## Défauts` (un tableau : défaut, page, fichier du dépôt entre accents graves, par exemple `app/page.tsx:120`, gravité), `## Opportunités` (animations de démonstration qui manquent, formulaire d'entrée, preuves, réassurance) et `## Priorités` (au moins 6 lignes ; **au moins 5 portent une mesure chiffrée** : px, ms, s, %, Ko ou /100, relevée sur la capture ou dans le code, jamais une impression).
4. Au moins 12 références de fichiers distinctes, toutes existantes. Ne jamais écrire un fichier qui n'existe pas.
5. Écrire dans `.orchestre/preuves/027-01/verifier.log` la sortie de `node scripts/refonte-audit-qa.mjs`.

## À ne pas faire
Aucune modification de `app/`, `lib/`, `scripts/`, `public/` ni de la base. Aucune invention de chiffre : ce qu'on ne peut pas mesurer est écrit « non mesuré ». Ne pas reproduire de texte protégé d'un autre site.

## C'est fini quand
- `node scripts/refonte-audit-qa.mjs` rend PASS (10 critères).
- Les 12 captures sont des pages réellement chargées (non vides, toutes différentes).
- Rien n'a bougé hors du périmètre.
