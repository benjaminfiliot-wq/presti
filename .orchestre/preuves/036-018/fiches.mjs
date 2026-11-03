// 036-018 — écrit les cinq fiches `outillage/gabarits/ent-{operations,administratif,finance,apres-vente,direction}.md` : les listes (nœuds, tables, API, voies, espaces à remplir)
// sont TIRÉES DES EXPORTS, jamais recopiées à la main ; seuls les textes d'explication sont écrits ici.
//   node .orchestre/preuves/036-018/fiches.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const SORTIE = path.resolve(ICI, '../../../plans/011-cadrage-01-11/p6-signature/outillage/gabarits')
fs.mkdirSync(SORTIE, { recursive: true })
const charge = (n) => JSON.parse(fs.readFileSync(path.join(ICI, `${n}.workflow.json`), 'utf8'))
const court = (t) => t.replace('n8n-nodes-base.', '').replace('@n8n/n8n-nodes-langchain.', 'langchain.')
const aretes = (wf, nom) => Object.entries(wf.connections?.[nom] ?? {}).flatMap(([genre, l]) => (l ?? []).flatMap((s, i) => (s ?? []).map((x) => ({ vers: x.node, genre, sortie: i }))))

function faits(wf) {
  const noeuds = wf.nodes
  const parType = {}
  for (const n of noeuds) parType[court(n.type)] = (parType[court(n.type)] ?? 0) + 1
  const tables = { lues: new Set(), ecrites: new Set(), modifiees: new Set() }
  const hotes = new Set()
  for (const n of noeuds.filter((x) => x.type === 'n8n-nodes-base.httpRequest')) {
    const u = new URL(n.parameters.url), m = String(n.parameters.method).toUpperCase()
    if (u.host.includes('supabase')) (m === 'GET' ? tables.lues : m === 'POST' ? tables.ecrites : tables.modifiees).add(u.pathname.split('/').pop())
    else hotes.add(`${m} ${u.host}${u.pathname}`)
  }
  const agents = noeuds.filter((n) => n.type.endsWith('.agent')).map((a) => {
    const entrants = noeuds.flatMap((n) => aretes(wf, n.name).filter((x) => x.vers === a.name).map((x) => ({ ...x, n })))
    return { nom: a.name, outils: entrants.filter((x) => x.genre === 'ai_tool').map((x) => x.n.name), modele: entrants.filter((x) => x.genre === 'ai_languageModel').map((x) => x.n.name)[0], parseur: entrants.filter((x) => x.genre === 'ai_outputParser').map((x) => x.n.name)[0] }
  })
  const voies = (wf.nodes.find((n) => n.name === 'Quel effet ?')?.parameters.rules.values ?? []).map((v) => v.outputKey)
  const types = new Set(); const reservees = []
  for (const n of noeuds.filter((x) => x.name === 'Décider les effets')) for (const m of n.parameters.jsCode.matchAll(/poser\('([a-z_]+)', '([a-z_]+)'/g)) types.add(`${m[2]} → voie ${m[1]}`)
  for (const m of noeuds.find((x) => x.name === 'Décider les effets').parameters.jsCode.matchAll(/poser\(([^,]+), '([a-z_]+)'/g)) types.add(`${m[2]} → voie ${m[1].replace(/'/g, '')}`)
  const espaces = new Set()
  for (const n of noeuds.filter((x) => x.type !== 'n8n-nodes-base.code')) for (const m of JSON.stringify(n.parameters).matchAll(/\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b/g)) if (!/^(HTTP|JSON|GET|POST|PATCH|PULL_FROM_URL|MEDIA_UPLOAD|LAST_30_DAYS)/.test(m[1])) espaces.add(m[1])
  const codes = noeuds.filter((n) => n.type === 'n8n-nodes-base.code').map((n) => n.name)
  const portes = noeuds.filter((n) => /porte: simulation/.test(n.notes ?? '')).map((n) => n.name)
  return { n: noeuds.length, parType, tables, hotes, agents, voies, types, espaces, codes, portes, outilsNatifs: noeuds.filter((n) => /^n8n-nodes-base\./.test(n.type) && !/(code|if|set|switch|merge|filter|noOp|stickyNote|httpRequest|stopAndError|scheduleTrigger)$/.test(n.type)).map((n) => `${n.name} (${court(n.type)} ${n.typeVersion})`) }
}
const liste = (a) => [...a].map((x) => `\`${x}\``).join(', ') || '—'
const puces = (a) => [...a].map((x) => `- ${x}`).join('\n')

const COMMUN_REGLES = `## Ce que le gabarit ne fait JAMAIS (tenu par le juge \`scripts/gabarits-entreprise-2-qa.mjs\`)

- Aucun identifiant, même celui de la base : la copie du client branche les siens après son accord écrit et le « go » de Benj (OUTILLAGE.md § 4, O3) ; un agent n'en crée jamais.
- Aucun déclencheur à webhook : n8n d'Oracle n'est pas exposé (OUTILLAGE.md § 3). Les canaux à webhook (WhatsApp, Messenger, Instagram, SMS, page publique) arrivent chez la plateforme, qui les range en base ; n8n les relit.
- Aucun appel au modèle, aucune écriture, aucun envoi sans passer par la sortie « faux » d'une porte « simulation » (R15). Sans configuration lisible, c'est la simulation.
- Aucun montant, aucun score, aucune date limite écrit par le modèle : le schéma strict du modèle n'en a pas, le nœud Code qui revalide calcule (R18).
- Aucune donnée d'une autre organisation : chaque lecture et chaque écriture porte \`organisation_id\`, et chaque ligne lue est re-contrôlée dans le code (R14, C6).
- Aucun nom de la plateforme dans un message pour un tiers (marque blanche) ; la mention de l'assistant (« Message rédigé et envoyé automatiquement par l'assistant de … ») est en pied de tout texte du modèle qui part.
- Aucune écriture dans la banque ni dans la compta du client : Qonto, Pennylane, QuickBooks, Xero et Stripe ne sont lus qu'en lecture ; l'export au comptable est un fichier.
- Un effet n'a lieu qu'une fois : sa clé d'idempotence est réservée dans \`entreprise_actions\` AVANT l'effet ; un rejeu ou un plantage ne double rien.`

const COMMUN_AUTONOMIE = `## L'autonomie, type d'action par type d'action (annexe d'autonomie du contrat, p6:440)

Le nœud « Décider les effets » lit \`entreprise_autonomie\` (un niveau par \`type_action\`) :
- **niveau 1** : *préparer* — une carte « brouillon » dans la plateforme, rien ne sort ;
- **niveau 2** (**défaut pour tout type absent de l'annexe** : « par défaut, tout commence en carte à valider », \`kit/annexe-autonomie.md\`) : une carte **« À valider »** ; le membre du bon périmètre l'approuve (C6), puis la relève des cartes exécute l'effet sous la clé \`…:approuvee\` ;
- **niveau 3** : l'effet part seul, dans le plafond du jour de l'annexe (\`plafond_jour\`, 20 par défaut comme \`PLAFOND_AUTO_JOUR\`) **après la fenêtre d'annulation** (\`delai_annulation_min\`, 10 minutes par défaut comme le pilote automatique, \`lib/pilote/regles.ts:27\`) : c'est une carte « annulable » que la relève exécute à l'échéance, et que le membre peut annuler d'ici là. Au-delà du plafond : retour en carte.
- **Jamais en automatique, même réglé en 3** (annexe d'autonomie, « jamais en automatique », \`kit/annexe-autonomie.md\`) : prendre un rendez-vous seul (\`planifier_chantier\`), marquer une facture payée (\`solder_facture\`), créer une facture (\`facturer_chantier\`), parler au nom de l'entreprise sur un litige ou un avis négatif (\`repondre_avis_negatif\`), un point mensuel ou un bilan sans la validation d'équipe, tout prix estimé.
Seules les écritures internes (notification de l'équipe, indicateurs, import contrôlé, compteur IA) valent 3 sans annexe. Même autonomie que Signature : « pas un niveau d'autonomie différent » (p6:440).`

const ENTETE = (nom, titre, surtitre) => `# ${nom} — ${titre}

> Fiche du gabarit, écrite par la tâche 036-018 (prompt 6, outillage, lot 5 ; prompt 2, Entreprise sur mesure) le 03/11/2026. Export : \`.orchestre/preuves/036-018/${nom}.workflow.json\`.
> ${surtitre}
> **Inactif, sans identifiant, en simulation.** On le copie en \`client-<slug>-<département>\` pour chaque entreprise cliente avec **ses** comptes (OUTILLAGE.md § 4, O1) ; le premier client est l'organisation de Benj, client zéro (p6:459-466).`

function fiche(nom, spec) {
  const wf = charge(nom), f = faits(wf)
  const md = `${ENTETE(nom, spec.titre, spec.surtitre)}

## Ce qu'il fait

${spec.fait}

## Chemin d'un passage

${spec.chemin}

## Les outils (nœuds réels, ${f.n} nœuds au total)

${spec.outils}

Nœuds natifs de l'export (type et version, tirés du fichier) :
${puces(f.outilsNatifs)}

API appelées par un nœud HTTP (hôte écrit en dur, jamais calculé : R7) :
${puces(f.hotes)}

## Les agents IA (Claude, parseur à schéma strict, outils de lecture seulement)

${f.agents.map((a) => `- **${a.nom}** — modèle \`${a.modele}\`, parseur \`${a.parseur}\`, outils : ${a.outils.map((o) => `\`${o}\``).join(', ')}.`).join('\n')}

${spec.agents}

## Les tables de la plateforme (noms indicatifs : la migration est celle du lot d'intégration 036-012, pas de ce lot)

- Lues : ${liste(f.tables.lues)}
- Écrites : ${liste(f.tables.ecrites)}
- Mises à jour : ${liste(f.tables.modifiees)}

${spec.tables}

## Les types d'action (une ligne de l'annexe d'autonomie chacun)

${puces(f.types)}

## Les voies d'effet (sortie de « Quel effet ? »)

${f.voies.map((v) => `\`${v}\``).join(', ')}.

