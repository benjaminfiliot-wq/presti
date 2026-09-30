# Coentreprise d'agents Presti — cerveau connecté

Les agents Presti (Claude Managed Agents) ont une **mémoire persistante** connectée à ce cerveau.
Ce dossier est la **copie lisible** de leur mémoire cloud, rapatriée à chaque `sync-down`.

## Comment ça marche
- 4 pôles : **audit · animation · gestion · mails**. 3 agents chacun (12 au total).
- Chaque pôle a un *memory store* cloud, monté dans le sandbox de l'agent. L'agent **lit**
  sa mémoire avant chaque mission et **écrit ses acquis** dans `journal.md` après — il apprend
  tout seul, entre les sessions (comme l'auto-mémoire de Claude).
- La mémoire est seedée depuis : le socle de connaissances du repo + **des extraits de ce cerveau**
  (`brain-*.md` = [[Architecture]], [[Architecture-v2-Devis-Factures-SiteClient]], [[Audit-Securite-et-corrections]], [[Probleme-devis-voix-artisans]]).

## Contenu par pôle
- `socle-<pôle>.md` — base de connaissances stable du domaine
- `journal.md` — journal d'apprentissage vivant (ce que l'agent a appris, daté)
- `protocole.md` — organigramme + règle mémoire/apprentissage
- `brain-*.md` — extraits du cerveau Presti connectés à l'agent

## Pôles
- [[socle-audit]] · [[journal|Audit/journal]] — sécurité, pentest, conformité
- [[socle-animation]] — motion, accessibilité, direction artistique
- [[socle-gestion]] — santé, données/tunnel, fiabilité
- [[socle-mails]] — délivrabilité, cycle de vie, copy

## Piloter (depuis le repo Presti)
```
node scripts/coentreprise.mjs list                     # état
node scripts/coentreprise.mjs run <clé> "<tâche>"      # lancer un agent (avec sa mémoire)
node scripts/coentreprise.mjs sync-down                # rapatrier la mémoire → ici
```
Clés : auditeur, audit-attaque, audit-conformite, animateur, anim-accessibilite, anim-marque,
gestion, gestion-donnees, gestion-fiabilite, mails, mails-delivrabilite, mails-cycle.

> Économe : agents en Haiku par défaut, connaissance dans la mémoire (pas dans le prompt),
> aucune session lancée automatiquement. Chaque `run` = un vrai sandbox cloud (petit coût).
