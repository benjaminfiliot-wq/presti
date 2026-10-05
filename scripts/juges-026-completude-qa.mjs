#!/usr/bin/env node
// scripts/juges-026-completude-qa.mjs — juges des nouveaux outils et du jalon entrant (fiche 026-220, écrit par Claude
// Code AVANT les fiches de production 026-221 à 026-227, d'après la relecture de complétude du 27/09 :
// reprise-cloud/docs/revue-fiches-2026-09-26.md et la décision du 26/09, reprise-cloud/memoire/ecosysteme-presti.md).
//
// Usage :
//   node scripts/juges-026-completude-qa.mjs --partie=<openclaw|cursor|firecrawl|fish|entrant|douleurs|experience>[,…]
//        juge l'implémentation du dépôt (sans --partie : les sept). Sur le dépôt réel, chaque partie exige d'abord ses
//        dépendances PASS (verdicts.jsonl + fait/) : un préalable non livré garde la fiche en attente.
//   node scripts/juges-026-completude-qa.mjs --partie=… --racine=<copie> [--rapport=<fichier.json>]
//        juge une copie (témoin, sabotage, mutations de 026-228) ; les dépendances ne sont pas exigées hors du dépôt.
//        `--rapport` écrit le résultat en JSON (critères, détails, code) : c'est lui que lit --preuve-echecs.
//   node scripts/juges-026-completude-qa.mjs --preuve-echecs
//        la preuve de 026-220 : dépendances de 026-220 PASS ; état d'avant (racine vide) rouge sur la présence de CHAQUE
//        partie ; dépôt réel rouge tant qu'une implémentation manque ; TÉMOIN (scripts/fixtures/026-completude/temoin/,
//        implémentation de référence jamais déployée) vert sur tous les critères des sept parties ; chaque sabotage de la
//        table SABOTAGES rend code 1 avec SON critère rouge dans le rapport JSON ; aucun faux secret dans aucune sortie.
//        Les deux sens se lisent au code de sortie et au rapport JSON des enfants, jamais au texte qu'ils impriment.
//        Écrit .orchestre/preuves/026-220/echecs-attendus.md et rapport-temoin.json.
//   node scripts/juges-026-completude-qa.mjs --contrat[=<partie>]
//        imprime le contrat que les fiches 026-221 à 026-227 doivent tenir (chemin, exports, formes).
//
// Codes : 0 tout est vert ; 1 un critère en échec ; 2 argument inconnu ou --reel (ce juge n'a PAS de partie réelle :
// installation, clés et envois réels relèvent des fiches de production, jamais de --preuve-echecs).
//
// Hors réseau : dans le processus qui juge, fetch, http(s), http2, net, tls, dgram, dns, child_process et les Worker sont
// coupés et comptés, et
// toute lecture de .env*, presti-secrets, ~/.ssh, ~/.claude ou ~/.codex/auth est refusée et comptée : chaque partie
// porte un critère <P>-R « aucun effet hors des doublures ». Les appels externes passent par des doublures injectées
// (deps) qui comptent ; horloge figée au 2026-09-27T10:00:00Z ; personnes fictives, adresses @presti-test.invalid ; les
// faux secrets (préfixe ESSAI-) sont tirés au hasard à chaque passage et cherchés dans chaque résultat. Le lecteur 026-020
// (lib/agents/acquisition/lecteurSite.ts du DÉPÔT) sert de vrai repli à Firecrawl, avec un faux récupérateur.
// Les travaux temporaires vont sous .orchestre/travail/juges-026-completude-qa/ (ignoré par git), effacés à la fin.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'
import dns from 'node:dns'
import crypto from 'node:crypto'
import cp from 'node:child_process'
import http2 from 'node:http2'
import dgram from 'node:dgram'
import wt from 'node:worker_threads'
import { syncBuiltinESMExports } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const NOM = 'juges-026-completude-qa'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const SCRIPT = fileURLToPath(import.meta.url)
const DEPOT = path.resolve(ICI, '..')
const FIX = path.join(ICI, 'fixtures', '026-completude')
const TEMOIN = path.join(FIX, 'temoin')
const TRAVAIL = path.join(DEPOT, '.orchestre', 'travail', NOM)
const PREUVE = path.join(DEPOT, '.orchestre', 'preuves', '026-220')
const HORLOGE = Date.parse('2026-09-27T10:00:00.000Z')
const ISO = (t) => new Date(t).toISOString()

const PARTIES = ['openclaw', 'cursor', 'firecrawl', 'fish', 'entrant', 'douleurs', 'experience']
const FICHIER = {
  openclaw: 'scripts/usine/openclaw/lanceur.mjs',
  cursor: '../orchestre/bin/cursor.mjs',
  firecrawl: 'lib/agents/lectureFirecrawl.ts',
  fish: 'lib/studio/voixFish.ts',
  entrant: 'docs/agents/recette-entrant-2026-09-27.md',
  douleurs: 'scripts/chef/douleurs.mjs',
  experience: 'scripts/chef/lancer-experience.mjs',
}
const FICHE = { openclaw: '026-221', cursor: '026-222', firecrawl: '026-223', fish: '026-224', entrant: '026-225', douleurs: '026-226', experience: '026-227' }
const DEPENDANCES = {
  openclaw: ['026-220', '026-053', '026-194'],
  cursor: ['026-220', '026-107', '026-115'],
  firecrawl: ['026-220', '026-020'],
  fish: ['026-220', '026-158'],
  entrant: ['026-220', '026-065', '026-145', '026-096'],
  douleurs: ['026-220', '026-103', '026-121'],
  experience: ['026-220', '026-226', '026-103'],
}
const DEPENDANCES_220 = ['026-001', '026-020', '026-065']

// Les critères de chaque partie, dans l'ordre : un critère non jugé (implémentation absente ou illisible) est rouge.
const CRITERES = {
  openclaw: [
    ['OC-1', 'lanceur présent et exports du contrat'], ['OC-2', 'image épinglée par empreinte sha256'],
    ['OC-3', 'utilisateur non privilégié'], ['OC-4', 'mode privilégié refusé (capacités, réseau hôte)'],
    ['OC-5', 'système de fichiers limité : lecture seule, volumes nommés, ni coffre ni socket docker'],
    ['OC-6', 'limites CPU, mémoire et processus'], ['OC-7', 'port d\'administration lié à 127.0.0.1'],
    ['OC-8', 'aucun jeton Claude, aucun héritage d\'environnement'], ['OC-9', 'sorties réseau : liste fermée'],
    ['OC-10', 'modèles gratuits seulement, abonnement Claude refusé'], ['OC-11', 'données de prospect ou non classées : Ollama local seulement'],
    ['OC-12', 'chaque refus avant docker et avant connexion'], ['OC-13', 'lancement propre : un seul docker, diagnostic sans valeur'],
    ['OC-R', 'aucun effet hors des doublures du juge'],
  ],
  cursor: [
    ['CU-1', 'adaptateur présent et exports du contrat'], ['CU-2', 'coût nul prouvé avant activation, coût inconnu = inactif'],
    ['CU-3', 'rôle d\'exécutant : aucun verdict d\'argent, sécurité, droits ou cerveau'], ['CU-4', 'périmètre écrit, interdit et chemins normalisés'],
    ['CU-5', 'aucun secret lu'], ['CU-6', 'réseau non prévu et commandes de destruction refusés'],
    ['CU-7', 'reprise : même id, preuve partielle, verrou exclusif, rien d\'écrasé'], ['CU-8', 'journal : consommation inconnue = « non mesuré »'],
    ['CU-R', 'aucun effet hors des doublures du juge'],
  ],
  firecrawl: [
    ['FC-1', 'adaptateur présent et export du contrat'], ['FC-2', 'hôte privé, réseau local ou lien de compte refusés avant tout appel'],
    ['FC-3', 'robots lus avant la requête : interdit ou inconnu annule'], ['FC-4', 'borne de 1 000 crédits, mesure exigée, jamais un solde'],
    ['FC-5', 'provenance : URL, méthode et horodatage ; page sans provenance écartée'], ['FC-6', 'repli vers le lecteur 026-020 (clé absente, 429, panne)'],
    ['FC-7', 'redirection hors du domaine refusée'], ['FC-8', 'aucune donnée personnelle envoyée ; recherche bornée'],
    ['FC-9', 'la clé ne sort jamais'], ['FC-10', 'lecture nominale par Firecrawl, robots avant l\'appel'],
    ['FC-R', 'aucun effet hors des doublures du juge'],
  ],
  fish: [
    ['FA-1', 'garde présente et exports du contrat'], ['FA-2', 'HTTP 200 n\'est pas une licence : commercial sans forfait → ff_siwis'],
    ['FA-3', 'offre gratuite = usage interne, non publiable'], ['FA-4', 'quota inconnu, absent ou épuisé → voix locale'],
    ['FA-5', 'forfait commercial prouvé, daté, sourcé et non expiré'], ['FA-6', 'idempotence par id'],
    ['FA-7', 'crédit réservé, consommé au succès, restitué à l\'échec'], ['FA-8', 'voix clonée : droit distinct exigé'],
    ['FA-9', 'manifeste complet ; la voix locale n\'annonce pas Fish'], ['FA-10', 'la clé ne sort jamais'],
    ['FA-11', 'clé absente ou Fish indisponible → voix locale sans appel'], ['FA-R', 'aucun effet hors des doublures du juge'],
  ],
  entrant: [
    ['EN-1', 'compte rendu présent, journal recette-entrant lisible, dix étapes dans l\'ordre'], ['EN-2', 'personnes fictives : @presti-test.invalid, aucun téléphone'],
    ['EN-3', 'demande explicite : case non précochée, preuve, opposition, doublon et sans-consentement rejetés'],
    ['EN-4', 'accord sur le texte exact : empreinte sha256 inchangée jusqu\'à l\'envoi'], ['EN-5', 'accord valide au moment de l\'envoi'],
    ['EN-6', 'envoi unique par accord ; second accord pour la réponse'], ['EN-7', 'demande non retirée avant l\'envoi'],
    ['EN-8', 'aucun contact froid : froid_ouvert = false, réponses sollicitées seulement'], ['EN-9', 'opposition : arrêt, aucune relance ni second envoi'],
    ['EN-10', 'données de la demande : ni Ollama Cloud ni freellmapi ; juge des faits passé'],
    ['EN-11', 'états honnêtes : « prouvé » adossé à une preuve brute, aucune durée inventée, verdict fondé'], ['EN-12', 'prose conforme au verdict'],
  ],
  douleurs: [
    ['DO-1', 'passe présente et export du contrat'], ['DO-2', 'cadence : mois écoulé, une passe par mois, clé idempotente'],
    ['DO-3', 'chaque douleur sourcée ; nombre ou « non mesuré »'], ['DO-4', 'une anecdote n\'est pas une tendance'],
    ['DO-5', 'source périmée écartée'], ['DO-6', 'mois vide : « rien de mesuré »'],
    ['DO-7', 'trois propositions au plus, coût estimé, garde et validation'], ['DO-8', 'aucune donnée personnelle, extraits anonymisés'],
    ['DO-9', 'le classeur annote, ne crée ni ne décide'], ['DO-R', 'aucun effet hors des doublures du juge'],
  ],
  experience: [
    ['EX-1', 'lanceur présent et exports du contrat'], ['EX-2', 'verrou de la première vente : encaissement confirmé, sourcé et non test (indicateurs explicites)'],
    ['EX-3', 'lancement approuvé par Benj, sinon « proposée »'], ['EX-4', 'cadre complet avant le premier événement'],
    ['EX-5', "froid fermé tant que l'interrupteur envoi_froid n'est pas ouvert (sans date : horloge lointaine, service absent, faux, non booléen, en panne)"], ['EX-6', 'un id = une expérience'], ['EX-7', 'objectif modifié = nouvel accord'],
    ['EX-8', 'mesure absente : « non mesuré », jamais un succès'], ['EX-9', 'bilan séparé, aucun drapeau basculé'],
    ['EX-R', 'aucun effet hors des doublures du juge'],
  ],
}
const PREFIXE = { openclaw: 'OC', cursor: 'CU', firecrawl: 'FC', fish: 'FA', entrant: 'EN', douleurs: 'DO', experience: 'EX' }

// ════════════════════════════════════════════ contrat ═════════════════════════════════════════════════════════════════
const CONTRATS = {
  openclaw: `026-221 — scripts/usine/openclaw/lanceur.mjs (module ESM). Exports :
  configuration() → { nom, image (épinglée « @sha256:<64 hex> »), utilisateur ('uid:gid', jamais root ni 0), lecture_seule: true,
    privilegie: false, capacites: [], volumes: [{ source: <volume NOMMÉ, jamais un chemin de l'hôte>, cible }], tmpfs: [...],
    memoire, cpus, pids, ports: [{ hote: '127.0.0.1', port, conteneur }], reseau: <réseau dédié : ni host, ni bridge, ni none>,
    env: [NOMS des variables transmises au conteneur], sorties: [{ role: 'ollama-local'|'ollama-cloud'|'freellmapi', url }],
    modeles: [{ fournisseur: 'ollama'|'freellmapi', modele, voie: 'ollama-local'|'ollama-cloud'|'freellmapi' }] }
    Chaque modèle déclare SA voie (l'API directe d'Ollama Cloud, https://ollama.com, nomme ses modèles sans suffixe
    « -cloud » : le nom ne dit pas où partent les données). voie 'ollama-local' ⇒ fournisseur 'ollama', nom sans
    « :cloud »/« -cloud » ; voie 'ollama-cloud' ⇒ fournisseur 'ollama' ; voie 'freellmapi' ⇒ fournisseur 'freellmapi' ;
    chaque voie employée a une sortie déclarée du même rôle.
  preparerLancement({ config, env }) → { argv, env, diagnostic? } | { refus: <code>, raison }
    argv = les arguments de « docker », commençant par 'run' : --user, --read-only, --cap-drop=ALL,
    --security-opt=no-new-privileges[:true], --memory, --cpus, --pids-limit, --network <réseau dédié>, -v <volume nommé>:<cible>,
    -p 127.0.0.1:<port>:<port>, -e <NOM> (le nom seul, jamais la valeur), puis l'image ; jamais --privileged, --cap-add,
    --device, --env-file, --pid/--ipc/--userns=host, --mount type=bind, ni le chemin d'un secret ou de docker.sock.
    env = les seules variables transmises (noms ⊆ config.env), lues dans le paramètre env, JAMAIS process.env entier.
    Refus : image non épinglée, modèle hors voies gratuites ou sans voie cohérente, variable ANTHROPIC*/CLAUDE* ou valeur « sk-ant- »,
    utilisateur root, privilégié/capacité/réseau hôte, écriture, montage d'un chemin, limites absentes, port hors
    localhost, sortie hors liste.
  lancer({ config, env, deps: { docker(argv, env), connecter(url), journal(ligne) } }) → un refus arrive AVANT tout appel à
    deps.docker ou deps.connecter ; sinon deps.docker est appelé une fois avec l'argv de preparerLancement ; le journal ne
    porte aucune valeur de variable.
  sortieAutorisee(url) → booléen. Liste fermée : Ollama local (http, hôte interne : host.docker.internal, 127.0.0.1, nom de
    service sans point ou IP privée, port 11434), Ollama Cloud (https://ollama.com), freellmapi (http, hôte interne).
    true SEULEMENT pour une origine (protocole, hôte, port) déclarée dans configuration().sorties : toute autre origine →
    false, même interne (localhost, 127.0.0.1 sur un autre port, IP privée, host.docker.internal:22, nom de service
    non déclaré). Jamais anthropic.com ni claude.ai, jamais 169.254.169.254, jamais un hôte inconnu.
  choisirModele({ donnees: 'prospect'|'publique', disponibles: { 'ollama-local', 'ollama-cloud', freellmapi }, prefere? })
    → { fournisseur, modele, voie } | { refus } ; le résultat est l'un des modèles de configuration().modeles (même
    fournisseur, même nom, même voie) et sa voie est disponible. Données de prospect → voie 'ollama-local' et un modèle
    déclaré de voie 'ollama-local', sinon refus ; jamais Ollama Cloud ni freellmapi, même si prefere les demande (prefere
    est alors ignoré ou refusé). Seule donnees === 'publique' ouvre Ollama Cloud et freellmapi : une classe absente, vide
    ou inconnue (« Prospect », « client »…) est traitée comme un prospect. prefere hors voies gratuites → refus. Rien de
    disponible → refus.
  Clés (FREELLMAPI_CLE, OLLAMA_API_KEY) : lues dans presti-secrets par le câblage de 026-221, passées dans le paramètre env,
    jamais affichées. Ce juge, hors réseau, prouve seulement « jamais affichées » (OC-8, OC-12, OC-13) ; la lecture dans
    presti-secrets se juge dans 026-221 (critère statique sur l'appelant ou --reel propre à la fiche).`,
  cursor: `026-222 — ../orchestre/bin/cursor.mjs (dépôt de l'orchestre, à côté de presti ; module ESM). Exports :
  evaluerVoie({ acces: { cli, mode, constate_le, source } | null, tarif: { cout_par_tache: number|null, source, constate_le } | null,
    temoin: { juge: '026-220', verdict } }) → { active: booléen, etat, raison, cout: number | 'non mesuré' }.
    Active SEULEMENT si accès constaté (sourcé, daté), coût 0 sourcé et daté, témoin 026-220 PASS. Coût inconnu → cout
    'non mesuré' (jamais 0) et inactive.
  accepterTache({ id, perimetre: [globs], interdit?, sensible?: [...] }) → { ok: true } | { ok: false, critere, raison } :
    refus si perimetre vide ou si sensible contient argent, securite, droits ou cerveau.
  controlerAction(tache, { type: 'lire'|'ecrire'|'commande'|'reseau', cible }) → { ok: true } | { ok: false, critere, raison } :
    chemin normalisé AVANT contrôle ; écrire hors perimetre, dans interdit ou hors du dépôt → refus ; lire ou viser .env*,
    presti-secrets, .ssh, .claude → refus ; réseau : hôte EXACT de tache.reseau (égalité, ni sous-chaîne, ni sous-domaine,
    ni sosie « registry.npmjs.org.attaquant… ») sinon refus ; git reset --hard, git
    clean, git stash, git restore, git checkout --, rm -rf, Remove-Item -Recurse, taskkill /IM, pkill -f → refus.
  reprendre({ id, dossier, agent }) → { ok: true, id, partiel } (partiel = le JSON de <dossier>/<id>.partiel.json) |
    { ok: false, critere: 'reprise_concurrente' } : verrou EXCLUSIF, rien d'autre écrit ni écrasé dans le dossier.
  terminerReprise({ id, dossier, agent }) → lève le verrou.
  ligneJournal({ id, statut, fichiers, consommation }) → { id, statut, fichiers, consommation: number | 'non mesuré' }.
  evaluerVoie n'accepte que le témoin du juge 026-220 : un PASS d'un autre juge laisse la voie inactive.
  Clés : l'adaptateur n'en lit aucune ; toute clé éventuelle est lue dans presti-secrets par le câblage de 026-222, jamais
    affichée, et ce câblage se juge dans 026-222 (ce juge, hors réseau, ne prouve que CU-5 : aucun secret lu par l'adaptateur).`,
  firecrawl: `026-223 — lib/agents/lectureFirecrawl.ts. Export lireAvecFirecrawl(demande, deps) :
  demande = { operation: 'lire', url } | { operation: 'chercher', requete }
  deps = { cle: string | null,
    firecrawl(operation: 'scrape'|'search', corps, entetes) → { statut, corps } (API v1 : scrape → { success, data: { markdown,
      metadata: { sourceURL } } } ; search → { success, data: [{ url, title }] }) ; la clé va dans entetes, jamais dans corps,
    robots(url) → texte de robots.txt | null (inconnu),
    repli(url) → le lecteur 026-020 (recupererPoli lié à ses deps : { refus } ou { statut, corps, url_finale, entetes }),
    credits: { plafond (borne ≤ 1 000), consommes: number|null, date, source } — consommes est augmenté après un appel facturé,
    horloge: { maintenant() } }
  lire → { texte, url_finale, methode: 'firecrawl'|'lecteur-026-020', horodatage (ISO de l'horloge), robots: 'autorise', incertain,
    credits: { plafond, consommes, restant_estime, solde_constate: 'non mesuré' } } | { refus: <code> }
  chercher → { resultats: [{ url, titre }], methode, horodatage } | { refus }
  Refus AVANT tout appel (robots compris) : hôte non public, port exotique, identifiants dans l'URL, lien de compte (login,
  connexion, compte, account, signin, admin, mon-espace), donnée personnelle dans l'URL ou la requête. robots interdit ou
  inconnu → refus sans appel ni repli. Clé absente, borne > 1 000, mesure absente ou non datée, quota épuisé, 429, panne,
  réponse sans provenance → repli 026-020 (au plus deux appels Firecrawl). URL finale hors du domaine demandé → refus.
  Clé : deps.cle est lue dans presti-secrets par le câblage de 026-223 (l'appelant), jamais affichée ; ce juge prouve
  « jamais affichée » et « clé absente → aucun appel » (FC-6, FC-9) ; la lecture dans presti-secrets se juge dans 026-223.`,
  fish: `026-224 — lib/studio/voixFish.ts. Exports VOIX_LOCALE = 'ff_siwis' et choisirVoix(demande, deps) :
  demande = { id, usage: 'usage_interne'|'usage_commercial', texte, source_texte, voix?, voix_clonee?, droit_clonage?: { accorde, source, date } }
  deps = { cle, sonder() → { statut }, droits: { forfait, commercial, prouve_le, source, expire_le } | null,
    quota: { solde: number|null, constate_le, source } | null, credits: { reserver(id, n) → booléen, consommer(id), restituer(id) }
      (n = besoin estimé pour le texte, > 0, dans l'unité du solde ; jamais n > quota.solde : un solde positif mais
      inférieur au besoin → voix locale, sans réservation ni synthèse Fish),
    memoire: Map (idempotence par id), synthFish(texte, voix), synthLocal(texte, voix), horloge: { maintenant() } }
  → manifeste { id, fournisseur: 'fish'|'local', voix, droit, publiable, date (ISO de l'horloge), source_texte, … } | { refus }
  Fish seulement si clé, sonde 200, quota constaté (solde, date, source) suffisant, et, pour usage_commercial, forfait
  commercial prouvé, daté, sourcé et non expiré ; usage_interne → publiable: false. Sinon synthLocal(texte, 'ff_siwis'),
  fournisseur 'local', et ni fournisseur, ni voix, ni droit ne nomment Fish. Voix clonée sans droit distinct → refus sans
  synthèse. Un id déjà servi rend le même manifeste sans nouvelle synthèse ni réservation.
  Clé : deps.cle est lue dans presti-secrets par le câblage de 026-224, jamais affichée ; ce juge prouve « jamais affichée »
  et « clé absente → aucun appel » (FA-10, FA-11) ; la lecture dans presti-secrets se juge dans 026-224.`,
  entrant: `026-225 — docs/agents/recette-entrant-2026-09-27.md, avec UN bloc \`\`\`json recette-entrant … \`\`\` :
  { recette, horloge_debut, froid_ouvert: false, verdict: 'démontré'|'pratiquement prêt'|'bloqué', ecarts: [{ ecart, reprise }],
    messages_envoyes (= nombre d'envois « prouvé »), etapes: [les dix étapes dans cet ordre : demande, preparation, accord,
    envoi, reponse, preparation_2, accord_2, envoi_2, opposition, arret ; chacune { etape, etat: 'prouvé'|'simulé'|'bloqué',
    heure: ISO | null, duree_s: secondes depuis l'étape précédente non bloquée | null, … }] }
  demande : { id_demande, type: 'entrante', adresse, consentement: { precoche: false, coche: true }, preuve, opposition: true,
    doublon_rejete: true, sans_consentement_rejete: true, retiree_le: ISO | null }
  preparation(_2) : { destinataire, texte, empreinte = sha256(texte), source, plafond, modele: { fournisseur: 'ollama-local', modele }, juge_faits: 'ok' }
  accord(_2) : { id_accord, destinataire, canal, empreinte, expire_le, portee: 'envoi-unique' }
  envoi(_2) : { id_accord, id_message, destinataire, empreinte, type: 'reponse-sollicitee' }
  reponse : { de } ; opposition : { de, moyen } ; arret : { envois_apres: 0, relances: 0 }
  Une étape « prouvé » cite preuve_fichier : un fichier NON VIDE sous .orchestre/preuves/026-225/ qui contient l'id de l'étape
  (id_message, id_accord ou id_demande ; à défaut son heure) ; ses adresses sont fictives. Une étape bloquée a heure et duree_s nulles ; « démontré » exige tout « prouvé » ; « pratiquement prêt » et « bloqué »
  exigent des écarts avec leur reprise. La prose porte le verdict et, s'il n'est pas « démontré », ne proclame rien :
  ni « est/sont prêt(e)(s) », « prêt(e) à l'emploi », « (mis(e)) en production », « en service », « opérationnel(le)(s) »,
  « fonctionnel(le)(s) », « fonctionne(nt) », « livré(e)(s) », « terminé(e)(s) », « déployé(e)(s) » ; seule une négation qui
  porte sur le mot l'excuse (« n'est pas encore opérationnelle », « non livré »).`,
  douleurs: `026-226 — scripts/chef/douleurs.mjs. Export passeMensuelle({ mois: 'AAAA-MM', sources, magasin: { lire(cle), ecrire(cle, v) }, horloge, classer? }) :
  sources = [{ id, type, date, probleme, nombre: number|null, gravite, extrait, source }]
  classer([{ id, probleme, extrait anonymisé }]) → [{ probleme, confiance }] : une annotation, jamais une douleur ni une priorité.
  → { cle: 'douleurs-AAAA-MM', deja, rapport: { mois, statut: 'mesuré'|'rien de mesuré', douleurs: [{ probleme, sources: [ids],
    nombre: number|'non mesuré', gravite, tendance }], propositions (3 au plus) : [{ titre, preuve: [ids], hypothese,
    cout: { estime: true, … }, dependances, garde, prochain_essai, validation: ['claude-code', …] }], ecartees } } | { refus }
  Mois non écoulé → refus sans écriture ; une deuxième passe du même mois rend deja: true sans écrire ; source hors du mois
  écartée ; une seule source n'est pas une tendance ; aucune adresse ni aucun téléphone dans le rapport ni vers classer.`,
  experience: `026-227 — scripts/chef/lancer-experience.mjs. Exports lancerExperience(demande, deps) et conclureExperience({ id, mesure }, deps) :
  demande = { id, version, source: 'douleurs-AAAA-MM'|'decision-benj', objectif, metrique: { nom, depart }, horizon_jours,
    population, seuil_arret, cout_max_eur, touche: [...], accord_benj?: { id, objectif, date } }
  deps = { ventes() → [{ id, statut: 'encaisse'|'devis'|'en_attente', confirme, test, source }], magasin: { lire, ecrire },
    horloge: { maintenant() }, evenements: { emettre(e) }, drapeaux: { basculer() } (jamais appelé) }
  lancer → { deja, experience: { id, etat: 'proposée'|'en cours'|'approuvée', … } } | { refus } : pas d'encaissement
    (statut 'encaisse') confirmé (confirme === true), sourcé et non test (test === false : un indicateur absent n'est pas
    un non) → refus ; cadre incomplet → refus ; « froid » sans interrupteur envoi_froid ouvert (deps.froid_ouvert() === true) → refus, à toute date ; sans accord de Benj sur l'objectif
    exact → 'proposée' sans événement ; même id → pas de second événement ; objectif modifié → refus.
  conclure → { experience: { etat, conclusion, succes, bilan?: { observation, inference, decision } } } : mesure absente →
    etat 'arrêtée', conclusion 'non mesuré', succes différent de true ; aucun drapeau basculé.`,
}

