# 026-239 — contre-vérification du 29/09

Méthode : la production n'est jamais sabotée en place (d'autres sessions écrivent dans le dépôt) ; chaque sabotage est fait sur une racine jetable (.orchestre/travail/contre-verif-239/), jugée par « savoir-reflexion-qa.mjs --racine=… ». Les empreintes sha256 de la production sont relevées avant et après : elles doivent être égales.

## Empreintes de la production (avant)
- scripts/chef/bilan-donnees.mjs  0ffdc5fa89eaef180bc0d3296ef88ea9e6be2fa47847046a590dee1ba806d6f5
- scripts/chef/bilan.mjs  e701e89965056143a4a86527d5bf180cc60296056940e2ee35766155fe86cc1e
- scripts/usine/systemd/presti-chef-bilan.service  0da54e9f690fcc5fc133ce39866afcf545bd753f91f2e2a19cec296d11c8c0c8
- scripts/usine/systemd/presti-chef-bilan.timer  2749e22c1a7e3de99d5eba1196d7978b56edc24bd24aac83aad9130dd49d4ade

## Base : copie non sabotée, toutes parties
    PASS SVB-1 — ok (14 s)
    PASS SVB-2 — ok (0 s)
    PASS SVB-3 — ok (35 s)
    PASS SVB-4 — ok (0 s)
    PASS SVB-5 — ok (4 s)
    PASS SVB-6 — ok (5 s)
    PASS SVB-7 — ok (0 s)
    PASS SVB-8 — ok (0 s)
    PASS SVB-9 — ok (16 s)
    PASS SVB-10 — ok (0 s)
    savoir-reflexion-qa : PASS — tout vert

## Sabotage s1 — l'heure du bilan décalée d'une minute (SVB-8 doit échouer)
Fichier : scripts/usine/systemd/presti-chef-bilan.timer ; « 07:35:00 » → « 07:36:00 » ; partie jugée : unites
    PASS SVB-2 — ok (1 s)
    PASS SVB-6 — ok (3 s)
    PASS SVB-7 — ok (0 s)
    FAIL SVB-8 — presti-chef-bilan.timer : OnCalendar=*-*-* 07:36:00 Europe/Paris (*-*-* 07:35:00 Europe/Paris attendu) (0 s)
    PASS SVB-10 — ok (0 s)
    savoir-reflexion-qa : FAIL — SVB-8

## Sabotage s2 — le réseau du modèle ouvert (SVB-5 doit échouer)
Fichier : scripts/chef/bilan.mjs ; « network_access=false » → « network_access=true » ; partie jugée : bilan
    PASS SVB-2 — ok (0 s)
    PASS SVB-3 — ok (84 s)
    PASS SVB-4 — ok (0 s)
    FAIL SVB-5 — chaîne « ok » : argv sans « -c sandbox_workspace_write.network_access=false » (le réseau du modèle n'est pas coupé) (2 s)
    PASS SVB-6 — ok (7 s)
    PASS SVB-7 — ok (0 s)
    PASS SVB-10 — ok (0 s)
    savoir-reflexion-qa : FAIL — SVB-5

## Sabotage s3 — le jour civil pris en UTC au lieu de Paris (SVB-1 doit échouer)
Fichier : scripts/chef/bilan-donnees.mjs ; « const jourParis = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date) » → « const jourParis = (date) => date.toISOString().slice(0, 10) » ; partie jugée : donnees
    FAIL SVB-1 — jour 2026-09-28 : « executants » obtenu {"fraicheur":"2026-09-28T22:30:00Z","par_executant":{"claude-code":{"disjonctees":0,"expirees":1,"fail":0,"pass":1,"refusees":0},"codex":{"disjonctees":0,"expirees":0,"f…, attendu {"fraicheur":"2026-09-28T22:30:00Z","par_executant":{"claude-code":{"disjonctees":0,"expirees":1,"fail":0,"pass":1,"refusees":0},"codex":{"disjonctees":0,"expirees":0,"f… (9 s)
    PASS SVB-2 — ok (0 s)
    PASS SVB-6 — ok (3 s)
    PASS SVB-7 — ok (0 s)
    FAIL SVB-9 — savoir lié (le reste des données) : « echecs » obtenu [{"critere":"SVB-3","date":"2026-09-27T22:30:00Z","id":"099-27","source":"verdicts.jsonl:27","verdict":"FAIL"},{"critere":"SVL-10","date":"2026-09-27T21:45:00Z","id":"09…, attendu [{"critere":"SVL-10","date":"2026-09-27T21:45:00Z","id":"099-26","source":"verdicts.jsonl:26","verdict":"FAIL"},{"critere":"SVB-5","date":"2026-09-27T09:00:00Z","id":"09… (58 s)
    PASS SVB-10 — ok (0 s)
    savoir-reflexion-qa : FAIL — SVB-1, SVB-9

## Sabotage s4 — la balise piégée d'un verdict n'est plus neutralisée (SVB-3 doit échouer)
Fichier : scripts/chef/bilan.mjs ; « neutraliser(JSON.stringify(D, null, 2)) » → « JSON.stringify(D, null, 2) » ; partie jugée : bilan
    PASS SVB-2 — ok (0 s)
    FAIL SVB-3 — donnees.md : 1 ouverture(s) et 2 fermeture(s) de <donnees_bilan> (une de chaque : la balise piégée d'un verdict doit être neutralisée) (47 s)
    PASS SVB-4 — ok (0 s)
    PASS SVB-5 — ok (2 s)
    PASS SVB-6 — ok (5 s)
    PASS SVB-7 — ok (0 s)
    PASS SVB-10 — ok (0 s)
    savoir-reflexion-qa : FAIL — SVB-3

## Empreintes de la production (après)
- scripts/chef/bilan-donnees.mjs  0ffdc5fa89eaef180bc0d3296ef88ea9e6be2fa47847046a590dee1ba806d6f5
- scripts/chef/bilan.mjs  e701e89965056143a4a86527d5bf180cc60296056940e2ee35766155fe86cc1e
- scripts/usine/systemd/presti-chef-bilan.service  0da54e9f690fcc5fc133ce39866afcf545bd753f91f2e2a19cec296d11c8c0c8
- scripts/usine/systemd/presti-chef-bilan.timer  2749e22c1a7e3de99d5eba1196d7978b56edc24bd24aac83aad9130dd49d4ade

## Verdict sur le dépôt réel (29/09)
Passage `savoir-reflexion-qa.mjs --partie=donnees,bilan,unites` sur le dépôt : SVB-1 à SVB-8 PASS ; SVB-9 et SVB-10 FAIL, ni l un ni l autre imputable à la production :
- SVB-9 : le juge (installerSavoir) ne copie dans son bac que lib/savoir, lectureFirecrawl.ts, moteurs.ts et ts-loader.mjs ; le vrai scripts/savoir/chercher.mjs (026-233) importe aussi lib/agents/acquisition/lecteurSite.ts (026-020, postérieur au juge) : ERR_MODULE_NOT_FOUND, donc savoir_lie non mesuré (le contrat le veut quand une recherche échoue). Avec lib/agents/acquisition ajouté au bac, chercher.mjs tourne. Correction hors périmètre : scripts/savoir-reflexion-qa.mjs (interdit à cette fiche), un élément de plus dans la liste de installerSavoir.
- SVB-10 : git status, chemins apparus pendant le passage = fichiers d autres sessions (douleurs.mjs, mesure.ts, refuse/026-156.md...).
La copie non sabotée de la production, jugée avec le chercher du témoin, est tout vert (voir Base).