${COMMUN_AUTONOMIE}

## Organisation multi-membres (C6)

Chaque carte porte son \`perimetre\` et ses \`approbateurs_roles\`, lus dans la configuration (\`perimetres\`, \`approbateurs\`) ; la relève des cartes n'exécute une carte approuvée que si le rôle de l'approbateur est dans la liste. ${spec.equipe}

## Ce que la copie du client remplace (espaces écrits en majuscules dans l'export)

${puces([...f.espaces].sort().map((e) => `\`${e}\``))}
${spec.identifiants}

## Les essais (hors ligne, données épinglées « Exemple. », rejeu des nœuds Code par le juge)

${spec.essais}

Le rejeu est celui du **code des nœuds Code** (bac à sable \`node:vm\`), pas une exécution dans n8n : \`test_workflow\` n'a pas été joué dans ce lot (le MCP n8n n'est pas branché sur l'hôte d'agents). La sortie complète est dans \`essais-n8n.json\`.

${COMMUN_REGLES}

## Limites et points à confirmer à l'essai de lecture du client

${spec.limites}

## Sources

- Dépôts n8n lus (forme seulement, aucun JSON importé) : \`.orchestre/preuves/036-018/depots-ouverts.md\`.
- Vidéos et fiches relues : \`.orchestre/preuves/036-018/videos-lues.md\` ; \`plans/analyse-videos.md\` ; \`plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md\`.
- Nœuds : \`.orchestre/preuves/036-018/squelettes-noeuds.json\` (MCP n8n-oracle \`get_node_types\`, \`search_nodes\`) ; bonnes pratiques : \`.orchestre/preuves/036-018/bonnes-pratiques-n8n.md\`.
- Cadre : \`plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md\` § 4 à 8 ; prompt 6, § 2.1 à 2.6 (l.426-560).
`
  fs.writeFileSync(path.join(SORTIE, `${nom.replace('gabarit-', '')}.md`), md)
  return md.length
}