// ════════════════════════════════════════════ outils ══════════════════════════════════════════════════════════════════
const existe = (p) => { try { fs.statSync(p); return true } catch { return false } }
const lireSi = (p) => { try { return fs.readFileSync(p, 'utf8') } catch { return null } }
const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const sha256 = (t) => crypto.createHash('sha256').update(String(t), 'utf8').digest('hex')
const versSlash = (p) => String(p).replace(/\\/g, '/')
const json = (v) => { try { return JSON.stringify(v) ?? '' } catch { return '' } }
const avecDelai = (p, ms, quoi) => new Promise((ok, ko) => {
  const t = setTimeout(() => ko(new Error(`délai dépassé (${ms} ms) : ${quoi}`)), ms)
  Promise.resolve(p).then((v) => { clearTimeout(t); ok(v) }, (e) => { clearTimeout(t); ko(e) })
})
function nettoyer(d) {
  const r = path.resolve(d)
  if (!r.startsWith(path.resolve(TRAVAIL))) throw new Error(`nettoyage refusé hors de ${TRAVAIL} : ${r}`)
  fs.rmSync(r, { recursive: true, force: true })
}

// Faux secrets : tirés à chaque passage, jamais écrits ; préfixe ESSAI- pour que --preuve-echecs les reconnaisse partout.
const ALEA = crypto.randomBytes(6).toString('hex')
const SECRETS = {
  claude: `${'sk-' + 'ant-'}oat01-ESSAI-${ALEA}`, // assemblé à l'exécution : la garde de commit refuse le préfixe écrit d'un bloc
  firecrawl: `fc-ESSAI-${ALEA}`,
  fish: `fish-ESSAI-${ALEA}`,
  freellmapi: `fl-ESSAI-${ALEA}`,
  ollama: `ol-ESSAI-${ALEA}`,
}
const MOTIF_SECRET = /ESSAI-[0-9a-f]{12}/
const purger = (s) => { let t = String(s ?? ''); for (const v of Object.values(SECRETS)) t = t.split(v).join('[secret]'); return t.replace(/ESSAI-[0-9a-f]{12}/g, 'ESSAI-[secret]') }
const fuites = (v) => { const t = json(v); return Object.entries(SECRETS).filter(([, s]) => t.includes(s)).map(([k]) => k) }
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g
const TELEPHONE = /(?:\+33\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/

// ════════════════════════════════════════════ barrière hors réseau ════════════════════════════════════════════════════
const EFFETS = []
function barrer() {
  const noter = (type, detail) => EFFETS.push({ type, detail: court(purger(detail), 100) })
  const bloque = (type) => function (...a) {
    const x = a[0]
    noter(type, typeof x === 'string' ? x : (x?.hostname || x?.host || x?.href || ''))
    throw new Error(`${NOM} : ${type} coupé par le juge (hors réseau)`)
  }
  globalThis.fetch = async (u) => { noter('fetch', String(u?.url || u)); throw new Error(`${NOM} : réseau coupé par le juge`) }
  http.request = bloque('http.request'); http.get = bloque('http.get')
  https.request = bloque('https.request'); https.get = bloque('https.get')
  net.connect = bloque('net.connect'); net.createConnection = bloque('net.createConnection')
  tls.connect = bloque('tls.connect')
  http2.connect = bloque('http2.connect')
  dgram.createSocket = bloque('dgram.createSocket')
  wt.Worker = bloque('worker_threads.Worker')
  dns.lookup = function (h, o, cb) {
    noter('dns', h)
    const f = typeof o === 'function' ? o : cb
    const e = Object.assign(new Error(`${NOM} : dns coupé par le juge`), { code: 'ENOTFOUND' })
    if (typeof f === 'function') process.nextTick(() => f(e))
  }
  dns.promises.lookup = async (h) => { noter('dns', h); throw Object.assign(new Error(`${NOM} : dns coupé par le juge`), { code: 'ENOTFOUND' }) }
  for (const k of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) cp[k] = bloque(`child_process.${k}`)
  const SECRET_CHEMIN = /(^|[\\/])\.env(\.[\w-]+)?$|presti-secrets|[\\/]\.ssh([\\/]|$)|[\\/]\.claude([\\/]|$)|[\\/]\.codex[\\/]auth/i
  const garde = (orig) => function (p, ...a) {
    let s = null
    if (typeof p === 'string') s = p
    else if (p instanceof URL) { try { s = fileURLToPath(p) } catch { s = String(p) } }
    if (s && SECRET_CHEMIN.test(s)) { noter('lecture-secret', s); throw new Error(`${NOM} : lecture d'un secret refusée par le juge`) }
    return orig.call(this, p, ...a)
  }
  fs.readFileSync = garde(fs.readFileSync); fs.readFile = garde(fs.readFile); fs.openSync = garde(fs.openSync)
  fs.open = garde(fs.open); fs.createReadStream = garde(fs.createReadStream)
  fs.promises.readFile = garde(fs.promises.readFile); fs.promises.open = garde(fs.promises.open)
  syncBuiltinESMExports()
  // Un lanceur qui lirait process.env au lieu du paramètre env emporterait ces faux jetons : les critères les cherchent.
  process.env.CLAUDE_CODE_OAUTH_TOKEN = SECRETS.claude
  process.env.ANTHROPIC_API_KEY = SECRETS.claude
  process.env.FIRECRAWL_API_KEY = SECRETS.firecrawl
  process.env.FISH_AUDIO_API_KEY = SECRETS.fish
}

// ════════════════════════════════════════════ critères ════════════════════════════════════════════════════════════════
function critereur(partie) {
  const resultats = []
  const C = async (id, fn) => {
    const nom = (CRITERES[partie].find(([i]) => i === id) || [id, id])[1]
    const d = []
    try { await avecDelai((async () => fn(d))(), 20_000, id) } catch (e) { d.push(`exception : ${court(e?.message || e, 200)}`) }
    resultats.push({ id, nom, ok: d.length === 0, details: d.map((x) => court(purger(x), 240)) })
  }
  return { resultats, C }
}
const refuse = (r) => !!(r && typeof r === 'object' && (r.refus || r.ok === false))

// ── OpenClaw ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const ALIAS = { '-u': '--user', '-m': '--memory', '-v': '--volume', '-p': '--publish', '-e': '--env', '--net': '--network', '-w': '--workdir', '-l': '--label' }
const AVEC_VALEUR = new Set(['--name', '--user', '--memory', '--cpus', '--pids-limit', '--network', '--tmpfs', '--volume', '--mount', '--publish',
  '--env', '--env-file', '--cap-add', '--cap-drop', '--security-opt', '--pid', '--ipc', '--userns', '--device', '--entrypoint', '--workdir',
  '--label', '--restart', '--log-driver', '--log-opt', '--memory-swap', '--ulimit', '--add-host', '--dns', '--hostname', '--uts', '--cgroupns'])
function analyserArgv(argv) {
  const opts = new Map()
  const bools = new Set()
  let image = null
  const a = argv.map(String)
  let i = a[0] === 'run' ? 1 : 0
  for (; i < a.length; i++) {
    let t = a[i]
    if (!t.startsWith('-')) { image = t; break }
    let v = null
    const eq = t.indexOf('=')
    if (t.startsWith('--') && eq > 0) { v = t.slice(eq + 1); t = t.slice(0, eq) }
    t = ALIAS[t] || t
    if (AVEC_VALEUR.has(t)) {
      if (v === null) v = a[++i]
      if (!opts.has(t)) opts.set(t, [])
      opts.get(t).push(String(v ?? ''))
    } else bools.add(t)
  }
  return { opts, bools, image, get: (k) => opts.get(k) || [], a }
}
const SOURCE_NOMMEE = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/
function sourceVolume(v) {
  const s = String(v)
  const m = s.match(/^([A-Za-z]:[\\/][^:]*)(:|$)/)
  return m ? m[1] : s.split(':')[0]
}
function hoteInterne(h) {
  const x = String(h).toLowerCase()
  if (x === 'host.docker.internal' || x === '127.0.0.1') return true
  if (/^[a-z0-9-]+$/.test(x)) return true
  const m = x.match(/^(\d+)\.(\d+)\.\d+\.\d+$/)
  if (!m) return false
  const [a, b] = [Number(m[1]), Number(m[2])]
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
}
function sortieConforme(s) {
  let u
  try { u = new URL(s?.url) } catch { return false }
  if (u.username || u.password || /anthropic|claude\.(ai|com)/i.test(u.hostname)) return false
  if (s.role === 'ollama-local') return u.protocol === 'http:' && hoteInterne(u.hostname) && u.port === '11434'
  if (s.role === 'ollama-cloud') return u.protocol === 'https:' && u.hostname === 'ollama.com'
  if (s.role === 'freellmapi') return u.protocol === 'http:' && hoteInterne(u.hostname)
  return false
}
const MODELE_CLAUDE = /claude|anthropic|sonnet|opus|haiku/i
const MODELE_CLOUD = /[:-]cloud$/i

async function jugerOpenclaw(mod, C) {
  const cfg = () => structuredClone(mod.configuration())
  const envPropre = () => ({ FREELLMAPI_CLE: SECRETS.freellmapi, OLLAMA_API_KEY: SECRETS.ollama })
  const envSale = () => ({ ...envPropre(), ANTHROPIC_API_KEY: SECRETS.claude, CLAUDE_CODE_OAUTH_TOKEN: SECRETS.claude, DIVERS_JETON: SECRETS.claude, HOME: '/home/agents', PATH: '/usr/bin' })
  const prep = (config, env = envPropre()) => mod.preparerLancement({ config, env })
  const muter = (f) => { const c = cfg(); f(c); return c }
  // Chaque configuration que preparerLancement doit refuser est aussi rejouée par lancer dans OC-12 (aucun docker, aucune
  // connexion, même code de refus) : le registre est rempli AVANT l'appel, même si l'appel lève.
  const aRefuser = []
  const doitRefuser = (d, quoi, config, env) => {
    aRefuser.push({ quoi, config: structuredClone(config), env: env === undefined ? undefined : structuredClone(env) })
    const r = prep(config, env)
    if (!refuse(r)) d.push(`${quoi} : accepté (refus attendu avant lancement)`)
  }
  const nominal = prep(cfg())
  const A = nominal && Array.isArray(nominal.argv) ? analyserArgv(nominal.argv) : null
  const sansArgv = (d) => { if (!A) { d.push(`la configuration du dépôt est refusée ou sans argv : ${court(json(nominal), 120)}`); return true } return false }

  await C('OC-2', (d) => {
    const c = cfg()
    if (!/@sha256:[0-9a-f]{64}$/.test(String(c.image || ''))) d.push(`image non épinglée : ${court(c.image, 80)}`)
    if (sansArgv(d)) return
    if (A.image !== c.image) d.push(`argv : image « ${court(A.image, 60)} » ≠ configuration`)
    doitRefuser(d, 'image « :latest » sans empreinte', muter((x) => { x.image = String(x.image).replace(/@sha256:.*$/, '') + ':latest' }))
  })
  await C('OC-3', (d) => {
    if (sansArgv(d)) return
    const u = A.get('--user').at(-1)
    if (!u || /^(root|0)(:|$)/.test(u)) d.push(`argv : --user absent ou root (« ${u ?? ''} »)`)
    for (const v of ['root', '0', '0:0']) doitRefuser(d, `utilisateur « ${v} »`, muter((x) => { x.utilisateur = v }))
    doitRefuser(d, 'utilisateur absent', muter((x) => { delete x.utilisateur }))
  })
  await C('OC-4', (d) => {
    if (sansArgv(d)) return
    if (A.bools.has('--privileged')) d.push('argv : --privileged')
    if (A.get('--cap-add').length) d.push('argv : --cap-add')
    if (A.get('--device').length) d.push('argv : --device')
    if (!A.get('--cap-drop').some((v) => /^all$/i.test(v))) d.push('argv : --cap-drop=ALL absent')
    if (!A.get('--security-opt').some((v) => /^no-new-privileges(:true|=true)?$/.test(v))) d.push('argv : no-new-privileges absent')
    const reseau = A.get('--network').at(-1)
    if (!reseau || ['host', 'bridge', 'default', 'none'].includes(reseau)) d.push(`argv : réseau « ${reseau ?? 'absent'} » (réseau dédié attendu)`)
    for (const k of ['--pid', '--ipc', '--userns', '--uts', '--cgroupns']) if (A.get(k).includes('host')) d.push(`argv : ${k}=host`)
    doitRefuser(d, 'privilegie: true', muter((x) => { x.privilegie = true }))
    doitRefuser(d, 'capacité SYS_ADMIN ajoutée', muter((x) => { x.capacites = ['SYS_ADMIN'] }))
    doitRefuser(d, 'réseau « host »', muter((x) => { x.reseau = 'host' }))
  })
  await C('OC-5', (d) => {
    if (sansArgv(d)) return
    if (!A.bools.has('--read-only')) d.push('argv : --read-only absent')
    for (const v of A.get('--volume')) if (!SOURCE_NOMMEE.test(sourceVolume(v))) d.push(`argv : montage d'un chemin de l'hôte (${court(v, 60)})`)
    for (const v of A.get('--mount')) if (!/(^|,)type=(volume|tmpfs)(,|$)/.test(v)) d.push(`argv : --mount non nommé (${court(v, 60)})`)
    if (A.a.some((t) => /docker\.sock/i.test(t))) d.push('argv : socket docker')
    if (A.get('--env-file').length) d.push('argv : --env-file (liste explicite de noms attendue)')
    doitRefuser(d, 'lecture_seule: false', muter((x) => { x.lecture_seule = false }))
    for (const src of ['/home/ubuntu/presti-secrets', '/var/run/docker.sock', '/home/agents', '/srv/presti', 'C:\\Users\\benja\\Documents\\presti-secrets', '~/.claude', '../presti'])
      doitRefuser(d, `montage de ${src}`, muter((x) => { x.volumes = [...(x.volumes || []), { source: src, cible: '/monte' }] }))
  })
  await C('OC-6', (d) => {
    if (sansArgv(d)) return
    for (const k of ['--memory', '--cpus', '--pids-limit']) if (!A.get(k).some((v) => v && v !== '0' && v !== '-1')) d.push(`argv : ${k} absent ou illimité`)
    for (const k of ['memoire', 'cpus', 'pids']) doitRefuser(d, `sans ${k}`, muter((x) => { delete x[k] }))
  })
  await C('OC-7', (d) => {
    if (sansArgv(d)) return
    if (A.bools.has('--publish-all') || A.bools.has('-P')) d.push('argv : --publish-all')
    for (const v of A.get('--publish')) if (!v.startsWith('127.0.0.1:')) d.push(`argv : port publié hors localhost (${v})`)
    doitRefuser(d, 'port d\'administration sur 0.0.0.0', muter((x) => {
      x.ports = (x.ports && x.ports.length ? x.ports : [{ hote: '127.0.0.1', port: 18789, conteneur: 18789 }]).map((p) => ({ ...p, hote: '0.0.0.0' }))
    }))
  })
  await C('OC-8', (d) => {
    if (sansArgv(d)) return
    const c = cfg()
    for (const n of c.env || []) if (/ANTHROPIC|CLAUDE/i.test(n)) d.push(`configuration : variable ${n} transmise`)
    const noms = new Set(c.env || [])
    const verifierSortie = (r, quoi) => {
      if (refuse(r)) return
      const env = r.env && typeof r.env === 'object' ? r.env : {}
      for (const k of Object.keys(env)) if (!noms.has(k)) d.push(`${quoi} : variable ${k} transmise hors de configuration().env (héritage)`)
      if (fuites(r.argv).length) d.push(`${quoi} : argv porte la valeur d'un secret (${fuites(r.argv).join(', ')}) — -e NOM seul attendu`)
      if (fuites(env).includes('claude') || /ANTHROPIC|CLAUDE/i.test(Object.keys(env).join(' '))) d.push(`${quoi} : un jeton Claude passe au conteneur`)
      for (const e of analyserArgv(r.argv || []).get('--env')) if (/ANTHROPIC|CLAUDE/i.test(e)) d.push(`${quoi} : argv -e ${court(e, 40)}`)
      if (fuites(r.diagnostic).length) d.push(`${quoi} : le diagnostic porte une valeur de variable`)
    }
    verifierSortie(nominal, 'configuration du dépôt')
    verifierSortie(prep(cfg(), envSale()), 'environnement parent chargé de jetons Claude')
    doitRefuser(d, 'CLAUDE_CODE_OAUTH_TOKEN demandé dans configuration().env', muter((x) => { x.env = [...(x.env || []), 'CLAUDE_CODE_OAUTH_TOKEN'] }), envSale())
    doitRefuser(d, 'ANTHROPIC_API_KEY demandé (valeur sans préfixe sk-ant-)', muter((x) => { x.env = [...(x.env || []), 'ANTHROPIC_API_KEY'] }), { ...envPropre(), ANTHROPIC_API_KEY: `jeton-anthropic-ESSAI-${ALEA}` })
    const n0 = (c.env || [])[0]
    if (!n0) d.push('configuration().env vide : impossible de vérifier qu\'une valeur sk-ant- cachée est refusée')
    else doitRefuser(d, `jeton Claude caché dans ${n0}`, cfg(), { ...envPropre(), [n0]: SECRETS.claude })
  })
  await C('OC-9', (d) => {
    const c = cfg()
    if (!Array.isArray(c.sorties) || !c.sorties.length) d.push('configuration().sorties vide')
    for (const s of c.sorties || []) {
      if (!sortieConforme(s)) d.push(`sortie non conforme : ${s?.role} ${court(s?.url, 60)}`)
      else if (mod.sortieAutorisee(s.url) !== true) d.push(`sortie déclarée refusée par sortieAutorisee : ${s.url}`)
    }
    // Liste fermée : toute origine absente de configuration().sorties rend false, même un hôte INTERNE (service local,
    // réseau domestique, port d'administration, nom de service non déclaré). Les variantes des sorties déclarées
    // (autre port, autre protocole, sous-domaine, sosie) sont tirées de la configuration elle-même.
    const declarees = new Set()
    for (const s of c.sorties || []) { try { declarees.add(new URL(s.url).origin) } catch { /* sortie illisible : déjà rouge */ } }
    const candidates = ['https://api.anthropic.com/v1/messages', 'https://claude.ai/api/organizations', 'https://console.anthropic.com/', 'https://exemple-inconnu.presti-test.invalid/',
      'http://169.254.169.254/latest/meta-data/', 'https://ollama.com.leurre.presti-test.invalid/', 'https://registry.presti-test.invalid/',
      'http://localhost:8080/', 'http://127.0.0.1:18789/', 'http://192.168.1.1/', 'http://10.0.0.5:11434/', 'http://host.docker.internal:22/',
      'http://freellmapi:9999/', 'http://localhost:11434/', 'http://127.0.0.1:11434/', 'http://172.17.0.1:11434/', 'http://openclaw:18789/',
      'http://ollama.com/', 'https://api.ollama.com/', 'https://www.ollama.com/']
    for (const s of c.sorties || []) {
      let u
      try { u = new URL(s.url) } catch { continue }
      const port = Number(u.port || (u.protocol === 'https:' ? 443 : 80))
      candidates.push(`${u.protocol}//${u.hostname}:${port + 1}/`, `${u.protocol === 'http:' ? 'https:' : 'http:'}//${u.host}/`,
        `${u.protocol}//x.${u.host}/`, `${u.protocol}//${u.hostname}.leurre.presti-test.invalid${u.port ? `:${u.port}` : ''}/`)
    }
    let vus = 0
    for (const x of candidates) {
      let origine
      try { origine = new URL(x).origin } catch { continue }
      if (declarees.has(origine)) continue
      vus++
      if (mod.sortieAutorisee(x) !== false) d.push(`sortieAutorisee(${x}) ≠ false (origine absente de configuration().sorties)`)
    }
    if (vus < 20) d.push(`${vus} origine(s) non déclarée(s) éprouvée(s) seulement`)
    doitRefuser(d, 'sortie vers api.anthropic.com', muter((x) => { x.sorties = [...(x.sorties || []), { role: 'autre', url: 'https://api.anthropic.com' }] }))
    doitRefuser(d, 'faux Ollama Cloud', muter((x) => { x.sorties = [...(x.sorties || []), { role: 'ollama-cloud', url: 'https://ollama.leurre.presti-test.invalid' }] }))
    doitRefuser(d, 'freellmapi public', muter((x) => { x.sorties = [...(x.sorties || []), { role: 'freellmapi', url: 'https://freellmapi.leurre.presti-test.invalid' }] }))
  })
  await C('OC-10', (d) => {
    const c = cfg()
    if (!Array.isArray(c.modeles) || !c.modeles.length) d.push('configuration().modeles vide')
    for (const m of c.modeles || []) if (!['ollama', 'freellmapi'].includes(m?.fournisseur) || MODELE_CLAUDE.test(String(m?.modele))) d.push(`modèle hors voies gratuites : ${m?.fournisseur}/${m?.modele}`)
    doitRefuser(d, 'modèle anthropic/claude-sonnet-4-5', muter((x) => { x.modeles = [...(x.modeles || []), { fournisseur: 'anthropic', modele: 'claude-sonnet-4-5' }] }))
    // Voie cohérente déclarée : seul le nom Claude doit faire tomber ces deux-là.
    doitRefuser(d, 'modèle claude servi par un fournisseur admis', muter((x) => { x.modeles = [{ fournisseur: 'ollama', modele: 'claude-opus-4-1', voie: 'ollama-local' }] }))
    doitRefuser(d, 'modèle claude servi par freellmapi', muter((x) => { x.modeles = [...(x.modeles || []), { fournisseur: 'freellmapi', modele: 'claude-3-haiku', voie: 'freellmapi' }] }))
    doitRefuser(d, 'modèle sans voie déclarée', muter((x) => { x.modeles = [...(x.modeles || []), { fournisseur: 'ollama', modele: 'gpt-oss:20b' }] }))
    doitRefuser(d, 'modèle local portant un suffixe cloud', muter((x) => { x.modeles = [...(x.modeles || []), { fournisseur: 'ollama', modele: 'gpt-oss:120b-cloud', voie: 'ollama-local' }] }))
    const r = mod.choisirModele({ donnees: 'publique', disponibles: { 'ollama-local': true, 'ollama-cloud': true, freellmapi: true }, prefere: { fournisseur: 'anthropic', modele: 'claude-sonnet-4-5' } })
    if (!refuse(r)) d.push('choisirModele accepte un modèle Claude demandé')
    // Chaque modèle déclare sa voie, cohérente avec son fournisseur et avec une sortie déclarée du même rôle ; un modèle
    // rendu pour une donnée publique est l'un des modèles déclarés (fournisseur, nom ET voie) et sa voie est disponible.
    const roles = new Set((c.sorties || []).map((s) => s?.role))
    for (const m of c.modeles || []) {
      const attendu = { 'ollama-local': 'ollama', 'ollama-cloud': 'ollama', freellmapi: 'freellmapi' }[m?.voie]
      if (!attendu) d.push(`modèle ${m?.fournisseur}/${m?.modele} sans voie déclarée (ollama-local, ollama-cloud ou freellmapi) : le nom ne dit pas où partent les données`)
      else if (m.fournisseur !== attendu) d.push(`modèle ${m.modele} : voie ${m.voie} servie par ${json(m.fournisseur)}`)
      if (m?.voie === 'ollama-local' && MODELE_CLOUD.test(String(m.modele))) d.push(`modèle ${m.modele} déclaré local avec un suffixe cloud`)
      if (attendu && !roles.has(m.voie)) d.push(`modèle ${m.modele} : voie ${m.voie} sans sortie déclarée du même rôle`)
    }
    const declare = (x) => (c.modeles || []).some((m) => m?.fournisseur === x?.fournisseur && m?.modele === x?.modele && m?.voie === x?.voie)
    for (const disponibles of [{ 'ollama-local': true, 'ollama-cloud': true, freellmapi: true }, { 'ollama-local': false, 'ollama-cloud': true, freellmapi: true }, { 'ollama-local': false, 'ollama-cloud': false, freellmapi: true }]) {
      const x = mod.choisirModele({ donnees: 'publique', disponibles })
      if (refuse(x)) continue
      if (!declare(x)) d.push(`donnée publique : ${court(json(x), 100)} n'est pas un modèle déclaré (fournisseur, nom et voie)`)
      else if (disponibles[x.voie] !== true) d.push(`donnée publique : voie ${x.voie} rendue alors qu'elle est indisponible`)
    }
  })
  await C('OC-11', (d) => {
    // La règle du 26/09 porte sur la DESTINATION : une donnée de prospect ne part que vers Ollama local. Le suffixe du nom
    // ne suffit pas (l'API directe d'ollama.com nomme ses modèles sans « -cloud ») : la voie rendue doit être ollama-local
    // et le modèle, l'un des modèles déclarés locaux de configuration().modeles.
    const locaux = (cfg().modeles || []).filter((m) => m?.fournisseur === 'ollama' && m?.voie === 'ollama-local' && !MODELE_CLOUD.test(String(m?.modele)))
    if (!locaux.length) d.push('configuration().modeles sans modèle Ollama local déclaré (voie ollama-local, sans suffixe cloud)')
    const local = (x) => !refuse(x) && x?.voie === 'ollama-local' && x?.fournisseur === 'ollama' && !MODELE_CLOUD.test(String(x?.modele))
      && locaux.some((m) => m.modele === x.modele)
    const tous = { 'ollama-local': true, 'ollama-cloud': true, freellmapi: true }
    const r1 = mod.choisirModele({ donnees: 'prospect', disponibles: tous })
    if (!local(r1)) d.push(`prospect, tout disponible : ${court(json(r1), 100)} (voie ollama-local et un modèle local déclaré attendus)`)
    const r2 = mod.choisirModele({ donnees: 'prospect', disponibles: { 'ollama-local': false, 'ollama-cloud': true, freellmapi: true } })
    if (!refuse(r2)) d.push(`prospect sans Ollama local : ${court(json(r2), 100)} (refus attendu : ni cloud ni freellmapi)`)
    // Une donnée NON CLASSÉE (classe absente, vide, inconnue ou mal écrite) reste fermée comme un prospect : un appelant
    // qui oublie de classer ne fait pas sortir la donnée vers Ollama Cloud ni freellmapi. Seul 'publique' ouvre ces voies.
    for (const donnees of [undefined, null, '', 'Prospect', 'PROSPECT', 'client', 'inconnue']) {
      for (const disponibles of [tous, { 'ollama-local': false, 'ollama-cloud': true, freellmapi: true }]) {
        const x = mod.choisirModele({ donnees, disponibles })
        const quoi = `donnée non classée (${json(donnees) || 'absente'})${disponibles['ollama-local'] ? '' : ', sans Ollama local'}`
        if (!disponibles['ollama-local']) { if (!refuse(x)) d.push(`${quoi} : ${court(json(x), 100)} (refus attendu : ni cloud ni freellmapi)`) }
        else if (!refuse(x) && !local(x)) d.push(`${quoi} : ${court(json(x), 100)} (refus ou Ollama local attendu)`)
      }
    }
    // Une préférence vers le cloud ou freellmapi ne fait jamais sortir une donnée de prospect : refus, ou modèle local.
    const nuage = (cfg().modeles || []).find((m) => m?.voie === 'ollama-cloud')
    const libre = (cfg().modeles || []).find((m) => m?.voie === 'freellmapi')
    const preferes = [
      ['modèle Ollama Cloud déclaré', nuage], ['modèle freellmapi déclaré', libre],
      ['Ollama Cloud sans suffixe', { fournisseur: 'ollama', modele: 'gpt-oss:120b', voie: 'ollama-cloud' }],
      ['Ollama Cloud suffixé', { fournisseur: 'ollama', modele: 'gpt-oss:120b-cloud' }],
      ['freellmapi', { fournisseur: 'freellmapi', modele: 'llama-4-scout' }],
    ]
    for (const [quoi, prefere] of preferes) {
      if (!prefere) continue
      for (const disponibles of [tous, { 'ollama-local': false, 'ollama-cloud': true, freellmapi: true }]) {
        const x = mod.choisirModele({ donnees: 'prospect', disponibles, prefere: structuredClone(prefere) })
        if (!disponibles['ollama-local']) { if (!refuse(x)) d.push(`prospect, prefere ${quoi}, sans Ollama local : ${court(json(x), 100)} (refus attendu)`) }
        else if (!refuse(x) && !local(x)) d.push(`prospect, prefere ${quoi} : ${court(json(x), 100)} (refus ou Ollama local attendu)`)
      }
    }
    const r3 = mod.choisirModele({ donnees: 'publique', disponibles: { 'ollama-local': false, 'ollama-cloud': true, freellmapi: true } })
    if (refuse(r3)) d.push('donnée publique, Ollama Cloud disponible : refusé (une voie gratuite admise existe)')
    const r4 = mod.choisirModele({ donnees: 'publique', disponibles: {} })
    if (!refuse(r4)) d.push('aucune voie disponible : un modèle est rendu (outil arrêté attendu)')
  })
  await C('OC-12', async (d) => {
    const fautes = [
      ['privilégié', muter((x) => { x.privilegie = true })], ['montage du coffre', muter((x) => { x.volumes = [...(x.volumes || []), { source: '/home/ubuntu/presti-secrets', cible: '/coffre' }] })],
      ['modèle Claude', muter((x) => { x.modeles = [...(x.modeles || []), { fournisseur: 'anthropic', modele: 'claude-sonnet-4-5' }] })],
      ['sortie Anthropic', muter((x) => { x.sorties = [...(x.sorties || []), { role: 'autre', url: 'https://api.anthropic.com' }] })],
      ['utilisateur root', muter((x) => { x.utilisateur = 'root' })], ['jeton Claude demandé', muter((x) => { x.env = [...(x.env || []), 'CLAUDE_CODE_OAUTH_TOKEN'] })],
    ]
    // Toutes les configurations que OC-2 à OC-9 exigent de voir refusées passent aussi par lancer : aucune ne doit
    // atteindre docker ni le réseau, et le refus garde le critère que preparerLancement a nommé.
    const cas = [...fautes.map(([quoi, config]) => ({ quoi, config, env: undefined })), ...aRefuser]
    if (aRefuser.length < 20) d.push(`${aRefuser.length} mutation(s) seulement rejouées depuis OC-2 à OC-9`)
    for (const { quoi, config, env } of cas) {
      const e = env === undefined ? envSale() : structuredClone(env)
      const c = { docker: 0, connecter: 0, journal: [] }
      let r
      try {
        r = await mod.lancer({ config: structuredClone(config), env: e, deps: { docker: async () => { c.docker++ }, connecter: async () => { c.connecter++ }, journal: (l) => c.journal.push(String(l)) } })
      } catch (x) { d.push(`${quoi} : lancer lève (${court(x?.message || x, 60)}) au lieu de rendre un refus`); continue }
      if (!refuse(r)) d.push(`${quoi} : lancer ne rend pas de refus`)
      if (c.docker || c.connecter) d.push(`${quoi} : ${c.docker} appel(s) docker et ${c.connecter} connexion(s) malgré le refus`)
      if (fuites(c.journal).length || fuites(r).length) d.push(`${quoi} : le journal ou le refus porte un secret`)
      let p = null
      try { p = prep(structuredClone(config), structuredClone(e)) } catch { /* déjà rouge ailleurs */ }
      if (refuse(r) && p?.refus && r.refus !== p.refus) d.push(`${quoi} : lancer refuse pour « ${r.refus} », preparerLancement pour « ${p.refus} » (le critère du refus se perd)`)
    }
  })
  await C('OC-13', async (d) => {
    const c = { docker: [], connecter: 0, journal: [] }
    const r = await mod.lancer({ config: cfg(), env: envPropre(), deps: { docker: async (argv, env) => { c.docker.push({ argv, env }) }, connecter: async () => { c.connecter++ }, journal: (l) => c.journal.push(String(l)) } })
    if (refuse(r)) { d.push(`la configuration du dépôt est refusée par lancer : ${court(json(r), 100)}`); return }
    if (c.docker.length !== 1) d.push(`${c.docker.length} appel(s) docker (1 attendu)`)
    else {
      if (!nominal || json(c.docker[0].argv) !== json(nominal.argv)) d.push('lancer n\'utilise pas l\'argv de preparerLancement')
      const noms = new Set(cfg().env || [])
      for (const k of Object.keys(c.docker[0].env || {})) if (!noms.has(k)) d.push(`docker reçoit ${k}, hors de configuration().env`)
      if (fuites(c.docker[0].argv).length) d.push('l\'argv de docker porte une valeur de secret')
    }
    if (fuites(c.journal).length) d.push(`le journal porte une valeur de variable (${fuites(c.journal).join(', ')})`)
    if (!c.journal.length) d.push('aucun diagnostic au journal')
  })
}

// ── Cursor ───────────────────────────────────────────────────────────────────────────────────────────────────────────
async function jugerCursor(mod, C) {
  const acces = { cli: true, mode: 'headless', constate_le: ISO(HORLOGE), source: 'cursor-agent --version (essai fictif)' }
  const tarifOk = { cout_par_tache: 0, source: 'page des tarifs relevée (essai fictif)', constate_le: ISO(HORLOGE) }
  const temoin = { juge: '026-220', verdict: 'PASS' }
  await C('CU-2', (d) => {
    const ok = mod.evaluerVoie({ acces, tarif: tarifOk, temoin })
    if (ok?.active !== true) d.push(`accès, coût 0 sourcé et témoin PASS : voie inactive (${court(json(ok), 100)})`)
    const cas = [
      ['coût inconnu (null)', { acces, tarif: { cout_par_tache: null, source: 'page des tarifs (essai)', constate_le: ISO(HORLOGE) }, temoin }, true],
      ['coût absent', { acces, tarif: { source: 'page des tarifs (essai)', constate_le: ISO(HORLOGE) }, temoin }, true],
      ['tarif absent', { acces, tarif: null, temoin }, true],
      ['coût 0 sans source', { acces, tarif: { cout_par_tache: 0, source: null, constate_le: ISO(HORLOGE) }, temoin }, false],
      ['coût 0 non daté', { acces, tarif: { cout_par_tache: 0, source: 'page (essai)', constate_le: null }, temoin }, false],
      ['coût 20', { acces, tarif: { ...tarifOk, cout_par_tache: 20 }, temoin }, false],
      ['accès non constaté', { acces: null, tarif: tarifOk, temoin }, false],
      ['accès sans source', { acces: { ...acces, source: null }, tarif: tarifOk, temoin }, false],
      ['témoin rouge', { acces, tarif: tarifOk, temoin: { juge: '026-220', verdict: 'FAIL' } }, false],
      ['témoin absent', { acces, tarif: tarifOk, temoin: null }, false],
      ['PASS d\'un autre juge (026-999)', { acces, tarif: tarifOk, temoin: { juge: '026-999', verdict: 'PASS' } }, false],
      ['PASS sans juge nommé', { acces, tarif: tarifOk, temoin: { verdict: 'PASS' } }, false],
    ]
    for (const [quoi, entree, inconnu] of cas) {
      const r = mod.evaluerVoie(entree)
      if (r?.active !== false) d.push(`${quoi} : voie active`)
      if (inconnu && r?.cout !== 'non mesuré') d.push(`${quoi} : cout = ${json(r?.cout)} (« non mesuré » attendu, jamais 0)`)
    }
  })
  await C('CU-3', (d) => {
    if (refuse(mod.accepterTache({ id: 'essai-cursor-01', perimetre: ['docs/essai.md'], sensible: [] }))) d.push('tâche ordinaire refusée')
    for (const s of ['argent', 'securite', 'droits', 'cerveau']) if (!refuse(mod.accepterTache({ id: `essai-${s}`, perimetre: ['docs/essai.md'], sensible: [s] }))) d.push(`verdict « ${s} » accepté`)
    if (!refuse(mod.accepterTache({ id: 'essai-vide', perimetre: [] }))) d.push('périmètre vide accepté')
  })
  const tache = { id: 'essai-cursor-01', perimetre: ['scripts/usine/openclaw/**', 'docs/agents/openclaw.md'], interdit: ['scripts/usine/openclaw/secret-*.mjs', 'scripts/orchestre.mjs'], reseau: ['registry.npmjs.org'] }
  const act = (type, cible) => mod.controlerAction(tache, { type, cible })
  await C('CU-4', (d) => {
    for (const c of ['scripts/usine/openclaw/lanceur.mjs', 'docs/agents/openclaw.md', 'scripts/usine/openclaw/sous/dossier/x.json'])
      if (refuse(act('ecrire', c))) d.push(`écrire ${c} (dans le périmètre) : refusé`)
    for (const c of ['app/page.tsx', 'scripts/usine/openclaw/../../orchestre.mjs', 'scripts/usine/openclaw/secret-essai.mjs', 'C:/Users/essai/Documents/presti/app/page.tsx',
      '../orchestre/bin/orchestre.mjs', '/etc/passwd', 'docs/agents/openclaw.md/../../../lib/ai.ts', 'scripts\\usine\\openclaw\\..\\..\\antigravity.mjs'])
      if (!refuse(act('ecrire', c))) d.push(`écrire ${c} : accepté`)
  })
  await C('CU-5', (d) => {
    for (const c of ['.env.local', '../presti-secrets/firecrawl.txt', 'C:/Users/essai/.ssh/id_ed25519', '.env', 'scripts/../.env.local', '/home/agents/.claude/credentials.json'])
      if (!refuse(act('lire', c))) d.push(`lire ${c} : accepté`)
    if (!refuse(act('commande', 'type ..\\presti-secrets\\cles.txt'))) d.push('commande qui lit presti-secrets : acceptée')
    if (!refuse(act('commande', 'cat .env.local'))) d.push('commande qui lit .env.local : acceptée')
    if (refuse(act('lire', 'docs/agents/openclaw.md'))) d.push('lire un fichier ordinaire : refusé')
  })
  await C('CU-6', (d) => {
    if (refuse(act('reseau', 'https://registry.npmjs.org/paquet'))) d.push('réseau prévu refusé')
    // Hôte EXACT : ni sous-chaîne, ni suffixe, ni sous-domaine, ni sosie du registre prévu.
    for (const u of ['https://api.anthropic.com/v1/messages', 'https://exemple.presti-test.invalid/', 'http://169.254.169.254/',
      'https://registry.npmjs.org.attaquant.presti-test.invalid/', 'https://faux-registry.npmjs.org.presti-test.invalid/', 'https://x.registry.npmjs.org/',
      'https://evilregistry.npmjs.org/', 'https://registry.npmjs.org@attaquant.presti-test.invalid/', 'registry.npmjs.org.attaquant.presti-test.invalid', 'https://npmjs.org/'])
      if (!refuse(act('reseau', u))) d.push(`réseau ${u} : accepté (hôte exact de tache.reseau exigé)`)
    for (const c of ['git reset --hard HEAD', 'rm -rf node_modules', 'taskkill /IM node.exe /F', 'git clean -fdx', 'git stash', 'git restore app/page.tsx',
      'git checkout -- lib/ai.ts', 'Remove-Item -Recurse -Force app', 'pkill -f node'])
      if (!refuse(act('commande', c))) d.push(`commande « ${c} » : acceptée`)
    for (const c of ['node scripts/juges-026-completude-qa.mjs --partie=cursor', 'git status', 'git diff --stat']) if (refuse(act('commande', c))) d.push(`commande « ${c} » : refusée`)
  })
  await C('CU-7', async (d) => {
    const dossier = path.join(TRAVAIL, `cursor-reprise-${ALEA}`)
    nettoyer(dossier); fs.mkdirSync(dossier, { recursive: true })
    try {
      const id = 'essai-cursor-07'
      const partiel = { id, etape: 2, preuve: 'moitié de la preuve (essai)', fichiers: ['docs/agents/openclaw.md'] }
      const fPartiel = path.join(dossier, `${id}.partiel.json`)
      const fAutre = path.join(dossier, 'production-codex.txt')
      fs.writeFileSync(fPartiel, JSON.stringify(partiel))
      fs.writeFileSync(fAutre, 'production d\'un autre exécutant : ne pas toucher\n')
      const avant = { p: fs.readFileSync(fPartiel, 'utf8'), a: fs.readFileSync(fAutre, 'utf8') }
      const [a, b] = await Promise.all([mod.reprendre({ id, dossier, agent: 'cursor-a' }), mod.reprendre({ id, dossier, agent: 'cursor-b' })])
      const oks = [a, b].filter((x) => x?.ok === true)
      if (oks.length !== 1) d.push(`${oks.length} reprise(s) concurrente(s) acceptée(s) (une seule attendue)`)
      if (oks[0] && (oks[0].id !== id || json(oks[0].partiel) !== json(partiel))) d.push('la reprise ne récupère pas l\'id et la preuve partielle')
      const troisieme = await mod.reprendre({ id, dossier, agent: 'cursor-c' })
      if (troisieme?.ok === true) d.push('troisième reprise acceptée alors que le verrou est tenu')
      if (fs.readFileSync(fPartiel, 'utf8') !== avant.p) d.push('la preuve partielle a été écrasée')
      if (!existe(fAutre) || fs.readFileSync(fAutre, 'utf8') !== avant.a) d.push('la production d\'un autre exécutant a été touchée')
      await mod.terminerReprise({ id, dossier, agent: oks[0] === a ? 'cursor-a' : 'cursor-b' })
      const apres = await mod.reprendre({ id, dossier, agent: 'cursor-d' })
      if (apres?.ok !== true) d.push('verrou non levé par terminerReprise : reprise impossible ensuite')
      else await mod.terminerReprise({ id, dossier, agent: 'cursor-d' })
    } finally { nettoyer(dossier) }
  })
  await C('CU-8', (d) => {
    const l1 = mod.ligneJournal({ id: 'essai-cursor-08', statut: 'interrompue', fichiers: ['docs/agents/openclaw.md'] })
    if (l1?.consommation !== 'non mesuré') d.push(`consommation absente → ${json(l1?.consommation)} (« non mesuré » attendu)`)
    const l2 = mod.ligneJournal({ id: 'essai-cursor-08', statut: 'terminee', fichiers: [], consommation: null })
    if (l2?.consommation !== 'non mesuré') d.push(`consommation null → ${json(l2?.consommation)}`)
    const l3 = mod.ligneJournal({ id: 'essai-cursor-08', statut: 'terminee', fichiers: ['a'], consommation: 0.25 })
    if (l3?.consommation !== 0.25) d.push(`consommation 0,25 → ${json(l3?.consommation)}`)
    if (l1?.id !== 'essai-cursor-08' || l1?.statut !== 'interrompue' || !Array.isArray(l1?.fichiers) || l1.fichiers[0] !== 'docs/agents/openclaw.md') d.push('ligne sans id, statut ou fichiers')
  })
}

// ── Firecrawl ────────────────────────────────────────────────────────────────────────────────────────────────────────
const SITE = 'https://artisan-essai.presti-test.invalid'
const MARQUE = { ok: `MARKDOWN-FIRECRAWL-${ALEA}`, sp: `MARKDOWN-SANS-PROVENANCE-${ALEA}`, rd: `MARKDOWN-REDIRIGE-${ALEA}`, repli: `LU-PAR-LE-LECTEUR-026-020-${ALEA}` }
async function jugerFirecrawl(mod, C) {
  const lecteur = await import(pathToFileURL(path.join(DEPOT, 'lib', 'agents', 'acquisition', 'lecteurSite.ts')).href)
  const tous = []
  const fabriquer = ({ cle = SECRETS.firecrawl, robots = 'User-agent: *\nAllow: /\n', reponse = 'ok', credits = { plafond: 1000, consommes: 10, date: ISO(HORLOGE), source: 'compteur daté (essai fictif)' } } = {}) => {
    const c = { firecrawl: [], robots: [], repli: [], lecteur: [], seq: [] }
    let t = HORLOGE
    const horlogeLecteur = { maintenant: () => t, attendre: async (ms) => { t += ms } }
    const recuperer = async (url) => {
      c.lecteur.push(url)
      if (url.endsWith('/robots.txt')) return { statut: 200, entetes: { 'content-type': 'text/plain' }, corps: 'User-agent: *\nAllow: /\n', url_finale: url, tronque: false }
      return { statut: 200, entetes: { 'content-type': 'text/html; charset=utf-8' }, corps: `<html><body><h1>Menuiserie Essai</h1><p>${MARQUE.repli}</p></body></html>`, url_finale: url, tronque: false }
    }
    const depsLecteur = { recuperer, horloge: horlogeLecteur }
    const deps = {
      cle,
      firecrawl: async (operation, corps, entetes) => {
        c.firecrawl.push({ operation, corps, entetes }); c.seq.push('firecrawl')
        const url = corps?.url
        if (operation === 'search') return { statut: 200, corps: { success: true, data: [{ url: 'https://menuiserie-essai.presti-test.invalid/', title: 'Menuiserie Essai' }] } }
        if (reponse === 'panne') throw new Error('panne Firecrawl (essai)')
        if (reponse === '429') return { statut: 429, corps: { success: false, error: 'Rate limit exceeded (essai)' } }
        if (reponse === 'sans-provenance') return { statut: 200, corps: { success: true, data: { markdown: `# Page\n${MARQUE.sp}`, metadata: { statusCode: 200 } } } }
        if (reponse === 'redirection') return { statut: 200, corps: { success: true, data: { markdown: `# Ailleurs\n${MARQUE.rd}`, metadata: { sourceURL: 'https://autre-domaine.presti-test.invalid/page', statusCode: 200 } } } }
        if (reponse === 'redirection-privee') return { statut: 200, corps: { success: true, data: { markdown: `# Interne\n${MARQUE.rd}`, metadata: { sourceURL: 'http://10.0.0.5/admin', statusCode: 200 } } } }
        return { statut: 200, corps: { success: true, data: { markdown: `# Menuiserie Essai\n\nNous posons des fenêtres en bois depuis 1998. ${MARQUE.ok}`, metadata: { sourceURL: url, statusCode: 200 } } } }
      },
      robots: async (url) => { c.robots.push(url); c.seq.push('robots'); return robots },
      repli: async (url) => { c.repli.push(url); c.seq.push('repli'); return lecteur.recupererPoli(url, depsLecteur) },
      credits: structuredClone(credits),
      horloge: { maintenant: () => HORLOGE },
    }
    return { deps, c }
  }
  const lire = async (url, opts) => { const x = fabriquer(opts); const r = await mod.lireAvecFirecrawl({ operation: 'lire', url }, x.deps); tous.push(r); return { r, ...x } }
  const page = `${SITE}/services`

  await C('FC-2', async (d) => {
    for (const u of ['http://127.0.0.1/', 'http://192.168.1.20/contact', 'http://localhost:3000/', `https://essai:${'motde' + 'passe'}@artisan-essai.presti-test.invalid/`, /* assemblée : le contrôle du paquet de l'usine refuse une URL à identifiants écrite d'un bloc */ `${SITE}/connexion`,
      `${SITE}/mon-espace/factures`, 'file:///etc/passwd', 'http://[::1]/', `${SITE}:8443/`, 'http://10.0.0.5/'])
    {
      const { r, c } = await lire(u)
      if (!refuse(r)) d.push(`${u} : accepté`)
      if (c.firecrawl.length || c.repli.length || c.robots.length) d.push(`${u} : ${c.robots.length} robots, ${c.firecrawl.length} Firecrawl, ${c.repli.length} repli avant le refus`)
    }
  })
  await C('FC-3', async (d) => {
    for (const [quoi, robots, url] of [['Disallow: /', 'User-agent: *\nDisallow: /\n', page], ['robots inconnu (null)', null, page], ['Disallow: /services', 'User-agent: *\nDisallow: /services\n', page],
      ['Disallow pour Firecrawl', 'User-agent: FirecrawlAgent\nDisallow: /\n\nUser-agent: *\nAllow: /\n', page]])
    {
      const { r, c } = await lire(url, { robots })
      if (!refuse(r)) d.push(`${quoi} : lecture acceptée`)
      if (c.firecrawl.length || c.repli.length) d.push(`${quoi} : ${c.firecrawl.length} appel(s) Firecrawl et ${c.repli.length} repli malgré robots`)
    }
  })
  await C('FC-4', async (d) => {
    for (const [quoi, credits] of [['quota épuisé (1 000/1 000)', { plafond: 1000, consommes: 1000, date: ISO(HORLOGE), source: 'compteur (essai)' }],
      ['borne configurée au-delà de 1 000', { plafond: 5000, consommes: 10, date: ISO(HORLOGE), source: 'compteur (essai)' }],
      ['borne configurée à 50, atteinte', { plafond: 50, consommes: 50, date: ISO(HORLOGE), source: 'compteur (essai)' }],
      ['mesure absente', { plafond: 1000, consommes: null, date: null, source: null }], ['mesure non datée', { plafond: 1000, consommes: 10, date: null, source: 'compteur (essai)' }]])
    {
      const { r, c } = await lire(page, { credits })
      if (c.firecrawl.length) d.push(`${quoi} : ${c.firecrawl.length} appel(s) Firecrawl`)
      if (refuse(r) || r?.methode !== 'lecteur-026-020') d.push(`${quoi} : pas de repli 026-020 (${court(json(r), 80)})`)
    }
    const { r, deps } = await lire(page)
    if (!(typeof deps.credits.consommes === 'number' && deps.credits.consommes > 10 && deps.credits.consommes <= 1000)) d.push(`compteur non mis à jour après un appel facturé (${json(deps.credits.consommes)})`)
    for (const x of tous) if (!refuse(x) && x?.credits && x.credits.solde_constate !== 'non mesuré') d.push(`solde présenté comme constaté : ${json(x.credits.solde_constate)} (« non mesuré » attendu : 1 000 est une borne, pas un solde)`)
    if (!refuse(r) && !r?.credits) d.push('résultat sans état des crédits')
  })
  await C('FC-5', async (d) => {
    const { r } = await lire(page)
    if (refuse(r)) { d.push('lecture nominale refusée'); return }
    if (!/^https?:\/\//.test(String(r.url_finale))) d.push('url_finale absente')
    if (!r.methode) d.push('méthode absente')
    if (r.horodatage !== ISO(HORLOGE)) d.push(`horodatage « ${r.horodatage} » ≠ horloge du juge`)
    const x = await lire(page, { reponse: 'sans-provenance' })
    if (!refuse(x.r) && x.r?.methode === 'firecrawl') d.push('page Firecrawl sans provenance rendue comme telle')
    if (json(x.r).includes(MARQUE.sp)) d.push('le texte d\'une page sans provenance est repris')
    for (const y of tous) if (!refuse(y) && y?.texte !== undefined && (!y.url_finale || !y.methode || !y.horodatage)) d.push(`résultat sans provenance complète : ${court(json(y), 80)}`)
  })
  await C('FC-6', async (d) => {
    for (const [quoi, opts, max] of [['clé absente', { cle: null }, 0], ['429', { reponse: '429' }, 2], ['panne', { reponse: 'panne' }, 2]]) {
      const { r, c } = await lire(page, opts)
      if (c.firecrawl.length > max) d.push(`${quoi} : ${c.firecrawl.length} appel(s) Firecrawl (${max} au plus)`)
      if (c.repli.length !== 1) d.push(`${quoi} : ${c.repli.length} repli(s) (1 attendu)`)
      if (refuse(r) || r?.methode !== 'lecteur-026-020') d.push(`${quoi} : méthode ${json(r?.methode ?? r?.refus)} (lecteur-026-020 attendu)`)
      else if (!String(r.texte).includes(MARQUE.repli)) d.push(`${quoi} : le texte ne vient pas du lecteur 026-020`)
      if (!c.lecteur.length) d.push(`${quoi} : le lecteur 026-020 n'a rien lu`)
    }
  })
  await C('FC-7', async (d) => {
    for (const rep of ['redirection', 'redirection-privee']) {
      const { r } = await lire(page, { reponse: rep })
      if (!refuse(r) && r?.methode === 'firecrawl') d.push(`${rep} : rendu par Firecrawl avec ${court(r.url_finale, 60)}`)
      if (json(r).includes(MARQUE.rd)) d.push(`${rep} : le texte de la page d'arrivée est repris`)
    }
  })
  await C('FC-8', async (d) => {
    for (const q of ['plombier jean.essai@presti-test.invalid Lyon', 'menuisier 06 12 34 56 78']) {
      const x = fabriquer()
      const r = await mod.lireAvecFirecrawl({ operation: 'chercher', requete: q }, x.deps)
      tous.push(r)
      if (!refuse(r)) d.push(`recherche avec une donnée personnelle acceptée (${court(q.replace(EMAIL, '[adresse]'), 40)})`)
      if (x.c.firecrawl.length) d.push('donnée personnelle envoyée à Firecrawl')
    }
    const { r, c } = await lire(`${SITE}/devis?email=jean.essai%40presti-test.invalid`)
    if (!refuse(r) || c.firecrawl.length || c.robots.length) d.push('URL portant une adresse : acceptée ou appelée')
    const x = fabriquer()
    const s = await mod.lireAvecFirecrawl({ operation: 'chercher', requete: 'menuisier Lyon fenêtres bois' }, x.deps)
    tous.push(s)
    if (refuse(s) || !Array.isArray(s?.resultats) || !s.resultats[0]?.url) d.push(`recherche publique : ${court(json(s), 80)} (resultats[].url attendus)`)
    if (x.c.firecrawl.length !== 1 || x.c.firecrawl[0]?.operation !== 'search') d.push(`recherche publique : ${x.c.firecrawl.length} appel(s) « search » (1 attendu)`)
    const vide = fabriquer({ cle: null })
    const s2 = await mod.lireAvecFirecrawl({ operation: 'chercher', requete: 'menuisier Lyon' }, vide.deps)
    tous.push(s2)
    if (vide.c.firecrawl.length) d.push('recherche sans clé : Firecrawl appelé')
  })
  await C('FC-9', async (d) => {
    const { c } = await lire(page)
    const appel = c.firecrawl[0]
    if (!appel) { d.push('aucun appel Firecrawl en lecture nominale'); return }
    if (fuites(appel.corps).length) d.push('la clé part dans le corps de la requête')
    if (!fuites(appel.entetes).includes('firecrawl')) d.push('la clé n\'est pas dans les entêtes de l\'appel')
    const f = tous.filter((x) => fuites(x).length)
    if (f.length) d.push(`${f.length} résultat(s) portent un secret`)
  })
  await C('FC-10', async (d) => {
    const { r, c } = await lire(page)
    if (refuse(r)) { d.push(`lecture nominale refusée (${court(json(r), 80)})`); return }
    if (r.methode !== 'firecrawl') d.push(`méthode ${json(r.methode)} (firecrawl attendu)`)
    if (!String(r.texte).includes(MARQUE.ok)) d.push('le texte ne vient pas de Firecrawl')
    if (r.robots !== 'autorise') d.push(`robots ${json(r.robots)} (« autorise » attendu)`)
    if (c.firecrawl.length !== 1 || c.firecrawl[0].operation !== 'scrape' || c.firecrawl[0].corps?.url !== page) d.push('un seul « scrape » de l\'URL demandée attendu')
    if (c.repli.length) d.push('repli appelé alors que Firecrawl a répondu')
    if (c.seq.indexOf('robots') < 0 || c.seq.indexOf('robots') > c.seq.indexOf('firecrawl')) d.push('robots non lu avant l\'appel Firecrawl')
  })
}

// ── Fish Audio ───────────────────────────────────────────────────────────────────────────────────────────────────────
async function jugerFish(mod, C) {
  const manifestes = []
  const DROITS_OK = { forfait: 'forfait-commercial-essai', commercial: true, prouve_le: ISO(HORLOGE - 86_400_000), source: 'facture fictive FA-ESSAI-001', expire_le: '2026-12-31T00:00:00.000Z' }
  const QUOTA_OK = { solde: 500, constate_le: ISO(HORLOGE - 3_600_000), source: 'relevé du tableau de bord (essai fictif)' }
  // Toute réservation au-delà du solde constaté est notée (FA-4, FA-7) : un quota « suffisant » se compare au besoin.
  const depassements = []
  const fabriquer = ({ cle = SECRETS.fish, sonde = 200, droits = null, quota = QUOTA_OK, echec = false } = {}) => {
    const c = { sonder: 0, fish: 0, local: [], reserver: [], consommer: [], restituer: [] }
    const deps = {
      cle, droits, quota,
      sonder: async () => { c.sonder++; return { statut: sonde } },
      credits: {
        reserver: (id, n) => {
          c.reserver.push([id, n])
          if (typeof quota?.solde === 'number' && !(Number(n) <= quota.solde)) depassements.push(`${id} : ${json(n)} crédit(s) réservé(s) pour un solde constaté de ${quota.solde}`)
          return true
        },
        consommer: (id) => { c.consommer.push(id) }, restituer: (id) => { c.restituer.push(id) },
      },
      memoire: new Map(),
      synthFish: async () => { c.fish++; if (echec) throw new Error('panne Fish (essai)'); return { audio: 'audio-fish-essai' } },
      synthLocal: async (texte, voix) => { c.local.push(voix); return { audio: 'audio-local-essai' } },
      horloge: { maintenant: () => HORLOGE },
    }
    return { deps, c }
  }
  const demande = (usage, id = `voix-essai-${usage}`, plus = {}) => ({ id, usage, texte: 'Bonjour, voici la présentation fictive de la menuiserie Essai, à Lyon.', source_texte: 'script fictif v1 (essai)', ...plus })
  const choisir = async (dem, opts, x = fabriquer(opts)) => { const m = await mod.choisirVoix(dem, x.deps); manifestes.push(m); return { m, ...x } }
  const estLocal = (m) => m && !refuse(m) && m.fournisseur === 'local' && m.voix === 'ff_siwis'

  await C('FA-2', async (d) => {
    for (const [quoi, droits] of [['sans droits', null], ['offre gratuite', { forfait: 'gratuit', commercial: false, prouve_le: ISO(HORLOGE), source: 'page tarifs (essai)', expire_le: null }]]) {
      const { m, c } = await choisir(demande('usage_commercial', `commercial-${quoi}`), { droits })
      if (!estLocal(m)) d.push(`commercial ${quoi}, sonde 200 : ${court(json({ fournisseur: m?.fournisseur, voix: m?.voix }), 80)} (ff_siwis attendu)`)
      if (c.fish) d.push(`commercial ${quoi} : ${c.fish} synthèse(s) Fish`)
      if (c.reserver.length) d.push(`commercial ${quoi} : crédit Fish réservé`)
      if (c.local.length !== 1 || c.local[0] !== 'ff_siwis') d.push(`commercial ${quoi} : synthèse locale ${json(c.local)} (une ff_siwis attendue)`)
    }
  })
  await C('FA-3', async (d) => {
    const { m, c } = await choisir(demande('usage_interne'))
    if (refuse(m) || m?.fournisseur !== 'fish') d.push(`usage interne, sonde 200, quota constaté : ${json(m?.fournisseur ?? m?.refus)} (fish attendu)`)
    if (m?.droit !== 'usage_interne') d.push(`droit ${json(m?.droit)} (usage_interne attendu)`)
    if (m?.publiable !== false) d.push('un média d\'usage interne est publiable')
    if (c.fish !== 1 || c.local.length) d.push(`${c.fish} synthèse(s) Fish, ${c.local.length} locale(s)`)
  })
  await C('FA-4', async (d) => {
    for (const [quoi, quota] of [['solde inconnu', { ...QUOTA_OK, solde: null }], ['quota absent', null], ['solde épuisé', { ...QUOTA_OK, solde: 0 }], ['relevé non daté', { ...QUOTA_OK, constate_le: null }], ['relevé sans source', { ...QUOTA_OK, source: null }]]) {
      const { m, c } = await choisir(demande('usage_interne', `quota-${quoi}`), { quota })
      if (!estLocal(m)) d.push(`${quoi} : ${json(m?.fournisseur ?? m?.refus)} (ff_siwis attendu)`)
      if (c.fish || c.reserver.length) d.push(`${quoi} : Fish appelé ou crédit réservé`)
    }
    // Solde POSITIF mais inférieur au besoin : le besoin d'un texte long est lu sur une sonde à quota large (unité de
    // l'implémentation), puis le solde constaté est fixé à la moitié de ce besoin, et à 1 quand le besoin dépasse 1.
    const LONG = 'Présentation fictive et détaillée de la menuiserie Essai, ses fenêtres en bois et ses délais, pour le bac d\'essai. '.repeat(6).slice(0, 500)
    const sonde = await choisir(demande('usage_interne', 'quota-sonde-long', { texte: LONG }), { quota: { ...QUOTA_OK, solde: 1e6 } })
    const besoin = Number(sonde.c.reserver[0]?.[1])
    if (sonde.m?.fournisseur !== 'fish' || !(besoin > 0)) d.push(`sonde à quota large, texte de 500 caractères : ${json(sonde.m?.fournisseur ?? sonde.m?.refus)}, besoin réservé ${json(sonde.c.reserver[0]?.[1])} (fish et un besoin > 0 attendus)`)
    else {
      const soldes = [besoin / 2, ...(besoin > 1 ? [1] : [])]
      for (const solde of soldes) {
        const { m, c } = await choisir(demande('usage_interne', `quota-insuffisant-${solde}`, { texte: LONG }), { quota: { ...QUOTA_OK, solde } })
        if (!estLocal(m)) d.push(`solde constaté ${solde} < besoin ${besoin} : ${json(m?.fournisseur ?? m?.refus)} (ff_siwis attendu)`)
        if (c.fish || c.reserver.length) d.push(`solde constaté ${solde} < besoin ${besoin} : ${c.fish} synthèse(s) Fish, ${c.reserver.length} réservation(s) (aucune attendue)`)
      }
    }
    for (const x of depassements) d.push(`crédit réservé au-delà du solde constaté — ${x}`)
  })
  await C('FA-5', async (d) => {
    const ok = await choisir(demande('usage_commercial', 'commercial-forfait'), { droits: DROITS_OK })
    if (refuse(ok.m) || ok.m?.fournisseur !== 'fish' || ok.m?.droit !== 'usage_commercial' || ok.m?.publiable !== true) d.push(`forfait prouvé : ${court(json({ f: ok.m?.fournisseur, d: ok.m?.droit, p: ok.m?.publiable }), 80)} (fish, usage_commercial, publiable attendus)`)
    for (const [quoi, droits] of [['forfait expiré', { ...DROITS_OK, expire_le: '2026-09-01T00:00:00.000Z' }], ['forfait non prouvé', { ...DROITS_OK, prouve_le: null }], ['forfait sans source', { ...DROITS_OK, source: null }], ['forfait non commercial', { ...DROITS_OK, commercial: false }]]) {
      const { m, c } = await choisir(demande('usage_commercial', `commercial-${quoi}`), { droits })
      if (!estLocal(m) || c.fish) d.push(`${quoi} : ${json(m?.fournisseur ?? m?.refus)}, ${c.fish} synthèse(s) Fish (ff_siwis attendu)`)
    }
  })
  await C('FA-6', async (d) => {
    const x = fabriquer()
    const a = await choisir(demande('usage_interne', 'idem-fish'), {}, x)
    const b = await choisir(demande('usage_interne', 'idem-fish'), {}, x)
    if (x.c.fish !== 1 || x.c.reserver.length !== 1) d.push(`même id deux fois : ${x.c.fish} synthèse(s) Fish, ${x.c.reserver.length} réservation(s) (1 et 1 attendues)`)
    if (a.m?.fournisseur !== b.m?.fournisseur || a.m?.voix !== b.m?.voix) d.push('le second appel ne rend pas le même manifeste')
    const y = fabriquer()
    await choisir(demande('usage_commercial', 'idem-local'), {}, y)
    await choisir(demande('usage_commercial', 'idem-local'), {}, y)
    if (y.c.local.length !== 1) d.push(`voix locale, même id deux fois : ${y.c.local.length} synthèse(s) (1 attendue)`)
  })
  await C('FA-7', async (d) => {
    const e = await choisir(demande('usage_interne', 'echec-fish'), { echec: true })
    if (!estLocal(e.m)) d.push(`échec Fish : ${json(e.m?.fournisseur ?? e.m?.refus)} (repli ff_siwis attendu)`)
    if (e.c.reserver.length !== 1 || e.c.restituer.length !== 1 || e.c.consommer.length !== 0) d.push(`échec Fish : réservé ${e.c.reserver.length}, restitué ${e.c.restituer.length}, consommé ${e.c.consommer.length} (1, 1, 0 attendus)`)
    const s = await choisir(demande('usage_interne', 'succes-fish'))
    if (s.c.reserver.length !== 1 || s.c.consommer.length !== 1 || s.c.restituer.length !== 0) d.push(`succès Fish : réservé ${s.c.reserver.length}, consommé ${s.c.consommer.length}, restitué ${s.c.restituer.length} (1, 1, 0 attendus)`)
    if (!(Number(s.c.reserver[0]?.[1]) > 0)) d.push('crédit réservé sans estimation (> 0 attendu)')
    for (const x of depassements) d.push(`crédit réservé au-delà du solde constaté — ${x}`)
  })
  await C('FA-8', async (d) => {
    const { m, c } = await choisir(demande('usage_interne', 'clone-sans-droit', { voix_clonee: true, voix: 'voix-clonee-essai' }))
    if (!refuse(m)) d.push('voix clonée sans droit distinct : acceptée')
    if (c.fish || c.local.length || c.reserver.length) d.push('voix clonée sans droit : synthèse ou réservation avant le refus')
    const ok = await choisir(demande('usage_interne', 'clone-avec-droit', { voix_clonee: true, voix: 'voix-clonee-essai', droit_clonage: { accorde: true, source: 'accord écrit fictif (essai)', date: ISO(HORLOGE) } }))
    if (refuse(ok.m)) d.push('voix clonée avec droit explicite : refusée')
  })
  await C('FA-9', (d) => {
    const vus = manifestes.filter((m) => m && !refuse(m))
    if (vus.length < 5) d.push(`${vus.length} manifeste(s) seulement`)
    for (const m of vus) {
      for (const k of ['id', 'fournisseur', 'voix', 'droit', 'source_texte']) if (!m[k]) d.push(`manifeste ${m.id ?? '?'} sans ${k}`)
      if (m.date !== ISO(HORLOGE)) d.push(`manifeste ${m.id} : date ${json(m.date)} ≠ horloge`)
      if (m.fournisseur === 'local' && /fish/i.test(`${m.fournisseur} ${m.voix} ${m.droit}`)) d.push(`manifeste ${m.id} : la voix locale annonce Fish`)
      if (m.fournisseur === 'fish' && m.voix === 'ff_siwis') d.push(`manifeste ${m.id} : Fish annoncé avec la voix locale`)
    }
  })
  await C('FA-10', (d) => { const f = manifestes.filter((m) => fuites(m).length); if (f.length) d.push(`${f.length} manifeste(s) portent la clé`) })
  await C('FA-11', async (d) => {
    const a = await choisir(demande('usage_interne', 'sans-cle'), { cle: null })
    if (!estLocal(a.m) || a.c.fish || a.c.sonder) d.push(`clé absente : ${json(a.m?.fournisseur)}, ${a.c.sonder} sonde(s), ${a.c.fish} synthèse(s) Fish`)
    const b = await choisir(demande('usage_interne', 'indisponible'), { sonde: 503 })
    if (!estLocal(b.m) || b.c.fish) d.push(`Fish indisponible (503) : ${json(b.m?.fournisseur)}, ${b.c.fish} synthèse(s) Fish`)
  })
}

// ── Voie entrante ────────────────────────────────────────────────────────────────────────────────────────────────────
// EN-12 : ce qu'une prose ne dit pas sans verdict « démontré ». Bornes de mot en Unicode (\b ignore les lettres accentuées).
// Seule une négation qui porte sur le mot lui-même l'excuse (« n'est pas encore opérationnelle », « non livré ») :
// « opérationnelle, il n'y a plus rien à faire » reste une proclamation.
const L = '\\p{L}'
const PROCLAMATIONS = [
  `(?:est|sont)\\s+(?:entièrement\\s+|totalement\\s+|désormais\\s+|maintenant\\s+)?prête?s?`, `prête?s?\\s+à\\s+l['’]emploi`,
  `(?:mise?s?\\s+)?en\\s+production`, `(?:mise?s?\\s+)?en\\s+service`, `opérationnel(?:le)?s?`, `fonctionnel(?:le)?s?`,
  `fonctionnen?t?`, `livrée?s?`, `terminée?s?`, `déployée?s?`,
].map((m) => new RegExp(`(?<!${L})(?:${m})(?!${L})`, 'giu'))
const NEGATION = new RegExp(`(?:(?<!${L})(?:ne|n['’])\\S*\\s+(?:\\S+\\s+)?(?:pas|jamais|plus|point)\\s+(?:encore\\s+|tout\\s+à\\s+fait\\s+|vraiment\\s+|entièrement\\s+)?|(?<!${L})(?:pas\\s+encore|non|jamais)\\s+)$`, 'iu')
function proclamations(prose) {
  const vus = []
  for (const re of PROCLAMATIONS) {
    for (const m of prose.matchAll(re)) {
      if (NEGATION.test(prose.slice(Math.max(0, m.index - 60), m.index))) continue
      if (!vus.some(([, i]) => i === m.index)) vus.push([m[0], m.index])
    }
  }
  return vus
}
const ETAPES = ['demande', 'preparation', 'accord', 'envoi', 'reponse', 'preparation_2', 'accord_2', 'envoi_2', 'opposition', 'arret']
const ETATS = ['prouvé', 'simulé', 'bloqué']
async function jugerEntrant(texte, C, racine) {
  const blocs = [...texte.matchAll(/```json[ \t]+recette-entrant[ \t]*\r?\n([\s\S]*?)\r?\n```/g)]
  let j = null
  let erreur = null
  if (blocs.length !== 1) erreur = `${blocs.length} bloc(s) \`\`\`json recette-entrant (1 attendu)`
  else { try { j = JSON.parse(blocs[0][1]) } catch (e) { erreur = `journal illisible : ${court(e.message, 80)}` } }
  const etapes = Array.isArray(j?.etapes) ? j.etapes : []
  const E = Object.fromEntries(etapes.map((e) => [e?.etape, e]))
  const noms = etapes.map((e) => e?.etape)
  const vivant = (n) => E[n] && E[n].etat !== 'bloqué'
  const t = (x) => Date.parse(x)
  await C('EN-1', (d) => {
    if (erreur) { d.push(erreur); return }
    if (json(noms) !== json(ETAPES)) d.push(`étapes ${court(noms.join(','), 120)} (attendu : ${ETAPES.join(',')})`)
  })
  if (erreur) { for (const [id] of CRITERES.entrant.slice(1)) await C(id, (d) => d.push('non jugé : journal absent ou illisible (EN-1)')); return }
  const demande = E.demande || {}
  await C('EN-2', (d) => {
    for (const a of texte.match(EMAIL) || []) if (!a.toLowerCase().endsWith('@presti-test.invalid')) d.push(`adresse non fictive : ${a.replace(/^[^@]+/, '…')}`)
    if (TELEPHONE.test(texte)) d.push('un numéro de téléphone figure dans le compte rendu')
    if (!String(demande.adresse || '').endsWith('@presti-test.invalid')) d.push('la demande n\'a pas d\'adresse @presti-test.invalid')
    for (const e of etapes) {
      const p = typeof e?.preuve_fichier === 'string' ? lireSi(path.resolve(racine, e.preuve_fichier)) : null
      if (!p) continue
      for (const a of p.match(EMAIL) || []) if (!a.toLowerCase().endsWith('@presti-test.invalid')) d.push(`preuve de ${e.etape} : adresse non fictive ${a.replace(/^[^@]+/, '…')}`)
      if (TELEPHONE.test(p)) d.push(`preuve de ${e.etape} : un numéro de téléphone`)
    }
  })
  await C('EN-3', (d) => {
    if (!vivant('demande')) return
    if (demande.type !== 'entrante') d.push(`demande de type ${json(demande.type)} (entrante attendue)`)
    if (demande.consentement?.precoche !== false) d.push('case de consentement précochée ou non renseignée')
    if (demande.consentement?.coche !== true) d.push('consentement non coché par le demandeur')
    if (!String(demande.preuve || '').trim()) d.push('preuve de la demande absente')
    if (demande.opposition !== true) d.push('moyen d\'opposition absent')
    if (demande.doublon_rejete !== true) d.push('doublon non rejeté')
    if (demande.sans_consentement_rejete !== true) d.push('demande sans consentement non rejetée')
  })
  await C('EN-4', (d) => {
    for (const [p, a, e] of [['preparation', 'accord', 'envoi'], ['preparation_2', 'accord_2', 'envoi_2']]) {
      if (vivant(p) && sha256(E[p].texte ?? '') !== E[p].empreinte) d.push(`${p} : empreinte ≠ sha256(texte) (texte modifié après calcul)`)
      if (vivant(a) && (!vivant(p) || E[a].empreinte !== E[p].empreinte)) d.push(`${a} : l'accord ne porte pas sur le texte préparé`)
      if (vivant(a) && vivant(p) && E[a].destinataire !== E[p].destinataire) d.push(`${a} : destinataire différent de la préparation`)
      if (vivant(e) && (!vivant(a) || E[e].empreinte !== E[a].empreinte)) d.push(`${e} : le texte envoyé n'est pas celui de l'accord`)
    }
  })
  await C('EN-5', (d) => {
    for (const [a, e] of [['accord', 'envoi'], ['accord_2', 'envoi_2']]) {
      if (vivant(a) && E[a].portee !== 'envoi-unique') d.push(`${a} : portée ${json(E[a].portee)} (envoi-unique attendue)`)
      if (!vivant(e)) continue
      if (!vivant(a)) { d.push(`${e} sans ${a}`); continue }
      if (!(t(E[a].heure) <= t(E[e].heure))) d.push(`${e} avant ${a}`)
      if (!(t(E[e].heure) <= t(E[a].expire_le))) d.push(`${e} après l'expiration de ${a}`)
    }
    if (vivant('accord_2') && vivant('reponse') && !(t(E.accord_2.heure) > t(E.reponse.heure))) d.push('second accord avant la réponse')
  })
  await C('EN-6', (d) => {
    if (vivant('accord') && vivant('accord_2') && E.accord.id_accord === E.accord_2.id_accord) d.push('le second accord réutilise l\'id du premier')
    if (vivant('envoi') && E.envoi.id_accord !== E.accord?.id_accord) d.push('envoi sans l\'id de son accord')
    if (vivant('envoi_2') && E.envoi_2.id_accord !== E.accord_2?.id_accord) d.push('second envoi sous un autre accord que le second (accord réutilisé)')
    const ids = ['envoi', 'envoi_2'].filter(vivant).map((n) => E[n].id_accord)
    if (new Set(ids).size !== ids.length) d.push('deux envois sous le même accord')
    if (vivant('envoi_2') && vivant('reponse') && !(t(E.envoi_2.heure) > t(E.reponse.heure))) d.push('second envoi avant la réponse')
    const prouves = ['envoi', 'envoi_2'].filter((n) => E[n]?.etat === 'prouvé').length
    if (j.messages_envoyes !== prouves) d.push(`messages_envoyes = ${json(j.messages_envoyes)} (${prouves} envoi(s) prouvé(s))`)
  })
  await C('EN-7', (d) => {
    const r = demande.retiree_le
    if (r === null || r === undefined) return
    for (const n of ['envoi', 'envoi_2']) if (vivant(n) && !(t(E[n].heure) < t(r))) d.push(`${n} après le retrait de la demande`)
  })
  await C('EN-8', (d) => {
    // Plus de date (05/10/2026) : la recette d'un entrant ne contacte jamais à froid, quelle que soit l'heure.
    if (j.froid_ouvert !== false) d.push('froid_ouvert ≠ false')
    for (const n of ['envoi', 'envoi_2']) {
      if (!vivant(n)) continue
      if (E[n].type !== 'reponse-sollicitee') d.push(`${n} de type ${json(E[n].type)} (reponse-sollicitee attendue)`)
      if (E[n].destinataire !== demande.adresse) d.push(`${n} vers un autre destinataire que le demandeur (contact froid)`)
    }
    for (const e of etapes) if (/froid/i.test(String(e?.type ?? ''))) d.push(`étape ${e.etape} de type froid`)
  })
  await C('EN-9', (d) => {
    if (!vivant('opposition')) return
    if (!vivant('arret')) { d.push('opposition sans arrêt'); return }
    if (E.arret.envois_apres !== 0) d.push(`${json(E.arret.envois_apres)} envoi(s) après l'opposition`)
    if (E.arret.relances !== 0) d.push(`${json(E.arret.relances)} relance(s) après l'opposition`)
    for (const n of ['envoi', 'envoi_2']) if (vivant(n) && !(t(E[n].heure) < t(E.opposition.heure))) d.push(`${n} après l'opposition`)
  })
  await C('EN-10', (d) => {
    for (const p of ['preparation', 'preparation_2']) {
      if (!vivant(p)) continue
      const m = E[p].modele || {}
      if (m.fournisseur !== 'ollama-local') d.push(`${p} : fournisseur ${json(m.fournisseur)} (ollama-local seul admis pour une demande)`)
      if (/[:-]cloud$/i.test(String(m.modele ?? ''))) d.push(`${p} : modèle :cloud ${json(m.modele)}`)
      if (E[p].juge_faits !== 'ok') d.push(`${p} : juge des faits 026-065 non passé`)
    }
  })
  await C('EN-11', (d) => {
    let precedent = null
    let coupe = false
    for (const n of ETAPES) {
      const e = E[n]
      if (!e) continue
      if (!ETATS.includes(e.etat)) d.push(`${n} : état ${json(e.etat)}`)
      if (e.etat === 'prouvé') {
        const pf = String(e.preuve_fichier ?? '')
        const ident = e.id_message || e.id_accord || e.id_demande || e.heure
        const contenu = pf.startsWith('.orchestre/preuves/026-225/') && !pf.includes('..') ? lireSi(path.resolve(racine, pf)) : null
        if (!pf) d.push(`${n} « prouvé » sans preuve_fichier (une preuve brute est exigée)`)
        else if (contenu === null) d.push(`${n} : preuve ${court(pf, 60)} absente ou hors de .orchestre/preuves/026-225/`)
        else if (!contenu.trim()) d.push(`${n} : preuve ${court(pf, 60)} vide`)
        else if (!contenu.includes(String(ident))) d.push(`${n} : la preuve ne contient pas ${ident}`)
      }
      if (e.etat === 'bloqué') {
        if (e.heure !== null || (e.duree_s !== null && e.duree_s !== undefined)) d.push(`${n} bloquée avec une heure ou une durée (inventée)`)
        if (ETAPES.indexOf(n) <= ETAPES.indexOf('envoi_2')) coupe = true
        continue
      }
      if (coupe && ETAPES.indexOf(n) <= ETAPES.indexOf('envoi_2')) d.push(`${n} a lieu après une étape bloquée de la chaîne`)
      if (Number.isNaN(t(e.heure))) { d.push(`${n} : heure illisible`); continue }
      if (precedent && t(e.heure) < t(precedent.heure)) d.push(`${n} avant ${precedent.etape}`)
      if (typeof e.duree_s === 'number') {
        const attendu = precedent ? (t(e.heure) - t(precedent.heure)) / 1000 : 0
        if (e.duree_s !== attendu) d.push(`${n} : durée ${e.duree_s} s ≠ ${attendu} s mesurées entre les heures (durée inventée)`)
      } else if (e.duree_s !== null && e.duree_s !== undefined) d.push(`${n} : durée ${json(e.duree_s)}`)
      precedent = e
    }
    const v = j.verdict
    const ecartsOk = Array.isArray(j.ecarts) && j.ecarts.length > 0 && j.ecarts.every((x) => String(x?.ecart || '').trim() && String(x?.reprise || '').trim())
    if (v === 'démontré') { if (etapes.some((e) => e?.etat !== 'prouvé')) d.push('verdict « démontré » avec des étapes simulées ou bloquées') }
    else if (v === 'pratiquement prêt') { if (!ecartsOk) d.push('« pratiquement prêt » sans écart concret ni chemin de reprise') }
    else if (v === 'bloqué') { if (!etapes.some((e) => e?.etat === 'bloqué') || !ecartsOk) d.push('« bloqué » sans étape bloquée ou sans écart nommé') }
    else d.push(`verdict ${json(v)} (démontré, pratiquement prêt ou bloqué attendu)`)
  })
  await C('EN-12', (d) => {
    const prose = texte.replace(/```json[ \t]+recette-entrant[\s\S]*?```/g, '')
    if (!prose.includes(String(j.verdict))) d.push(`la prose ne porte pas le verdict « ${j.verdict} »`)
    if (j.verdict === 'démontré') return
    for (const [quoi, i] of proclamations(prose)) d.push(`la prose annonce « ${quoi} » sans verdict « démontré » (…${court(prose.slice(Math.max(0, i - 30), i + quoi.length + 10), 70)}…)`)
  })
}

// ── Douleurs ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const SOURCES_DOULEURS = [
  { id: 'src-01', type: 'support', date: '2026-08-04T09:00:00.000Z', probleme: 'devis-illisible-mobile', nombre: 3, gravite: 2, extrait: 'Le client jean.essai@presti-test.invalid trouve le devis illisible sur téléphone', source: 'support/essai-01' },
  { id: 'src-02', type: 'devis_echec', date: '2026-08-11T09:00:00.000Z', probleme: 'devis-illisible-mobile', nombre: 2, gravite: 2, extrait: 'Deux devis ouverts sur mobile puis abandonnés', source: 'mesure/devis-essai' },
  { id: 'src-03', type: 'alerte', date: '2026-08-15T09:00:00.000Z', probleme: 'site-lent', nombre: null, gravite: 3, extrait: 'Alerte de lenteur, rappeler au 06 12 34 56 78', source: 'alertes/essai-03' },
  { id: 'src-04', type: 'abandon', date: '2026-08-20T09:00:00.000Z', probleme: 'inscription-abandonnee', nombre: 5, gravite: 1, extrait: 'Abandons à l\'étape du SIREN', source: 'mesure/inscription-essai' },
  { id: 'src-05', type: 'reponse_client', date: '2026-08-22T09:00:00.000Z', probleme: 'facture-sans-logo', nombre: 1, gravite: 1, extrait: 'Une cliente fictive veut son logo sur la facture', source: 'support/essai-05' },
  { id: 'src-06', type: 'support', date: '2026-08-25T09:00:00.000Z', probleme: 'rappel-oublie', nombre: 2, gravite: 1, extrait: 'Rappels de rendez-vous non reçus', source: 'support/essai-06' },
  { id: 'src-07', type: 'support', date: '2026-06-02T09:00:00.000Z', probleme: 'ancienne-panne', nombre: 9, gravite: 3, extrait: 'Panne de juin, déjà corrigée', source: 'support/essai-07' },
]
const RETENUES = new Set(['src-01', 'src-02', 'src-03', 'src-04', 'src-05', 'src-06'])
async function jugerDouleurs(mod, C) {
  const fabriquer = () => {
    const c = { ecritures: 0, lectures: 0, classer: [] }
    const m = new Map()
    const magasin = { lire: async (k) => { c.lectures++; return m.has(k) ? structuredClone(m.get(k)) : null }, ecrire: async (k, v) => { c.ecritures++; m.set(k, structuredClone(v)) } }
    const classer = async (extraits) => { c.classer.push(structuredClone(extraits)); return [{ probleme: 'devis-illisible-mobile', confiance: 0.8 }, { probleme: 'probleme-invente', confiance: 0.99 }] }
    return { c, m, magasin, classer }
  }
  const passe = (x, mois, sources = SOURCES_DOULEURS) => mod.passeMensuelle({ mois, sources: structuredClone(sources), magasin: x.magasin, horloge: { maintenant: () => HORLOGE }, classer: x.classer })
  const x = fabriquer()
  const r = await passe(x, '2026-08')
  const rapport = r?.rapport
  const douleurs = Array.isArray(rapport?.douleurs) ? rapport.douleurs : []
  const sansRapport = (d) => { if (refuse(r) || !rapport) { d.push(`passe d'août refusée ou sans rapport : ${court(json(r), 100)}`); return true } return false }

  await C('DO-2', async (d) => {
    const y = fabriquer()
    const enCours = await passe(y, '2026-09')
    if (!refuse(enCours)) d.push('passe du mois en cours (non écoulé) acceptée')
    if (y.c.ecritures) d.push('écriture pour un mois non écoulé')
    if (sansRapport(d)) return
    if (!String(r.cle || rapport.cle || '').includes('2026-08')) d.push(`clé ${json(r.cle)} sans le mois`)
    const r2 = await passe(x, '2026-08')
    if (x.c.ecritures !== 1) d.push(`${x.c.ecritures} écriture(s) après deux passes du même mois (1 attendue)`)
    if (r2?.cle !== r.cle) d.push('la reprise ne rend pas la même clé')
    if (r2?.deja !== true) d.push('la seconde passe ne dit pas deja: true')
  })
  await C('DO-3', (d) => {
    if (sansRapport(d)) return
    if (rapport.statut !== 'mesuré') d.push(`statut ${json(rapport.statut)} (mesuré attendu)`)
    const parId = Object.fromEntries(SOURCES_DOULEURS.map((s) => [s.id, s]))
    for (const p of ['devis-illisible-mobile', 'site-lent', 'inscription-abandonnee', 'facture-sans-logo', 'rappel-oublie']) if (!douleurs.some((x) => x?.probleme === p)) d.push(`douleur ${p} absente`)
    for (const dl of douleurs) {
      const ids = Array.isArray(dl?.sources) ? dl.sources : []
      if (!ids.length) { d.push(`douleur ${dl?.probleme} sans source`); continue }
      if (ids.some((i) => !RETENUES.has(i))) d.push(`douleur ${dl.probleme} : source hors du mois ou inconnue (${ids.join(',')})`)
      const vals = ids.map((i) => parId[i]?.nombre)
      const attendu = vals.some((v) => typeof v !== 'number') ? 'non mesuré' : vals.reduce((a, b) => a + b, 0)
      if (dl.nombre !== attendu) d.push(`douleur ${dl.probleme} : nombre ${json(dl.nombre)} (${json(attendu)} attendu)`)
    }
  })
  await C('DO-4', (d) => {
    if (sansRapport(d)) return
    const dim = douleurs.find((x) => x?.probleme === 'devis-illisible-mobile')
    if (dim?.tendance !== true) d.push('deux sources concordantes : pas de tendance')
    for (const dl of douleurs) if ((dl?.sources || []).length < 2 && dl?.tendance === true) d.push(`${dl.probleme} : une seule source promue en tendance`)
  })
  await C('DO-5', (d) => {
    if (sansRapport(d)) return
    if (json(douleurs).includes('src-07') || douleurs.some((x) => x?.probleme === 'ancienne-panne')) d.push('source de juin comptée dans la passe d\'août')
    if (json(rapport.propositions).includes('src-07') || json(rapport.propositions).includes('ancienne-panne')) d.push('proposition fondée sur une source périmée')
  })
  await C('DO-6', async (d) => {
    for (const [quoi, sources] of [['juillet sans source', SOURCES_DOULEURS], ['aucune source', []]]) {
      const y = fabriquer()
      const v = await passe(y, '2026-07', sources)
      if (refuse(v) || v?.rapport?.statut !== 'rien de mesuré') d.push(`${quoi} : statut ${json(v?.rapport?.statut ?? v?.refus)} (« rien de mesuré » attendu)`)
      if ((v?.rapport?.douleurs || []).length || (v?.rapport?.propositions || []).length) d.push(`${quoi} : douleur ou proposition inventée`)
    }
  })
  await C('DO-7', (d) => {
    if (sansRapport(d)) return
    const p = Array.isArray(rapport.propositions) ? rapport.propositions : null
    if (!p) { d.push('propositions absentes'); return }
    if (!p.length) d.push('aucune proposition alors que des douleurs sont mesurées')
    if (p.length > 3) d.push(`${p.length} propositions (3 au plus)`)
    for (const x of p) {
      if (!Array.isArray(x?.preuve) || !x.preuve.length || x.preuve.some((i) => !RETENUES.has(i))) d.push(`proposition « ${court(x?.titre, 40)} » : preuve absente ou hors du mois`)
      for (const k of ['hypothese', 'garde', 'prochain_essai']) if (!String(x?.[k] || '').trim()) d.push(`proposition « ${court(x?.titre, 40)} » sans ${k}`)
      if (x?.cout?.estime !== true) d.push(`proposition « ${court(x?.titre, 40)} » : coût non marqué comme estimé`)
      if (!Array.isArray(x?.validation) || !x.validation.includes('claude-code')) d.push(`proposition « ${court(x?.titre, 40)} » sans validation claude-code`)
    }
  })
  await C('DO-8', (d) => {
    if (sansRapport(d)) return
    const t = json(rapport)
    if ((t.match(EMAIL) || []).length || TELEPHONE.test(t)) d.push('le rapport porte une adresse ou un téléphone')
    const envoye = json(x.c.classer)
    if ((envoye.match(EMAIL) || []).length || TELEPHONE.test(envoye)) d.push('le classeur reçoit une adresse ou un téléphone (extraits non anonymisés)')
    if (!x.c.classer.length) d.push('le classeur n\'a jamais été consulté (annotation attendue)')
  })
  await C('DO-9', async (d) => {
    if (sansRapport(d)) return
    if (json(douleurs).includes('probleme-invente') || json(rapport.propositions).includes('probleme-invente')) d.push('le classeur a créé une douleur absente des sources')
    const y = fabriquer()
    const v = await mod.passeMensuelle({ mois: '2026-08', sources: structuredClone(SOURCES_DOULEURS), magasin: y.magasin, horloge: { maintenant: () => HORLOGE }, classer: async () => { throw new Error('classeur indisponible (essai)') } })
    if (refuse(v) || v?.rapport?.statut !== 'mesuré') d.push('classeur indisponible : la passe échoue au lieu de se passer de lui')
  })
}

// ── Expérience ───────────────────────────────────────────────────────────────────────────────────────────────────────
async function jugerExperience(mod, C) {
  const OBJ = 'réduire de 20 % les abandons de devis sur mobile (essai)'
  const VENTE_OK = { id: 'vente-essai-001', statut: 'encaisse', confirme: true, test: false, source: 'stripe:evt_essai_001 (fictif)', montant: 490 }
  const VENTES_KO = [{ id: 'devis-essai-1', statut: 'devis', confirme: false, test: false, source: 'devis:essai' }, { id: 'cmd-essai-2', statut: 'en_attente', confirme: false, test: false, source: 'commande:essai' },
    { id: 'test-essai-3', statut: 'encaisse', confirme: true, test: true, source: 'stripe:test' }, { id: 'sans-source-4', statut: 'encaisse', confirme: true, test: false, source: null },
    { id: 'non-confirme-5', statut: 'encaisse', confirme: false, test: false, source: 'stripe:evt_essai_non_confirme' },
    { id: 'confirmation-absente-6', statut: 'encaisse', test: false, source: 'stripe:evt_essai_sans_confirmation' },
    // « non test » se prouve comme « confirmé » : un indicateur absent n'est pas un non.
    { id: 'indicateur-test-absent-7', statut: 'encaisse', confirme: true, source: 'stripe:evt_essai_sans_indicateur_test' }]
  const demande = (plus = {}) => ({ id: 'exp-essai-001', version: 1, source: 'douleurs-2026-08', objectif: OBJ, metrique: { nom: 'taux_abandon_devis_mobile', depart: 0.4 }, horizon_jours: 30,
    population: 'artisans fictifs du bac d\'essai', seuil_arret: 'abandon > 0,5 deux jours de suite', cout_max_eur: 0, touche: ['clients'],
    accord_benj: { id: 'accord-essai-exp-001', objectif: OBJ, date: ISO(HORLOGE) }, ...plus })
  const fabriquer = (ventes = [VENTE_OK], froid) => {
    const c = { ev: [], ecritures: 0, drapeaux: 0 }
    const m = new Map()
    const deps = {
      ventes: async () => structuredClone(ventes),
      magasin: { lire: async (k) => (m.has(k) ? structuredClone(m.get(k)) : null), ecrire: async (k, v) => { c.ecritures++; m.set(k, structuredClone(v)) } },
      horloge: { maintenant: () => HORLOGE },
      evenements: { emettre: async (e) => { c.ev.push(e) } },
      drapeaux: { basculer: async () => { c.drapeaux++ } },
    }
    if (froid !== undefined) deps.froid_ouvert = froid
    return { c, m, deps }
  }
  await C('EX-2', async (d) => {
    // Chaque vente non conforme est éprouvée SEULE (un seul critère en défaut), puis toutes ensemble, puis aucune vente.
    for (const [quoi, ventes] of [...VENTES_KO.map((v) => [`seule vente : ${v.id}`, [v]]), ['devis, attente, test, sans source, non confirmée ou sans indicateur', VENTES_KO], ['aucune vente', []]]) {
      const x = fabriquer(ventes)
      const r = await mod.lancerExperience(demande(), x.deps)
      if (!refuse(r)) d.push(`${quoi} : lancement accepté`)
      if (x.c.ev.length || x.c.ecritures) d.push(`${quoi} : ${x.c.ev.length} événement(s), ${x.c.ecritures} écriture(s) avant le refus`)
    }
  })
  await C('EX-3', async (d) => {
    const x = fabriquer()
    const r = await mod.lancerExperience(demande(), x.deps)
    if (refuse(r) || !['en cours', 'approuvée'].includes(r?.experience?.etat)) d.push(`vente confirmée et accord : ${court(json(r?.experience?.etat ?? r?.refus), 60)} (en cours ou approuvée attendue)`)
    if (x.c.ev.filter((e) => e?.type === 'demarrage').length !== 1) d.push(`${x.c.ev.length} événement(s) de démarrage (1 attendu)`)
    const y = fabriquer()
    const s = await mod.lancerExperience(demande({ accord_benj: undefined }), y.deps)
    if (refuse(s) || s?.experience?.etat !== 'proposée') d.push(`sans accord de Benj : ${json(s?.experience?.etat ?? s?.refus)} (proposée attendue)`)
    if (y.c.ev.length) d.push('sans accord de Benj : événement émis')
    const z = fabriquer()
    const a = await mod.lancerExperience(demande({ accord_benj: { id: 'accord-essai-autre', objectif: 'un autre objectif', date: ISO(HORLOGE) } }), z.deps)
    if (z.c.ev.length || (!refuse(a) && a?.experience?.etat !== 'proposée')) d.push('accord sur un autre objectif pris pour un accord')
  })
  await C('EX-4', async (d) => {
    for (const [quoi, plus] of [['sans seuil d\'arrêt', { seuil_arret: undefined }], ['sans coût maximum', { cout_max_eur: undefined }], ['sans horizon', { horizon_jours: undefined }],
      ['hypothèse sans source', { source: 'intuition' }], ['sans métrique', { metrique: undefined }], ['sans population', { population: undefined }]])
    {
      const x = fabriquer()
      const r = await mod.lancerExperience(demande(plus), x.deps)
      if (!refuse(r)) d.push(`${quoi} : accepté`)
      if (x.c.ev.length || x.c.ecritures) d.push(`${quoi} : événement ou écriture avant le refus`)
    }
  })
  await C('EX-5', async (d) => {
    // Plus de date (05/10/2026) : seul un interrupteur envoi_froid OUVERT (froid_ouvert() === true) autorise une expérience « froid ».
    // Chaque cas où il ne l'est pas, ou pas prouvé, refuse : service absent, faux, non booléen, panne, et même avec une horloge très lointaine.
    const LOIN = Date.parse('2030-01-15T10:00:00.000Z')
    for (const [quoi, froid, horloge] of [
      ['service absent', undefined, HORLOGE], ['service absent, horloge en 2030', undefined, LOIN], ['interrupteur fermé', async () => false, HORLOGE],
      ['interrupteur fermé, horloge en 2030', async () => false, LOIN], ['réponse « oui » (non booléen)', async () => 'oui', LOIN], ['réponse 1 (non booléen)', async () => 1, LOIN],
      ['réponse objet', async () => ({ ouvert: true }), LOIN], ['service en panne', async () => { throw new Error('base injoignable') }, LOIN], ['service non fonction', true, LOIN],
    ]) {
      const x = fabriquer(undefined, froid)
      if (horloge !== HORLOGE) x.deps.horloge = { maintenant: () => horloge }
      const r = await mod.lancerExperience(demande({ id: 'exp-essai-froid', touche: ['froid', 'messages'] }), x.deps)
      if (!refuse(r)) d.push(`expérience touchant le froid acceptée (${quoi})`)
      if (x.c.ev.length || x.c.ecritures) d.push(`${quoi} : ${x.c.ev.length} événement(s), ${x.c.ecritures} écriture(s) avant le refus`)
    }
    // Une expérience qui ne touche pas au froid n'est pas bloquée par l'interrupteur fermé.
    const y = fabriquer(undefined, async () => false)
    const s = await mod.lancerExperience(demande({ id: 'exp-essai-sans-froid', touche: ['clients'] }), y.deps)
    if (refuse(s)) d.push("une expérience sans portée « froid » est refusée à cause de l'interrupteur fermé")
  })
  await C('EX-6', async (d) => {
    const x = fabriquer()
    await mod.lancerExperience(demande(), x.deps)
    const r2 = await mod.lancerExperience(demande(), x.deps)
    if (x.c.ev.length !== 1) d.push(`même id deux fois : ${x.c.ev.length} événement(s) (1 attendu)`)
    if (x.m.size !== 1) d.push(`même id deux fois : ${x.m.size} enregistrement(s) (1 attendu)`)
    if (refuse(r2)) d.push('la reprise identique est refusée au lieu d\'être reconnue')
  })
  await C('EX-7', async (d) => {
    const x = fabriquer()
    await mod.lancerExperience(demande(), x.deps)
    const r = await mod.lancerExperience(demande({ objectif: 'doubler les devis signés (essai)' }), x.deps)
    if (!refuse(r)) d.push('objectif modifié accepté sans nouvel accord')
    if (x.c.ev.length !== 1) d.push(`${x.c.ev.length} événement(s) après un objectif modifié (1 attendu)`)
  })
  await C('EX-8', async (d) => {
    for (const [quoi, mesure] of [['mesure absente', null], ['valeur absente', { valeur: null, source: 'mesure fictive' }], ['mesure sans source', { valeur: 0.2, source: null }]]) {
      const x = fabriquer()
      await mod.lancerExperience(demande(), x.deps)
      const r = await mod.conclureExperience({ id: 'exp-essai-001', mesure }, x.deps)
      const e = r?.experience
      if (!e || e.conclusion !== 'non mesuré') d.push(`${quoi} : conclusion ${json(e?.conclusion ?? r?.refus)} (« non mesuré » attendu)`)
      if (e?.succes === true || /succ[eè]s/i.test(String(e?.conclusion ?? ''))) d.push(`${quoi} : succès proclamé`)
      if (e && e.etat !== 'arrêtée') d.push(`${quoi} : état ${json(e.etat)} (arrêtée attendue)`)
      if (x.c.drapeaux) d.push(`${quoi} : drapeau basculé`)
    }
  })
  await C('EX-9', async (d) => {
    const x = fabriquer()
    await mod.lancerExperience(demande(), x.deps)
    const r = await mod.conclureExperience({ id: 'exp-essai-001', mesure: { valeur: 0.3, source: 'mesure fictive (essai)', periode: '2026-09' } }, x.deps)
    const b = r?.experience?.bilan
    if (!b || !b.observation || !b.inference || !b.decision) d.push('bilan sans observation, inférence et décision séparées')
    if (r?.experience?.etat !== 'conclue') d.push(`état ${json(r?.experience?.etat)} (conclue attendue)`)
    if (x.c.drapeaux) d.push(`${x.c.drapeaux} drapeau(x) basculé(s) par le bilan`)
  })
}

// ════════════════════════════════════════════ juger ═══════════════════════════════════════════════════════════════════
function verdictDe(id) {
  const lignes = (lireSi(path.join(DEPOT, '.orchestre', 'verdicts.jsonl')) || '').split(/\r?\n/).filter(Boolean)
  let dernier = null
  for (const l of lignes) { try { const v = JSON.parse(l); if (v?.id === id) dernier = v } catch { /* ligne illisible */ } }
  const fait = existe(path.join(DEPOT, '.orchestre', 'fait', `${id}.md`))
  return { ok: !!(dernier && dernier.verdict === 'PASS' && dernier.dossier === 'fait' && fait), dernier, fait }
}

const JUGES = { openclaw: jugerOpenclaw, cursor: jugerCursor, firecrawl: jugerFirecrawl, fish: jugerFish, douleurs: jugerDouleurs, experience: jugerExperience }
const EXPORTS = {
  openclaw: ['configuration', 'preparerLancement', 'lancer', 'sortieAutorisee', 'choisirModele'],
  cursor: ['evaluerVoie', 'accepterTache', 'controlerAction', 'reprendre', 'terminerReprise', 'ligneJournal'],
  firecrawl: ['lireAvecFirecrawl'],
  fish: ['choisirVoix'],
  douleurs: ['passeMensuelle'],
  experience: ['lancerExperience', 'conclureExperience'],
}

async function jugerPartie(partie, racine, reel) {
  const P = PREFIXE[partie]
  const fichier = path.resolve(racine, FICHIER[partie])
  const { resultats, C } = critereur(partie)
  const avant = EFFETS.length
  const restants = async (quoi) => { for (const [id] of CRITERES[partie]) if (!resultats.some((r) => r.id === id)) await C(id, (d) => d.push(`non jugé : ${quoi}`)) }
  if (reel) {
    await C(`${P}-0`, (d) => {
      for (const id of DEPENDANCES[partie]) {
        const v = verdictDe(id)
        if (!v.ok) d.push(`dépendance ${id} non PASS (${v.dernier ? `${v.dernier.verdict} en ${v.dernier.dossier}` : 'aucun verdict'}${v.fait ? '' : ', absente de fait/'}) : ${FICHE[partie]} reste en attente`)
      }
    })
    resultats.at(-1).nom = `dépendances PASS (${DEPENDANCES[partie].join(', ')})`
  }
  if (!existe(fichier)) {
    await C(`${P}-1`, (d) => d.push(`${versSlash(FICHIER[partie])} absent (${FICHE[partie]} non livrée)`))
    await restants(`implémentation absente (${P}-1)`)
    return { partie, fichier: versSlash(FICHIER[partie]), resultats }
  }
  if (partie === 'entrant') {
    const texte = lireSi(fichier) || ''
    await C('EN-1', (d) => { if (!texte.trim()) d.push('compte rendu vide') })
    if (!texte.trim()) { await restants('compte rendu vide (EN-1)'); return { partie, fichier: versSlash(FICHIER[partie]), resultats } }
    resultats.pop()
    await jugerEntrant(texte, C, racine)
    return { partie, fichier: versSlash(FICHIER[partie]), resultats }
  }
  let mod = null
  await C(`${P}-1`, async (d) => {
    try { mod = await import(`${pathToFileURL(fichier).href}?juge=${ALEA}`) } catch (e) { d.push(`import impossible : ${court(e?.message || e, 160)}`); return }
    for (const k of EXPORTS[partie]) if (typeof mod[k] !== 'function') d.push(`export ${k} absent ou non fonction`)
    if (partie === 'openclaw' && typeof mod.configuration === 'function') { try { const c = mod.configuration(); if (!c || typeof c !== 'object') d.push('configuration() ne rend pas un objet') } catch (e) { d.push(`configuration() lève : ${court(e.message, 80)}`) } }
    if (partie === 'fish' && mod.VOIX_LOCALE !== 'ff_siwis') d.push(`VOIX_LOCALE = ${json(mod.VOIX_LOCALE)} (ff_siwis attendu)`)
  })
  if (!resultats.at(-1).ok) { await restants(`${P}-1 rouge`); return { partie, fichier: versSlash(FICHIER[partie]), resultats } }
  try { await JUGES[partie](mod, C) } catch (e) { await C(`${P}-X`, (d) => d.push(`le juge s'est arrêté : ${court(e?.message || e, 160)}`)) }
  await restants('le juge s\'est arrêté avant')
  const effets = EFFETS.slice(avant)
  const ir = resultats.findIndex((r) => r.id === `${P}-R`)
  if (ir >= 0) resultats.splice(ir, 1)
  await C(`${P}-R`, (d) => { for (const e of effets.slice(0, 6)) d.push(`${e.type} ${e.detail}`); if (effets.length > 6) d.push(`… ${effets.length - 6} autre(s)`) })
  return { partie, fichier: versSlash(FICHIER[partie]), resultats }
}

async function juger(parties, racine, rapportChemin) {
  process.chdir(DEPOT)
  await import(pathToFileURL(path.join(DEPOT, 'scripts', 'ts-loader.mjs')).href)
  barrer()
  fs.mkdirSync(TRAVAIL, { recursive: true })
  const reel = path.resolve(racine) === path.resolve(DEPOT)
  console.log(`# ${NOM} — racine ${reel ? 'du dépôt (dépendances exigées)' : versSlash(path.relative(DEPOT, racine) || racine) + ' (essai)'} · horloge figée ${ISO(HORLOGE)} · hors réseau`)
  const sortie = { juge: NOM, version: 1, racine: versSlash(racine), reel, horloge: ISO(HORLOGE), parties: {}, rouges: [], code: 0 }
  for (const p of parties) {
    const r = await jugerPartie(p, racine, reel)
    console.log(`\n## ${p} — ${r.fichier} (${FICHE[p]})`)
    for (const c of r.resultats) {
      console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.id} ${c.nom}${c.ok ? '' : ` — ${c.details[0]}`}`)
      for (const x of c.details.slice(1, 6)) console.log(`  ✗ ${c.id} ${x}`)
    }
    sortie.parties[p] = { fichier: r.fichier, fiche: FICHE[p], criteres: r.resultats }
    for (const c of r.resultats) if (!c.ok) sortie.rouges.push(c.id)
  }
  sortie.code = sortie.rouges.length ? 1 : 0
  const n = Object.values(sortie.parties).reduce((a, p) => a + p.criteres.length, 0)
  console.log(`\nverdict : ${sortie.code ? 'FAIL' : 'PASS'} — ${parties.length} partie(s), ${n - sortie.rouges.length}/${n} critère(s) vert(s)${sortie.rouges.length ? ` ; rouges : ${sortie.rouges.slice(0, 12).join(', ')}${sortie.rouges.length > 12 ? '…' : ''}` : ''}`)
  console.log(`code de sortie : ${sortie.code}`)
  if (rapportChemin) { fs.mkdirSync(path.dirname(rapportChemin), { recursive: true }); fs.writeFileSync(rapportChemin, JSON.stringify(sortie, null, 2)) }
  return sortie.code
}

// ════════════════════════════════════════════ --preuve-echecs ═════════════════════════════════════════════════════════
// [critère attendu rouge, fichier du témoin (relatif à temoin/), texte exact, remplacement, remplacer toutes les occurrences]
const SABOTAGES = [
  ['OC-8', 'presti/scripts/usine/openclaw/lanceur.mjs', 'if (NOM_CLAUDE.test(nom)) return refus(', 'if (false && NOM_CLAUDE.test(nom)) return refus('],
  ['OC-8', 'presti/scripts/usine/openclaw/lanceur.mjs', 'const envConteneur = Object.fromEntries(noms.map((n) => [n, env[n]]))', 'const envConteneur = { ...env }'],
  ['OC-5', 'presti/scripts/usine/openclaw/lanceur.mjs', 'for (const v of c.volumes || []) if (!sourceNommee(v.source))', 'for (const v of c.volumes || []) if (false && !sourceNommee(v.source))'],
  ['OC-9', 'presti/scripts/usine/openclaw/lanceur.mjs', 'return config.sorties.some((s) => sortieAdmissible(s) && new URL(s.url).origin === u.origin)', "return u.protocol === 'https:' || config.sorties.some((s) => sortieAdmissible(s) && new URL(s.url).origin === u.origin)"],
  ['OC-11', 'presti/scripts/usine/openclaw/lanceur.mjs', "if (donnees !== 'publique') {", "if (donnees !== 'publique' && disponibles['ollama-local']) {"],
  ['OC-12', 'presti/scripts/usine/openclaw/lanceur.mjs', 'if (p.refus) { deps.journal?.(`refus ${p.refus}`); return p }', "if (p.refus) { deps.journal?.(`refus ${p.refus}`); await deps.docker(['run', String(config.image)], {}); return p }"],
  // Contre-vérification de 026-220 (27/09) : chaque trou prouvé par sabotage a désormais le sien.
  // H1 — le prospect part vers Ollama Cloud sous un nom SANS suffixe (API directe d'ollama.com) : seul le champ voie le dit.
  ['OC-11', 'presti/scripts/usine/openclaw/lanceur.mjs', "if (donnees !== 'publique') {", "if (donnees !== 'publique') {\n    if (disponibles['ollama-cloud']) return { fournisseur: 'ollama', modele: 'gpt-oss:120b', voie: 'ollama-cloud' }"],
  // H1 — le modèle cloud déclaré est rendu sous l'étiquette ollama-local : le modèle doit être l'un des modèles LOCAUX déclarés.
  ['OC-11', 'presti/scripts/usine/openclaw/lanceur.mjs', "    if (disponibles['ollama-local'] && locaux.length) return { ...locaux[0], voie: 'ollama-local' }\n    return refus('donnees_prospect'", "    if (disponibles['ollama-cloud'] && nuages.length) return { ...nuages[0], voie: 'ollama-local' }\n    return refus('donnees_prospect'"],
  // H1 — une préférence (cloud ou freellmapi) emmène la donnée de prospect hors d'Ollama local.
  ['OC-11', 'presti/scripts/usine/openclaw/lanceur.mjs', "if (donnees !== 'publique') {", "if (prefere) return { ...prefere, voie: prefere.voie || 'ollama-cloud' }\n  if (donnees !== 'publique') {"],
  // Même cause que H1, relevée à la reprise : une donnée NON CLASSÉE (classe absente ou inconnue) suit la voie publique
  // et part vers Ollama Cloud quand Ollama local manque. Seul 'publique' ouvre le cloud.
  ['OC-11', 'presti/scripts/usine/openclaw/lanceur.mjs', "if (donnees !== 'publique') {", "if (donnees === 'prospect') {"],
  // Modèle déclaré sans voie : le nom seul ne dit pas où partent les données.
  ['OC-10', 'presti/scripts/usine/openclaw/lanceur.mjs', "{ fournisseur: 'ollama', modele: 'gpt-oss:120b', voie: 'ollama-cloud' },", "{ fournisseur: 'ollama', modele: 'gpt-oss:120b' },"],
  // H2 — tout hôte interne en http accepté (localhost:*, 192.168.x, 10.x, noms de service docker).
  ['OC-9', 'presti/scripts/usine/openclaw/lanceur.mjs', 'return config.sorties.some((s) => sortieAdmissible(s) && new URL(s.url).origin === u.origin)', "return (u.protocol === 'http:' && interne(u.hostname)) || config.sorties.some((s) => sortieAdmissible(s) && new URL(s.url).origin === u.origin)"],
  // OC-12 — un refus (port hors localhost) qui ouvre une connexion : absent des six fautes d'origine, pris par la boucle élargie.
  ['OC-12', 'presti/scripts/usine/openclaw/lanceur.mjs', 'if (p.refus) { deps.journal?.(`refus ${p.refus}`); return p }', "if (p.refus) { deps.journal?.(`refus ${p.refus}`); if (p.refus === 'port_expose') await deps.connecter('http://127.0.0.1:18789/'); return p }"],
  ['OC-7', 'presti/scripts/usine/openclaw/lanceur.mjs', "for (const p of c.ports || []) if (p.hote !== '127.0.0.1')", 'for (const p of c.ports || []) if (false)'],
  ['OC-3', 'presti/scripts/usine/openclaw/lanceur.mjs', "if (!c.utilisateur || /^(root|0)(:|$)/.test(String(c.utilisateur))) return refus(", 'if (!c.utilisateur) return refus('],
  ['OC-10', 'presti/scripts/usine/openclaw/lanceur.mjs', "const modeleAdmis = (m) => FOURNISSEURS.includes(m?.fournisseur) && !MODELE_CLAUDE.test(String(m?.modele || ''))", "const modeleAdmis = (m) => !!m?.fournisseur"],
  ['CU-2', 'orchestre/bin/cursor.mjs', "const cout = typeof tarif?.cout_par_tache === 'number' ? tarif.cout_par_tache : 'non mesuré'", "const cout = typeof tarif?.cout_par_tache === 'number' ? tarif.cout_par_tache : 0"],
  // H7 — le PASS d'un autre juge active la voie.
  ['CU-2', 'orchestre/bin/cursor.mjs', "if (temoin?.juge !== '026-220' || temoin?.verdict !== 'PASS')", "if (temoin?.verdict !== 'PASS')"],
  // H3 — hôte comparé par sous-chaîne, puis par suffixe : sosies et sous-domaines du registre passeraient.
  ['CU-6', 'orchestre/bin/cursor.mjs', 'if (!(tache.reseau || []).includes(hote))', 'if (!(tache.reseau || []).some((h) => hote.includes(h)))'],
  ['CU-6', 'orchestre/bin/cursor.mjs', 'if (!(tache.reseau || []).includes(hote))', 'if (!(tache.reseau || []).some((h) => hote.endsWith(h)))'],
  ['CU-4', 'orchestre/bin/cursor.mjs', "if (dans(c, tache.interdit)) return refus('interdit'", "if (false && dans(c, tache.interdit)) return refus('interdit'"],
  ['CU-4', 'orchestre/bin/cursor.mjs', 'const c = normaliser(cible)', "const c = String(cible).replace(/\\\\/g, '/')"],
  ['CU-7', 'orchestre/bin/cursor.mjs', "{ flag: 'wx' }", "{ flag: 'w' }"],
  ['CU-6', 'orchestre/bin/cursor.mjs', '/\\bgit\\s+(reset\\s+--hard|clean\\b|restore\\b|stash\\b|checkout\\s+--|revert\\b)/i,', '/\\bgit\\s+(revert\\b)/i,'],
  ['CU-5', 'orchestre/bin/cursor.mjs', "/(^|[\\/\\s\"'])presti-secrets([\\/\\s\"']|$)/i, ", ''],
  ['CU-3', 'orchestre/bin/cursor.mjs', "const SENSIBLES = ['argent', 'securite', 'droits', 'cerveau']", "const SENSIBLES = ['argent']"],
  ['CU-8', 'orchestre/bin/cursor.mjs', "consommation: typeof consommation === 'number' ? consommation : 'non mesuré'", 'consommation: consommation ?? 0'],
  ['FC-3', 'presti/lib/agents/lectureFirecrawl.ts', "if (robotsInterdit(robots, u.pathname + u.search)) return { refus: 'robots' }", "if (false && robotsInterdit(robots, u.pathname + u.search)) return { refus: 'robots' }"],
  ['FC-3', 'presti/lib/agents/lectureFirecrawl.ts', "if (robots === null || robots === undefined) return { refus: 'robots_inconnu' }", "if (robots === undefined) return { refus: 'robots_inconnu' }"],
  ['FC-4', 'presti/lib/agents/lectureFirecrawl.ts', 'c.plafond > PLAFOND_CAHIER', 'c.plafond > 100000'],
  ['FC-4', 'presti/lib/agents/lectureFirecrawl.ts', 'if (c.consommes + cout > c.plafond) return', 'if (c.consommes + cout > PLAFOND_CAHIER) return'],
  ['FC-4', 'presti/lib/agents/lectureFirecrawl.ts', "if (typeof c.consommes !== 'number' || !c.date || !c.source) return 'mesure_absente'", "if (typeof c.consommes !== 'number') return 'mesure_absente'"],
  ['FC-6', 'presti/lib/agents/lectureFirecrawl.ts', "if (r.statut === 429) return parRepli(url, '429', deps)", "if (r.statut === 429) return { refus: 'quota_firecrawl' }"],
  ['FC-5', 'presti/lib/agents/lectureFirecrawl.ts', 'const source = meta.sourceURL || meta.url', 'const source = meta.sourceURL || meta.url || url'],
  ['FC-7', 'presti/lib/agents/lectureFirecrawl.ts', "if (!hotePublic(source) || neutre(new URL(source).hostname) !== neutre(u.hostname)) return { refus: 'redirection' }", "if (!/^https?:/.test(source)) return { refus: 'redirection' }"],
  ['FC-2', 'presti/lib/agents/lectureFirecrawl.ts', "if (!hotePublic(url) || COMPTE.test(new URL(url).pathname)) return { refus: 'hote' }", "if (!/^https?:/.test(url)) return { refus: 'hote' }"],
  ['FC-8', 'presti/lib/agents/lectureFirecrawl.ts', "if (PERSONNEL.test(demande.requete)) return { refus: 'donnee_personnelle' }", "if (false) return { refus: 'donnee_personnelle' }"],
  ['FC-9', 'presti/lib/agents/lectureFirecrawl.ts', '    texte,\n    url_finale: source,', '    texte,\n    cle_utilisee: deps.cle,\n    url_finale: source,'],
  ['FC-R', 'presti/lib/agents/lectureFirecrawl.ts', "    r = await deps.firecrawl('scrape',", "    await fetch('https://api.firecrawl.dev/v1/scrape', { method: 'POST' }).catch(() => null)\n    r = await deps.firecrawl('scrape',"],
  ['FA-2', 'presti/lib/studio/voixFish.ts', "  if (d.usage === 'usage_commercial') {", "  if (d.usage === 'usage_commercial' && (await deps.sonder()).statut !== 200) {"],
  ['FA-4', 'presti/lib/studio/voixFish.ts', "const solde = typeof q?.solde === 'number' ? q.solde : null", "const solde = typeof q?.solde === 'number' ? q.solde : 1e9"],
  // H4 — un solde positif mais inférieur au besoin passe pour suffisant.
  ['FA-4', 'presti/lib/studio/voixFish.ts', "if (solde < besoin) return 'quota_epuise'", "if (solde <= 0) return 'quota_epuise'"],
  ['FA-5', 'presti/lib/studio/voixFish.ts', "if (!r.expire_le || Date.parse(r.expire_le) <= deps.horloge.maintenant()) return 'licence_expiree'", "if (!r.expire_le) return 'licence_expiree'"],
  ['FA-9', 'presti/lib/studio/voixFish.ts', "fournisseur: 'local', voix: VOIX_LOCALE,", "fournisseur: 'fish', voix: VOIX_LOCALE,"],
  ['FA-7', 'presti/lib/studio/voixFish.ts', '        await deps.credits.restituer(d.id)\n', ''],
  ['FA-6', 'presti/lib/studio/voixFish.ts', '  if (deja) return deja', '  if (false && deja) return deja'],
  ['FA-8', 'presti/lib/studio/voixFish.ts', "if (d.voix_clonee && !(d.droit_clonage?.accorde && d.droit_clonage.source && d.droit_clonage.date)) return { refus: 'clonage' }", "if (d.voix_clonee && d.droit_clonage === false) return { refus: 'clonage' }"],
  ['FA-3', 'presti/lib/studio/voixFish.ts', "publiable: d.usage === 'usage_commercial', date,", 'publiable: true, date,'],
  ['FA-10', 'presti/lib/studio/voixFish.ts', 'source_texte: d.source_texte, credits: besoin }', 'source_texte: d.source_texte, credits: besoin, cle: deps.cle }'],
  ['FA-11', 'presti/lib/studio/voixFish.ts', "  if (!deps.cle) return 'cle_absente'\n", ''],
  ['EN-4', 'presti/docs/agents/recette-entrant-2026-09-27.md', 'maquette-001', 'maquette-002'],
  ['EN-4', 'presti/docs/agents/recette-entrant-2026-09-27.md', '"id_message": "msg-essai-001",\n      "destinataire": "artisan.essai@presti-test.invalid",\n      "empreinte": "', '"id_message": "msg-essai-001",\n      "destinataire": "artisan.essai@presti-test.invalid",\n      "empreinte": "f'],
  ['EN-5', 'presti/docs/agents/recette-entrant-2026-09-27.md', '"expire_le": "2026-09-27T10:40:00.000Z",', '"expire_le": "2026-09-27T10:11:00.000Z",'],
  ['EN-7', 'presti/docs/agents/recette-entrant-2026-09-27.md', '"retiree_le": null', '"retiree_le": "2026-09-27T10:11:00.000Z"'],
  ['EN-8', 'presti/docs/agents/recette-entrant-2026-09-27.md', '"froid_ouvert": false,', '"froid_ouvert": true,'],
  ['EN-8', 'presti/docs/agents/recette-entrant-2026-09-27.md', '"id_message": "msg-essai-002",\n      "destinataire": "artisan.essai@presti-test.invalid",', '"id_message": "msg-essai-002",\n      "destinataire": "voisin.essai@presti-test.invalid",'],
  ['EN-6', 'presti/docs/agents/recette-entrant-2026-09-27.md', '"id_accord": "acc-essai-002",\n      "id_message": "msg-essai-002"', '"id_accord": "acc-essai-001",\n      "id_message": "msg-essai-002"'],
  ['EN-10', 'presti/docs/agents/recette-entrant-2026-09-27.md', '"modele": "qwen3:8b"', '"modele": "gpt-oss:120b-cloud"', true],
  ['EN-11', 'presti/docs/agents/recette-entrant-2026-09-27.md', '"verdict": "pratiquement prêt",', '"verdict": "démontré",'],
  ['EN-11', 'presti/docs/agents/recette-entrant-2026-09-27.md', '"duree_s": 1080,', '"duree_s": 60,'],
  ['EN-9', 'presti/docs/agents/recette-entrant-2026-09-27.md', '"relances": 0', '"relances": 1'],
  ['EN-11', 'presti/docs/agents/recette-entrant-2026-09-27.md', '"etape": "envoi",\n      "etat": "simulé",', '"etape": "envoi",\n      "etat": "prouvé",'],
  ['EN-11', 'presti/.orchestre/preuves/026-225/demande-essai.txt', 'dem-essai-001', 'dem-essai-999'],
  ['EN-2', 'presti/.orchestre/preuves/026-225/demande-essai.txt', 'adresse artisan.essai@presti-test.invalid', 'adresse artisan.essai@example.org'],
  ['EN-3', 'presti/docs/agents/recette-entrant-2026-09-27.md', '"precoche": false,', '"precoche": true,'],
  ['EN-2', 'presti/docs/agents/recette-entrant-2026-09-27.md', 'Toutes les personnes et adresses sont fictives', 'Contact : artisan.reel@example.com. Toutes les personnes et adresses sont fictives'],
  ['EN-12', 'presti/docs/agents/recette-entrant-2026-09-27.md', '## Étapes', 'La voie entrante est prête pour les clients.\n\n## Étapes'],
  // H6 — d'autres mots que « prêt » proclament le succès.
  ['EN-12', 'presti/docs/agents/recette-entrant-2026-09-27.md', '## Étapes', 'La voie entrante est opérationnelle pour les clients.\n\n## Étapes'],
  ['EN-12', 'presti/docs/agents/recette-entrant-2026-09-27.md', '## Étapes', 'Le parcours fonctionne de bout en bout.\n\n## Étapes'],
  ['EN-12', 'presti/docs/agents/recette-entrant-2026-09-27.md', "n’est pas encore opérationnelle", 'est opérationnelle'],
  ['DO-2', 'presti/scripts/chef/douleurs.mjs', '  if (deja) return { cle, deja: true, rapport: deja }', '  if (false && deja) return { cle, deja: true, rapport: deja }'],
  ['DO-2', 'presti/scripts/chef/douleurs.mjs', "if (horloge.maintenant() < fin) return { refus: 'mois_non_ecoule' }", "if (horloge.maintenant() < debut) return { refus: 'mois_non_ecoule' }"],
  ['DO-3', 'presti/scripts/chef/douleurs.mjs', "nombre: g.nombres.includes(null) ? 'non mesuré' : g.nombres.reduce((x, y) => x + y, 0),", 'nombre: g.nombres.reduce((x, y) => x + (y || 0), 0),'],
  ['DO-5', 'presti/scripts/chef/douleurs.mjs', 'if (t < debut || t >= fin) {', 'if (t >= fin) {'],
  ['DO-8', 'presti/scripts/chef/douleurs.mjs', "const anonymiser = (t) => String(t || '').replace(PERSONNEL, '[masqué]')", "const anonymiser = (t) => String(t || '')"],
  ['DO-4', 'presti/scripts/chef/douleurs.mjs', 'tendance: new Set(g.sources).size >= 2,', 'tendance: true,'],
  ['DO-6', 'presti/scripts/chef/douleurs.mjs', "statut: douleurs.length ? 'mesuré' : 'rien de mesuré',", "statut: 'mesuré',"],
  ['DO-7', 'presti/scripts/chef/douleurs.mjs', '.slice(0, 3).map((d) => ({', '.map((d) => ({'],
  ['DO-9', 'presti/scripts/chef/douleurs.mjs', '  const douleurs = [...groupes.values()].map((g) => {', '  for (const a of avis || []) if (a?.probleme && !groupes.has(a.probleme)) groupes.set(a.probleme, { probleme: a.probleme, sources: [], nombres: [], gravite: 3 })\n  const douleurs = [...groupes.values()].map((g) => {'],
  ['EX-2', 'presti/scripts/chef/lancer-experience.mjs', "const vente = (ventes || []).find((v) => v?.statut === 'encaisse' && v.confirme === true && v.test === false && v.source)", 'const vente = (ventes || []).find((v) => v?.source)'],
  // H5 — un encaissement non confirmé (ou sans confirmation) débloque le lancement.
  ['EX-2', 'presti/scripts/chef/lancer-experience.mjs', "v?.statut === 'encaisse' && v.confirme === true && v.test === false && v.source", "v?.statut === 'encaisse' && v.test === false && v.source"],
  ['EX-2', 'presti/scripts/chef/lancer-experience.mjs', "v?.statut === 'encaisse' && v.confirme === true && v.test === false && v.source", "v?.statut === 'encaisse' && v.confirme !== false && v.test === false && v.source"],
  // Même cause que H5, relevée à la reprise : un indicateur « test » absent passe pour « non test ».
  ['EX-2', 'presti/scripts/chef/lancer-experience.mjs', "v?.statut === 'encaisse' && v.confirme === true && v.test === false && v.source", "v?.statut === 'encaisse' && v.confirme === true && v.test !== true && v.source"],
  ['EX-8', 'presti/scripts/chef/lancer-experience.mjs', "const arretee = { ...e, etat: 'arrêtée', conclusion: 'non mesuré', succes: false, suspendue: true }", "const arretee = { ...e, etat: 'conclue', conclusion: 'succès', succes: true, suspendue: false }"],
  ['EX-6', 'presti/scripts/chef/lancer-experience.mjs', '    return { deja: true, experience: existante }', "    await deps.evenements.emettre({ type: 'demarrage', id: d.id, a_sec: true })\n    return { deja: true, experience: existante }"],
  ['EX-5', 'presti/scripts/chef/lancer-experience.mjs', "if ((d.touche || []).includes('froid') && !(await froidOuvert(deps))) return { refus: 'froid_ferme' }", "if (false) return { refus: 'froid_ferme' }"],
  // Sabotages de la règle sans date : ouvrir sur un service absent, sur une réponse non booléenne, sur une panne ou sur la seule horloge.
  ['EX-5', 'presti/scripts/chef/lancer-experience.mjs', "return typeof deps.froid_ouvert === 'function' && (await deps.froid_ouvert()) === true", "return typeof deps.froid_ouvert !== 'function' || (await deps.froid_ouvert()) === true"],
  ['EX-5', 'presti/scripts/chef/lancer-experience.mjs', "return typeof deps.froid_ouvert === 'function' && (await deps.froid_ouvert()) === true", "return typeof deps.froid_ouvert === 'function' && !!(await deps.froid_ouvert())"],
  ['EX-5', 'presti/scripts/chef/lancer-experience.mjs', "} catch { return false }", "} catch { return true }"],
  ['EX-5', 'presti/scripts/chef/lancer-experience.mjs', "return typeof deps.froid_ouvert === 'function' && (await deps.froid_ouvert()) === true", "return deps.horloge.maintenant() > Date.UTC(2026, 9, 5) || (typeof deps.froid_ouvert === 'function' && (await deps.froid_ouvert()) === true)"],
  ['EX-3', 'presti/scripts/chef/lancer-experience.mjs', 'const accord = d.accord_benj && d.accord_benj.id && d.accord_benj.objectif === d.objectif ? d.accord_benj : null', "const accord = d.accord_benj || { id: 'implicite', objectif: d.objectif }"],
  ['EX-4', 'presti/scripts/chef/lancer-experience.mjs', "const CHAMPS = ['id', 'version', 'source', 'objectif', 'population', 'seuil_arret']", "const CHAMPS = ['id', 'version', 'objectif']"],
  ['EX-7', 'presti/scripts/chef/lancer-experience.mjs', "if (existante.objectif !== d.objectif || existante.version !== d.version) return { refus: 'nouvel_accord', raison: 'objectif ou version modifiés' }", ''],
  ['EX-9', 'presti/scripts/chef/lancer-experience.mjs', "      decision: 'recommandation soumise à Benj ; aucun drapeau ni prix modifié',", "      decision: (await deps.drapeaux?.basculer?.(), 'drapeau basculé'),"],
]
const PARTIE_DE = (id) => Object.entries(PREFIXE).find(([, p]) => id.startsWith(`${p}-`))?.[0]

function enfant(args) {
  const garder = /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|TMPDIR|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|COMSPEC|PATHEXT|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE|OS)$/i
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => garder.test(k)))
  env.FORCE_COLOR = '0'
  const r = cp.spawnSync(process.execPath, [SCRIPT, ...args], { cwd: DEPOT, encoding: 'utf8', env, timeout: 180_000, windowsHide: true, maxBuffer: 32 * 1024 * 1024 })
  return { code: r.status ?? (r.error ? 127 : 1), sortie: `${r.stdout || ''}${r.stderr || ''}`, erreur: r.error?.message }
}
const lireRapport = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const rougeDans = (rap, id) => {
  if (!rap?.parties) return false
  return Object.values(rap.parties).some((p) => (p.criteres || []).some((c) => c.id === id && c.ok === false))
}

async function preuveEchecs() {
  const debut = Date.now()
  const echecs = []
  const sorties = []
  nettoyer(TRAVAIL)
  fs.mkdirSync(TRAVAIL, { recursive: true })
  const racines = path.join(TRAVAIL, 'racines')
  const rapports = path.join(TRAVAIL, 'rapports')
  fs.mkdirSync(racines, { recursive: true }); fs.mkdirSync(rapports, { recursive: true })

  console.log(`# ${NOM} --preuve-echecs (026-220) — horloge figée ${ISO(HORLOGE)}, hors réseau dans chaque juge`)
  console.log('\n# dépendances de 026-220')
  for (const id of DEPENDANCES_220) {
    const v = verdictDe(id)
    console.log(`${v.ok ? 'PASS' : 'FAIL'} ${id} ${v.ok ? 'PASS en fait/' : `non PASS (${v.dernier ? `${v.dernier.verdict} en ${v.dernier.dossier}` : 'aucun verdict'})`}`)
    if (!v.ok) echecs.push(`dépendance ${id} non PASS`)
  }

  console.log('\n# témoin : les sept parties vertes (scripts/fixtures/026-completude/temoin/)')
  const tem = path.join(racines, 'temoin')
  fs.cpSync(TEMOIN, tem, { recursive: true })
  const fTem = path.join(rapports, 'temoin.json')
  const rt = enfant([`--partie=${PARTIES.join(',')}`, `--racine=${path.join(tem, 'presti')}`, `--rapport=${fTem}`])
  sorties.push(rt.sortie)
  const rapTem = lireRapport(fTem)
  const nbTem = {}
  if (rt.code !== 0) echecs.push(`témoin : code ${rt.code} (0 attendu)`)
  if (!rapTem) echecs.push('témoin : rapport JSON absent')
  else {
    if (rapTem.code !== 0 || rapTem.rouges.length) echecs.push(`témoin rouge sur ${rapTem.rouges.join(', ')}`)
    for (const p of PARTIES) {
      const cr = rapTem.parties?.[p]?.criteres || []
      nbTem[p] = cr.length
      const manquants = CRITERES[p].map(([id]) => id).filter((id) => !cr.some((c) => c.id === id && c.ok === true))
      if (manquants.length) echecs.push(`témoin ${p} : critère(s) non verts ou absents : ${manquants.join(', ')}`)
      if (!SABOTAGES.some((s) => PARTIE_DE(s[0]) === p)) echecs.push(`partie ${p} sans faute injectée`)
    }
  }
  console.log(`${rt.code === 0 && rapTem && !rapTem.rouges.length ? 'PASS' : 'FAIL'} témoin — code ${rt.code}, ${rapTem ? Object.values(rapTem.parties).reduce((a, p) => a + p.criteres.filter((c) => c.ok).length, 0) : 0} critère(s) vert(s) sur ${PARTIES.map((p) => `${p} ${nbTem[p] ?? 0}`).join(', ')}`)
  if (rapTem?.rouges?.length) for (const p of PARTIES) for (const c of rapTem.parties[p]?.criteres || []) if (!c.ok) console.log(`  ✗ ${c.id} ${c.details[0]}`)

  console.log('\n# état d\'avant : racine sans aucune implémentation → chaque partie rouge sur sa présence')
  const vide = path.join(racines, 'vide', 'presti')
  fs.mkdirSync(vide, { recursive: true })
  const fVide = path.join(rapports, 'vide.json')
  const rv = enfant([`--racine=${vide}`, `--rapport=${fVide}`])
  sorties.push(rv.sortie)
  const rapVide = lireRapport(fVide)
  const presences = PARTIES.map((p) => `${PREFIXE[p]}-1`)
  const presentsRouges = presences.filter((id) => rougeDans(rapVide, id))
  const okVide = rv.code === 1 && presentsRouges.length === presences.length && PARTIES.every((p) => (rapVide?.parties?.[p]?.criteres || []).every((c) => c.ok === false))
  if (!okVide) echecs.push(`état d'avant : code ${rv.code}, présence rouge ${presentsRouges.length}/${presences.length}, un critère vert sans implémentation ?`)
  console.log(`${okVide ? 'PASS' : 'FAIL'} état d'avant — code ${rv.code}, ${presentsRouges.join(', ')} rouges, aucun critère vert sans implémentation`)

  console.log('\n# dépôt réel (dépendances exigées) : rouge tant qu\'une fiche de production manque')
  const fReel = path.join(rapports, 'depot.json')
  const rr = enfant([`--rapport=${fReel}`])
  sorties.push(rr.sortie)
  const rapReel = lireRapport(fReel)
  const etatReel = []
  for (const p of PARTIES) {
    const absent = !existe(path.resolve(DEPOT, FICHIER[p]))
    const rouge = (rapReel?.parties?.[p]?.criteres || []).some((c) => !c.ok)
    etatReel.push(`${p} ${rouge ? 'rouge' : 'vert'}${absent ? ' (absent)' : ''}`)
    if (absent && !rouge) echecs.push(`dépôt réel : ${p} vert alors que ${FICHIER[p]} est absent`)
  }
  if (!rapReel) echecs.push('dépôt réel : rapport JSON absent')
  console.log(`${rapReel ? 'PASS' : 'FAIL'} dépôt réel — code ${rr.code} : ${etatReel.join(' ; ')}`)

  console.log(`\n# sabotages du témoin : ${SABOTAGES.length}, chacun doit rendre code 1 avec SON critère rouge (lu dans le rapport JSON)`)
  const tableau = []
  for (const [n, [id, rel, avantTxt, apresTxt, tous]] of SABOTAGES.entries()) {
    const partie = PARTIE_DE(id)
    const d = path.join(racines, `sabotage-${String(n + 1).padStart(2, '0')}`)
    fs.cpSync(TEMOIN, d, { recursive: true })
    const f = path.join(d, rel)
    const t = lireSi(f)
    let res = { id, rel, partie, ok: false, code: null, rouges: [], note: '' }
    // Une copie extraite avec des fins de ligne CRLF (core.autocrlf) garde des sabotages valides.
    const crlf = t !== null && t.includes('\r\n')
    const av = crlf ? avantTxt.replace(/\r?\n/g, '\r\n') : avantTxt
    const ap = crlf ? apresTxt.replace(/\r?\n/g, '\r\n') : apresTxt
    const nb = t === null ? 0 : t.split(av).length - 1
    if (t === null) res.note = `${rel} absent du témoin`
    else if (nb < 1) res.note = `texte à saboter introuvable : « ${court(avantTxt, 70)} »`
    else if (nb > 1 && !tous) res.note = `texte à saboter présent ${nb} fois`
    else {
      fs.writeFileSync(f, tous ? t.split(av).join(ap) : t.replace(av, () => ap))
      const fr = path.join(rapports, `sabotage-${n + 1}.json`)
      const r = enfant([`--partie=${partie}`, `--racine=${path.join(d, 'presti')}`, `--rapport=${fr}`])
      sorties.push(r.sortie)
      const rap = lireRapport(fr)
      res.code = r.code
      res.rouges = rap?.rouges || []
      res.ok = r.code === 1 && rap?.code === 1 && rougeDans(rap, id)
      if (!rap) res.note = 'rapport JSON absent'
      else if (!res.ok) res.note = `critère ${id} ${rougeDans(rap, id) ? 'rouge' : 'VERT'}, code ${r.code}`
    }
    nettoyer(d)
    tableau.push({ ...res, avant: avantTxt, apres: apresTxt })
    console.log(`${res.ok ? 'PASS' : 'FAIL'} sabotage ${String(n + 1).padStart(2, '0')} → ${id} (${partie}) : code ${res.code ?? '—'}, rouges ${court(res.rouges.join(','), 60) || '—'}${res.note ? ` — ${res.note}` : ''}`)
    if (!res.ok) echecs.push(`sabotage ${n + 1} (${id}) non détecté : ${res.note}`)
  }

  console.log('\n# secrets : aucun faux secret ESSAI- dans les sorties et rapports des juges')
  const textes = [...sorties, ...fs.readdirSync(rapports).map((f) => lireSi(path.join(rapports, f)) || '')]
  const fuitesVues = textes.filter((x) => MOTIF_SECRET.test(x.replace(/ESSAI-\[secret\]/g, ''))).length
  if (fuitesVues) echecs.push(`${fuitesVues} sortie(s) ou rapport(s) portent un faux secret`)
  console.log(`${fuitesVues ? 'FAIL' : 'PASS'} ${textes.length} sortie(s) et rapport(s) relus, ${fuitesVues} fuite(s)`)

  // Preuves (écrites même en échec : elles disent pourquoi).
  fs.mkdirSync(PREUVE, { recursive: true })
  if (rapTem) fs.writeFileSync(path.join(PREUVE, 'rapport-temoin.json'), JSON.stringify(rapTem, null, 2))
  const parPartie = PARTIES.map((p) => `${p} ${tableau.filter((x) => x.partie === p && x.ok).length}/${tableau.filter((x) => x.partie === p).length}`).join(' · ')
  const md = [
    '# 026-220 — échecs attendus du juge de complétude (`scripts/juges-026-completude-qa.mjs --preuve-echecs`)',
    '',
    `Produit le ${new Date().toISOString()} ; horloge des juges figée au ${ISO(HORLOGE)} ; chaque juge tourne hors réseau (fetch, http(s), http2, net, tls, dgram, dns, child_process et Worker coupés et comptés ; lecture de .env*, presti-secrets, .ssh, .claude refusée).`,
    'Les deux sens se lisent au **code de sortie** et au **rapport JSON** de chaque juge enfant, jamais au texte qu\'il imprime.',
    '',
    '## Contrôles',
    '',
    `- Dépendances de 026-220 (${DEPENDANCES_220.join(', ')}) : ${DEPENDANCES_220.map((id) => `${id} ${verdictDe(id).ok ? 'PASS' : 'NON PASS'}`).join(', ')}.`,
    `- Témoin (\`scripts/fixtures/026-completude/temoin/\`, implémentation de référence jamais déployée) : code ${rt.code}, ${rapTem ? `${rapTem.rouges.length} critère(s) rouge(s)` : 'rapport absent'} ; critères par partie : ${PARTIES.map((p) => `${p} ${nbTem[p] ?? 0}`).join(', ')}.`,
    `- État d'avant (racine vide) : code ${rv.code} ; présence rouge ${presentsRouges.length}/${presences.length} ; aucun critère vert sans implémentation : ${okVide ? 'oui' : 'NON'}.`,
    `- Dépôt réel, dépendances exigées (code ${rr.code}) : ${etatReel.join(' ; ')}.`,
    `- Sabotages détectés : ${tableau.filter((x) => x.ok).length}/${tableau.length} (${parPartie}).`,
    `- Faux secrets retrouvés dans ${textes.length} sorties et rapports : ${fuitesVues}.`,
    '',
    '## Budget de fichiers (6 annoncés)',
    '',
    'Neuf fichiers : le juge, un témoin par partie (sept : le lanceur OpenClaw porte sa configuration, le compte rendu entrant porte son journal) et la preuve brute fictive de l\'étape « demande » du témoin entrant, qui exerce le chemin « prouvé ». La leçon du 26/09 exige un témoin qui sache être vert pour chaque partie jugée ; les preuves sont écrites par le juge.',
    '**Dépassement NON couvert par la fiche** (budget 6) : à acter par la session principale, dans la fiche ou dans l\'INDEX. Les témoins ne se regroupent pas sans perdre leur rôle : chacun se trouve au chemin exact que le juge charge pour sa partie.',
    '',
    '## Règle « clés lues dans presti-secrets, jamais affichées »',
    '',
    '- **Jamais affichées** : prouvé ici (OC-8, OC-12, OC-13, FC-9, FA-10, FA-11 ; faux secrets ESSAI- tirés à chaque passage et cherchés dans chaque sortie). CU-5 prouve que l\'adaptateur Cursor ne lit aucun secret.',
    '- **Lues dans presti-secrets** : NON jugé ici. Le juge injecte les clés (deps.cle, paramètre env) et refuse lui-même toute lecture de presti-secrets. La règle est inscrite au contrat de 026-221 à 026-224 (`--contrat`) et se juge dans ces fiches, sur le câblage appelant (critère statique ou `--reel` propre à la fiche).',
    '',
    '## Contre-vérification du 27/09 : chaque trou a son cas et son sabotage',
    '',
    '- H1 (OC-11) : voie ollama-local et modèle local déclaré exigés ; préférences cloud et freellmapi éprouvées ; sabotages « cloud sans suffixe », « modèle cloud étiqueté local » et « préférence suivie ». Même cause, relevée à la reprise : une donnée non classée reste fermée.',
    '- H2 (OC-9) : toute origine absente de configuration().sorties rend false, hôtes internes compris ; sabotage « tout hôte interne en http ».',
    '- H3 (CU-6) : sosies, sous-domaine et identifiants dans l\'URL refusés ; sabotages « sous-chaîne » et « suffixe ».',
    '- H4 (FA-4, FA-7) : solde positif inférieur au besoin → ff_siwis, aucune réservation au-delà du solde ; sabotage « solde <= 0 ».',
    '- H5 (EX-2) : chaque condition du verrou éprouvée seule ; sabotages « confirme ignoré » et « confirme absent accepté ». Même cause, relevée à la reprise : indicateur test absent.',
    '- H6 (EN-12) : lexique élargi (opérationnel, fonctionne, en service, livré, terminé, déployé, prêt à l\'emploi) ; seule la négation qui porte sur le mot excuse.',
    '- H7 (CU-2) : PASS d\'un autre juge ou sans juge nommé → voie inactive.',
    '- OC-12 : chaque mutation refusée par OC-2 à OC-9 repasse par lancer(), sans docker ni connexion, avec le même code de refus.',
    '',
    '## Sabotages du témoin',
    '',
    '| n° | critère attendu | fichier du témoin | code | rouges observés | verdict |',
    '|---|---|---|---|---|---|',
    ...tableau.map((x, i) => `| ${i + 1} | ${x.id} | \`${x.rel}\` | ${x.code ?? '—'} | ${court(x.rouges.join(', '), 90) || '—'} | ${x.ok ? 'détecté' : `NON DÉTECTÉ ${x.note}`} |`),
    '',
    '## Remplacements appliqués (texte exact → remplacement)',
    '',
    ...tableau.map((x, i) => `${i + 1}. **${x.id}** — \`${court(x.avant.replace(/\n/g, '⏎'), 150).replace(/`/g, 'ˋ')}\` → \`${court(x.apres.replace(/\n/g, '⏎'), 150).replace(/`/g, 'ˋ') || '(supprimé)'}\``),
    '',
    `## Verdict : ${echecs.length ? `ÉCHEC — ${echecs.length} écart(s)` : 'PASS'}`,
    '',
    ...(echecs.length ? echecs.map((e) => `- ${e}`) : ['Témoin vert sur les sept parties, état d\'avant rouge, chaque sabotage rouge sur son critère, aucune fuite.']),
    '',
  ].join('\n')
  fs.writeFileSync(path.join(PREUVE, 'echecs-attendus.md'), purger(md))
  nettoyer(TRAVAIL)

  const duree = Math.round((Date.now() - debut) / 1000)
  console.log(`\n${echecs.length ? '✗' : '✓'} preuve des échecs : ${echecs.length ? `${echecs.length} écart(s) — ${court(echecs.join(' ; '), 300)}` : `témoin ${Object.values(nbTem).reduce((a, b) => a + b, 0)} critères verts, état d'avant rouge, ${tableau.length}/${tableau.length} sabotages rouges sur leur critère, 0 fuite`} · ${duree} s · .orchestre/preuves/026-220/echecs-attendus.md`)
  console.log(`verdict : ${echecs.length ? 'FAIL' : 'PASS'}`)
  console.log(`code de sortie : ${echecs.length ? 1 : 0}`)
  return echecs.length ? 1 : 0
}

// ════════════════════════════════════════════ entrée ══════════════════════════════════════════════════════════════════
const CONNUS = ['partie', 'racine', 'rapport', 'preuve-echecs', 'contrat', 'reel', 'aide']
const opts = {}
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([\w-]+)(?:=(.*))?$/)
  if (!m || !CONNUS.includes(m[1])) { console.error(`✗ ${NOM} : argument inconnu « ${a} » (attendus : --partie=, --racine=, --rapport=, --preuve-echecs, --contrat[=partie])`); process.exit(2) }
  opts[m[1]] = m[2] ?? true
}
if (opts.aide) { console.log(fs.readFileSync(SCRIPT, 'utf8').split('\nimport ')[0]); process.exit(0) }
if (opts.reel) { console.error(`✗ ${NOM} : pas de partie --reel. Installation, clés et envois réels relèvent des fiches 026-221 à 026-227 et de leurs gestes ; ce juge reste hors réseau.`); process.exit(2) }
if (opts.contrat) {
  const quelles = opts.contrat === true ? PARTIES : String(opts.contrat).split(',')
  for (const p of quelles) { if (!CONTRATS[p]) { console.error(`✗ partie inconnue « ${p} »`); process.exit(2) } console.log(`## ${p}\n${CONTRATS[p]}\n`) }
  process.exit(0)
}
if (opts['preuve-echecs']) process.exit(await preuveEchecs())
const parties = opts.partie && opts.partie !== true ? String(opts.partie).split(',').map((x) => x.trim()).filter(Boolean) : PARTIES
for (const p of parties) if (!PARTIES.includes(p)) { console.error(`✗ ${NOM} : partie inconnue « ${p} » (attendues : ${PARTIES.join(', ')})`); process.exit(2) }
const racine = opts.racine && opts.racine !== true ? path.resolve(process.cwd(), String(opts.racine)) : DEPOT
const rapport = opts.rapport && opts.rapport !== true ? path.resolve(process.cwd(), String(opts.rapport)) : null
process.exit(await juger(parties, racine, rapport))