const SPECS = {
  'gabarit-ent-operations': {
    titre: 'Opérations (Entreprise sur mesure)',
    surtitre: 'Département 5 du § 7 de OUTILLAGE.md : Google Agenda et Outlook ; projets ClickUp, monday, Notion ; Drive et OneDrive ; Sheets et Excel.',
    fait: 'Planifie les chantiers sur l\'agenda **réel** du client, répartit les équipes, crée la tâche de projet et le dossier du chantier, et importe des lignes de tableur par un circuit contrôlé. Le **code** cherche les créneaux libres de chaque membre compétent (heures de travail du client, dix jours, jamais le week-end) ; le **modèle** ne choisit qu\'un *numéro* dans cette liste. Rien ne s\'écrit sans passer par l\'annexe d\'autonomie, et un rendez-vous n\'est **jamais** pris seul : l\'agenda ne reçoit un chantier que par une carte approuvée.',
    chemin: '1. **Entrées** : un déclencheur horaire lit, derrière la porte « simulation » de relève, l\'agenda (Google ou Outlook, par le Switch « Quel agenda ? »), l\'outil de projets (ClickUp, monday ou Notion), le tableur d\'import (Sheets ou Excel) et les chantiers à planifier posés dans la plateforme.\n2. **Normaliser** : événements (créneaux pris), tâches, chantiers, lignes d\'import. Une ligne dont le libellé manque ou dont la quantité est hors limites reçoit ses **anomalies** : elle ne s\'importera jamais.\n3. **Préparer le planning** : le code numérote, par membre, les créneaux libres ; les membres d\'une autre organisation n\'existent pas.\n4. **Porte « simulation »** : vrai → « Effets prévus ». Faux → filtre (un chantier qui n\'a qu\'une proposition n\'a pas besoin du modèle) → **Répartiteur** → revalidation (le numéro doit être dans la liste du code).\n5. **Décider les effets** → **Réserver les actions** → **Quel effet ?** → carte d\'agenda (Google ou Outlook), tâche ClickUp / monday / Notion, dossier Drive / OneDrive, ligne importée, prévenir l\'équipe → **Journaliser**.',
    outils: 'Google Agenda (lecture des créneaux, pose du rendez-vous), Outlook (idem), ClickUp, monday, Notion (lecture des tâches existantes, création), Drive et OneDrive (dossier du chantier), Sheets et Excel (lecture des lignes à importer), Slack et Teams (prévenir l\'équipe).',
    agents: 'Le **répartiteur** lit l\'agenda (disponibilités Google, événements Outlook), les tâches ClickUp, la charge de l\'équipe (Sheets) et les projets Notion ; il rend `proposition` (un entier), `motif` (une phrase). Son schéma n\'a aucun champ de date, de créneau ou de membre : le code recalcule tout depuis le numéro.',
    tables: '`entreprise_equipes` porte les membres et leur compétence ; `entreprise_chantiers` les chantiers à planifier (`statut = a_planifier`) ; `entreprise_imports` reçoit les lignes importées après le contrôle du code.',
    equipe: 'Les cartes d\'agenda vont au périmètre `planifier_chantier` de la configuration, souvent « opérations » ; chaque chef d\'équipe valide son périmètre.',
    identifiants: 'Et les identifiants : l\'agenda (Google ou Outlook), l\'outil de projets, le Drive ou le OneDrive, le tableur, Slack ou Teams, la clé du modèle, la base de la plateforme. Un seul outil par rôle : on garde la branche de son outil dans chaque Switch (« Quel agenda ? », « Quel outil de projets ? », « Quel tableur ? ») et on débranche les autres.',
    essais: '- *Le planificateur* → membre 1 occupé de 8 h à 10 h : proposé à 10 h ; membre 2 libre : proposé à 8 h ; le choix du modèle donne une carte d\'agenda « À valider », la tâche et le dossier ; plan simulé = plan réel ; un numéro hors liste ou « Presti » est rejeté.\n- *Une ligne en anomalie* → L1 importée, L2 refusée avec une carte d\'information et une alerte à l\'équipe ; la tâche déjà dans ClickUp n\'est pas recréée.\n- *Une autre organisation* → rien : ni chantier, ni membre, ni action automatique.',
    limites: '- **Fuseau** : les créneaux sont calculés en heure de Paris ; l\'agenda du client doit y être. Les horaires de travail viennent de `horaires` dans la configuration (8 h – 18 h par défaut).\n- **Un agenda commun** : un événement lu par l\'agenda du client bloque *toute* l\'équipe (`membre_ref = equipe`). Pour des agendas par membre, la copie duplique le nœud de lecture, un par agenda, et pose `membre_ref` dans « Source ».\n- Les paramètres de ClickUp (équipe, espace, liste), du classeur Sheets/Excel et de l\'événement Outlook sont à confirmer à l\'essai de lecture sur le compte du client.\n- **Deux chantiers le même jour pour le même membre** : le second reçoit une carte d\'information « conflit de créneau », jamais un double rendez-vous.',
  },
  'gabarit-ent-administratif': {
    titre: 'Administratif (Entreprise sur mesure)',
    surtitre: 'Département 6 du § 7 de OUTILLAGE.md : Drive, OneDrive, Docs, Gmail, Outlook ; prompt 2 : « pièce manquante, croise ses sources, relance qui doit le document ; échéances (assurances, attestations, contrôles) ».',
    fait: '**Pièce manquante** : le code croise les noms de fichiers (Drive ou OneDrive) et les sujets de courriers (Gmail ou Outlook) avec les pièces attendues, puis relance **qui doit le document**, trois fois au plus, à trois jours d\'écart, et **jamais sans destinataire connu** (l\'équipe est informée à la place). **Échéances** (assurances, attestations, contrôles) : posées dans l\'agenda du client avant la date, avec une relance à qui doit renouveler. **Attestations** rédigées dans Docs à partir des seuls faits du dossier.',
    chemin: '1. **Entrées** : lecture des fichiers (Switch « Quel espace de fichiers ? »), des courriers récents (Switch « Quelle boîte ? »), de l\'agenda (Switch « Quel agenda ? ») et des pièces, échéances et attestations de la plateforme.\n2. **Normaliser** puis **Croiser les sources** : une pièce est *manquante* si sa référence ne se lit nulle part ; une échéance est *proche* dans la fenêtre du client (`jours_echeance`, 30 jours par défaut) ; une relance est *due* selon le nombre et la date des précédentes.\n3. **Porte « simulation »** : vrai → « Effets prévus ». Faux → deux filtres → **Rédacteur de relances** et **Rédacteur d\'attestations** → revalidations.\n4. **Décider les effets** : relance si le destinataire est connu, événement d\'agenda si l\'échéance n\'y est pas déjà (la référence entre crochets dans le titre sert de clé), attestation dans Docs.\n5. **Quel effet ?** → carte, agenda Google ou Outlook, Docs (créer puis écrire), relance Gmail ou Outlook (puis **Noter l\'envoi**), prévenir l\'équipe → **Journaliser**.',
    outils: 'Drive et OneDrive (recherche), Gmail et Outlook (lecture des courriers, relances), Google Agenda et Outlook (échéances), Docs (attestations), Slack et Teams (prévenir l\'équipe).',
    agents: 'Le **rédacteur de relances** lit le fil de la personne (Gmail, Outlook) et le Drive ; il rend un objet et un texte, sans prix ni date. Le **rédacteur d\'attestations** lit les modèles du Drive et le registre des attestations (Sheets) ; sa revalidation exige que **chaque fait du dossier figure mot pour mot** dans le texte et qu\'**aucun nombre** n\'y paraisse qui ne soit un fait.',
    tables: '`entreprise_pieces_attendues` (pièce, libellé, destinataire connu ou non), `entreprise_echeances`, `entreprise_attestations` (faits clés), `entreprise_relances` (une ligne par envoi : le code compte et date).',
    equipe: 'Chaque type d\'action (`relance_piece`, `echeance_agenda`, `attestation_docs`) a son périmètre ; les cartes d\'information (destinataire inconnu) ne sont jamais exécutées.',
    identifiants: 'Et les identifiants : le Drive ou le OneDrive, la boîte (Gmail ou Outlook), l\'agenda, Docs, Slack ou Teams, la clé du modèle, la base de la plateforme.',
    essais: '- *Une attestation qui expire* → échéance à 10 jours : une relance de palier 1 au bon destinataire et un événement d\'agenda (plan simulé = plan réel) ; à 90 jours rien ; expirée : relancée ; trois relances faites ou une hier : aucune ; échéance déjà dans l\'agenda : pas de doublon.\n- *Une pièce manquante* → Kbis lu dans le Drive et RIB lu dans un courrier : présents ; l\'attestation de vigilance, sans destinataire connu : aucune relance, une carte d\'information.\n- *Une attestation* → un nombre inventé, un fait manquant, un prix ou « Presti » sont rejetés.\n- *Une autre organisation* → rien.',
    limites: '- La pièce est reconnue par sa **référence dans un nom de fichier ou un sujet** : la convention de nommage est à écrire avec le client. Les pièces jointes elles-mêmes ne sont pas ouvertes.\n- Les paramètres de recherche Drive (dossier des pièces), Gmail (`newer_than:60d has:attachment`) et OneDrive (`query *`) sont à confirmer à l\'essai de lecture.\n- L\'événement Outlook d\'une échéance passe par le nœud Outlook : il déclare donc le pied « mention » dans sa description.\n- Les attestations restent des **brouillons Docs** : leur envoi est un autre geste, jamais automatique.',
  },
  'gabarit-ent-finance': {
    titre: 'Finance (Entreprise sur mesure)',
    surtitre: 'Département 7 du § 7 de OUTILLAGE.md : Stripe, QuickBooks, Xero ; Pennylane, Tiime, Sage (API ou export) ; Qonto en lecture. Prompt 2 : « facturier quand c\'est fini, relanceur d\'impayés jusqu\'au paiement ou au motif, lecteur des encaissements, export au comptable ».',
    fait: 'Lit les **encaissements** (Stripe, QuickBooks, Xero, Qonto par l\'API, en lecture seule), les **rapproche** des factures de la plateforme, **arrête les relances** d\'une facture soldée, relance les autres au palier du retard, **facture un chantier terminé** avec le tarif du client et prépare l\'**export au comptable** (un fichier). **Les montants viennent du code**, en centimes entiers ; **aucune écriture bancaire ni dans la compta du client**.',
    chemin: '1. **Entrées** : Stripe / QuickBooks / Xero (Switch « Quel outil d\'encaissement ? »), Qonto, Pennylane (ce que le comptable a déjà), les factures et les chantiers terminés de la plateforme.\n2. **Normaliser** (paiements en centimes) puis **Rapprocher** : le code somme les paiements d\'une facture (par son numéro ou une référence libre), calcule le reste dû, le retard, le palier (1 : dès 1 jour ; 2 : dès 15 jours ; 3 : dès 30 jours) et chiffre les chantiers terminés.\n3. **Porte « simulation »** : vrai → « Effets prévus ». Faux → **Rédacteur d\'impayés** → revalidation.\n4. **Décider les effets** : carte « marquer payée » pour une facture soldée, relance avec le **reste dû du code**, carte de facture pour un chantier terminé, indicateur des encaissements, export du mois (les trois premiers jours).\n5. **Quel effet ?** → carte, facture en brouillon, relance Gmail ou Outlook (puis **Noter l\'envoi**), indicateur, export (CSV → fichier → Drive ou OneDrive → mail au comptable), prévenir l\'équipe → **Journaliser**.',
    outils: 'Stripe, QuickBooks, Xero (lecture), Qonto et Pennylane (API en lecture), Convertir en fichier, Drive et OneDrive (dépôt de l\'export), Gmail et Outlook (relances, envoi de l\'export), Slack et Teams. **Tiime et Sage** : pas de nœud ni d\'hôte admis par la garde commune ; ils passent par l\'export de fichier (voir les limites).',
    agents: 'Le **rédacteur d\'impayés** lit un paiement Stripe, une facture QuickBooks ou Xero et le fil de la boîte ; il rend un objet et un texte **sans montant, sans date, sans numéro de facture** : le code ajoute « Montant restant dû : … € TTC (facture …) » après son texte. Son schéma n\'a aucun champ de montant.',
    tables: '`entreprise_factures` (montant, échéance, statut, date de paiement), `entreprise_chantiers` (terminés, sans facture), `entreprise_tarifs`, `entreprise_relances`, `entreprise_indicateurs`.',
    equipe: 'Les cartes de facture et de paiement vont au périmètre « finance » ; le comptable reçoit l\'export à l\'adresse de la configuration (`courriel_comptable`).',
    identifiants: 'Et les identifiants : Stripe ou QuickBooks ou Xero (un seul, par le Switch), Qonto (jeton en lecture), Pennylane, Drive ou OneDrive, Gmail ou Outlook, Slack ou Teams, la clé du modèle, la base de la plateforme.',
    essais: '- *Un paiement lu* → F002 payée (Stripe) : soldée, plus aucune relance, une carte « marquer payée » ; F001 payée en partie (Qonto, 200 €) : reste 1 000,00 € calculé par le code (le « 999,99 » du modèle est ignoré) ; F004 déjà payée : rien ; un prix écrit par le modèle est rejeté.\n- *Le facturier* → 2×100 € + 1×50 € HT = 250 € HT, TVA 50 €, 300 € TTC ; tarif inconnu ou aucune ligne : pas de facture, une carte d\'information.\n- *L\'export* → le 2 décembre : une ligne ; les factures déjà chez le comptable ou d\'un autre mois sont écartées ; le 15 : pas d\'export ; le CSV porte 120,00 calculé par le code.\n- *Une autre organisation* → rien.',
    limites: '- **Marquer payée, créer une facture, rembourser** : toujours des cartes (annexe d\'autonomie). Ce que le gabarit fait seul, c\'est *ne plus relancer* une facture dont le paiement est lu.\n- **Tiime et Sage** : l\'hôte de leur API n\'est pas dans la liste blanche de la garde commune (`scripts/n8n-specs-qa.mjs`, interdit à ce lot). L\'export est donc un CSV générique ; le **format d\'import propre à Pennylane, Tiime ou Sage est à confirmer avec le comptable**, rien n\'est inventé. À valider par Benj : ajouter ces hôtes à la garde si une écriture par API est un jour voulue.\n- La forme des réponses de Qonto (`transactions`, `amount_cents`) et de Pennylane (`items`, `invoice_number`) est à confirmer à l\'essai de lecture ; la requête QuickBooks et les identifiants Xero aussi.\n- Une facture n\'est rapprochée que si son **numéro figure** dans les métadonnées du paiement (Stripe), le numéro de document (QuickBooks, Xero) ou la référence du virement (Qonto).',
  },
  'gabarit-ent-apres-vente': {
    titre: 'Après-vente et réputation (Entreprise sur mesure)',
    surtitre: 'Département 8 du § 7 de OUTILLAGE.md : fiche Google, Trustpilot (API) ; support Zendesk, Chatwoot (API). Prompt 2 : alerte client mécontent, entretien et contrats, avis négatif toujours à un humain.',
    fait: 'Lit les **avis** (fiche Google, Trustpilot) et les **tickets** (Zendesk, Chatwoot), prépare les réponses, **alerte l\'équipe** quand un client est mécontent et propose l\'**entretien** des contrats à renouveler. **Un avis négatif ou un client mécontent va toujours à un humain** : le code compte les étoiles contre le seuil du client, le modèle ne peut qu\'*aggraver* le verdict, la réponse n\'est jamais publiée seule — même au niveau 3 de l\'annexe.',
    chemin: '1. **Entrées** : avis Google ou Trustpilot (Switch « Quelle plateforme d\'avis ? »), tickets Zendesk ou conversations Chatwoot (Switch « Quel support ? » ; Chatwoot est lu dans les événements que la plateforme range en base), contrats de la plateforme.\n2. **Normaliser** puis **Qualifier les retours** : étoiles contre `seuil_avis` (3 par défaut), visites d\'entretien dans les 30 jours non encore proposées.\n3. **Porte « simulation »** : vrai → « Effets prévus ». Faux → **Rédacteur de réponses** → revalidation (sentiment dans l\'énumération, réponse sans prix ni « Presti »).\n4. **Décider les effets** : sentiment retenu = le pire du code et du modèle ; mécontent → **carte forcée** + alerte ; sinon réponse selon l\'annexe ; entretien proposé par un texte du code.\n5. **Quel effet ?** → carte, réponse sur la fiche Google, réponse par la plateforme (Trustpilot, Chatwoot), réponse Zendesk, courriel d\'entretien (puis **Noter l\'envoi**), événement lu, prévenir l\'équipe → **Journaliser**.',
    outils: 'Fiche Google (Business Profile : lecture et réponse), Trustpilot (API en lecture), Zendesk (lecture et réponse), Chatwoot (par la plateforme), Gmail et Outlook (entretien), Slack et Teams (alerte client mécontent).',
    agents: 'Le **rédacteur de réponses** lit la fiche Google, un ticket Zendesk et le fil de la boîte ; il rend `sentiment` (positif, neutre, negatif, tres_mecontent), `reponse` et `probleme`. Son brouillon d\'un avis négatif n\'est jamais publié : il arrive en carte à l\'humain.',
    tables: '`entreprise_evenements_canaux` (événements Chatwoot, marqués lus), `entreprise_contrats`, `entreprise_relances`, `entreprise_messages_sortants` (réponses envoyées par la plateforme).',
    equipe: 'Les avis négatifs vont au périmètre « relation client » avec ses approbateurs et son canal d\'équipe ; l\'alerte part sur Slack ou Teams.',
    identifiants: 'Et les identifiants : la fiche Google, Trustpilot (clé en lecture), Zendesk, la boîte (Gmail ou Outlook), Slack ou Teams, la clé du modèle, la base de la plateforme.',
    essais: '- *Un avis à 1 étoile* → une carte « À valider » pour le rôle associé et une alerte Slack, **aucune réponse automatique** même avec l\'annexe au niveau 3 ; l\'avis à 5 étoiles est publié selon l\'annexe ; niveau 1 : brouillon ; le modèle aggrave (5 étoiles jugé « très mécontent » : carte).\n- *Un contrat d\'entretien* → proposition une fois, au bon destinataire ; sans destinataire : carte d\'information.\n- *Une autre organisation* → rien (avis, événements Chatwoot, configuration).',
    limites: '- **Chatwoot** : l\'hôte d\'un Chatwoot est propre à chaque installation et absent de la liste blanche de la garde commune ; il est donc lu par la plateforme (ses événements arrivent par webhook chez elle) et la réponse repart par elle (`entreprise_messages_sortants`).\n- **Trustpilot** : répondre à un avis demande une adresse propre à chaque avis, refusée par la garde (R7, adresse calculée). La réponse part donc par la plateforme.\n- Les paramètres de la fiche Google (`accounts/…`, `locations/…`), de Zendesk (`status<solved`) et la forme de la réponse de Trustpilot (`reviews`, `stars`) sont à confirmer à l\'essai de lecture.\n- Le **seuil** d\'un avis négatif (3 étoiles par défaut) est un réglage du contrat avec le client.',
  },
  'gabarit-ent-direction': {
    titre: 'Direction et équipe (Entreprise sur mesure)',
    surtitre: 'Département 9 du § 7 de OUTILLAGE.md : Slack, Teams, Google Chat ; validation d\'équipe par les outils HITL de n8n ; Sheets, Docs (PDF du lundi). Prompt 2 : mode privé, compteur de ce qui part vers un modèle externe.',
    fait: 'Prépare la **page du matin** de la direction, le **rapport du lundi**, le **point mensuel** et le **bilan à un mois**, et les diffuse par Slack, Teams, Google Chat ou Gmail. **Le code compte** (chaque chiffre vient de la plateforme, « non lu » sinon), **le modèle rédige** une phrase d\'ouverture *sans chiffre* et choisit des numéros de priorités. Le point mensuel et le bilan passent par la **validation d\'équipe** ; le **compteur** dit combien de documents sont partis vers un modèle externe ; en **mode privé** aucun texte n\'y part.',
    chemin: '1. **Passage** : le jour et l\'heure (Paris) sont lus sur le déclencheur. Page du matin dès 7 h ; rapport du lundi à partir de 8 h le lundi ; point mensuel le 1er du mois ; bilan 30 jours après `deploye_le`.\n2. **Compter** : le code assemble les lignes de chaque document (impayés, devis, demandes, rendez-vous, cartes, encaissé, signé, coût IA, appels à un modèle externe) et la liste des priorités possibles.\n3. **Porte « simulation »** : vrai → « Effets prévus ». Faux → **Mode privé ?** : vrai → *Rédiger sans modèle* (phrase du code) ; faux → **Rédacteur de la direction** → **Revalider les documents** (aucun chiffre, aucun « Presti », priorités dans la liste).\n4. **Décider les effets** : diffusion sur le canal de la configuration, document Docs et ligne Sheets le lundi, compteur du jour, alerte si le plafond du coût IA est atteint ; carte forcée + **validation Slack ou Teams** pour le point mensuel et le bilan.\n5. **Quel effet ?** → carte, diffusion Slack / Teams / Google Chat / Gmail, Docs (créer puis écrire), Sheets (ajouter la ligne), indicateur, validation d\'équipe → **Journaliser**.',
    outils: 'Slack, Teams, Google Chat, Gmail (diffusion), Docs (rapport du lundi), Sheets (journal des lundis), **outils de validation humaine de n8n** (Slack et Teams), Drive (lecture des rapports précédents).',
    agents: 'Le **rédacteur de la direction** lit le journal Sheets et le Drive ; il dispose aussi des **outils de validation humaine de n8n** (Slack, Teams) pour demander l\'accord d\'un membre de l\'équipe avant de proposer des priorités pour un point mensuel ou un bilan. Il rend `intro` (sans chiffre) et `priorites` (des numéros).',
    tables: '`entreprise_chiffres` (chiffres du jour), `entreprise_rapports` (semaine, mois, bilan), `entreprise_cout_ia` (coût et appels par jour, dont les appels privés), `entreprise_indicateurs` (le compteur).',
    equipe: 'Le point mensuel et le bilan sont des cartes du périmètre « direction » : ses approbateurs (par exemple le gérant) valident, sur le canal de validation de la configuration.',
    identifiants: 'Et les identifiants : Slack ou Teams ou Google Chat (le canal de la direction et celui de la validation), Gmail, Docs, Sheets, le Drive, la clé du modèle, la base de la plateforme.',
    essais: '- *Le rapport du lundi* → 8 h 15 : encaissé 12 345 €, signé 8 000 €, en cours 2 500 €, impayés 400 €, coût IA 2,00 € (chiffres du code, ceux d\'une autre organisation ignorés) ; envoi, document et ligne Sheets ; un chiffre, « Presti » ou une priorité hors liste dans la phrase du modèle sont rejetés ; avant 7 h rien.\n- *Le point mensuel* → carte « À valider » du périmètre direction et demande Slack ; le bilan 30 jours après le déploiement ; la carte approuvée par un rôle hors liste est ignorée.\n- *Le compteur* → un document rédigé par le modèle : 1 externe ; en mode privé : 0 externe, 1 privé ; plafond dépassé : alerte.\n- *Une autre organisation* → « non lu », jamais ses valeurs.',
    limites: '- **Modèles locaux** : le mode privé rédige avec le code, sans modèle. Les modèles locaux sur Oracle pour les tâches sensibles sont un lot ultérieur ; ce gabarit n\'en suppose aucun.\n- **PDF du lundi** : le gabarit crée un document Docs ; son export en PDF est un geste de la copie du client (le nœud Docs n\'exporte pas).\n- **Outils de validation humaine** sur l\'agent : ils sont admis dans les gabarits Entreprise seulement (R23). Leur sémantique exacte (ils protègent un outil) est à confirmer à l\'essai dans n8n ; la validation qui compte, celle de la carte, passe par les nœuds « Valider par Slack / Teams ».\n- Après une reprise de `sendAndWait`, le lien d\'élément `$(\'Quel effet ?\').item` peut être perdu : à vérifier à l\'essai dans n8n.\n- Le coût IA du jour dépend de la table `entreprise_cout_ia`, alimentée par la plateforme.',
  },
}
for (const [nom, spec] of Object.entries(SPECS)) console.log(`${nom.replace('gabarit-', '')}.md : ${fiche(nom, spec)} caractères`)
