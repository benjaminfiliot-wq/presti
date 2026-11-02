#!/usr/bin/env node
// kit-entreprise-qa.mjs — juge du kit commercial du mode A de « Presti pour l'entreprise » (tâche 035-002).
//
// Ce qu'il juge (plans/011-cadrage-01-11/p5-entreprise/kit/, README.md pour les conventions) :
//   • les cinq pièces sont là : README, fiche de découverte, matrice, registre des données, annexe d'autonomie ;
//   • la fiche a ses huit parties de p5:100-107, dans l'ordre, chacune avec valeur, source, date et confiance (p5:94) ;
//   • chaque valeur d'exemple porte « Exemple. » ; « Bâti-Démo » jamais sans « Exemple. » devant ; aucune adresse e-mail hors de
//     @exemple.invalid, aucun téléphone, aucun SIRET (zéro donnée réelle, p5:22) ;
//   • aucun montant (le prix, c'est Benj : p5:54), aucun pourcentage ;
//   • aucune phrase interdite de p5:42 hors d'une liste « jamais » balisée ;
//   • la matrice (type de valeur, KPI, base de départ inconnue en mode A, signalements de p5:53 et p5:298) ;
//   • le registre (base légale, lieu Supabase UE, n8n jamais lieu de stockage : p5:95) ;
//   • l'annexe : carte à valider par défaut (p5:224), la liste « jamais en automatique » de p5:226 ET de OUTILS_JAMAIS_AUTO, relue
//     dans lib/pilote/regles.ts à chaque passage, avec le délai et le plafond du pilote lus dans le même fichier.
//
// Puis il prouve qu'il sait rougir : chaque mutant (un manque injecté dans une copie en mémoire du kit) doit faire échouer la règle
// attendue, et la règle attendue seulement si possible. Un mutant qui passe, ou qui rougit pour une autre raison, fait échouer le juge.
//
// Mode données (tâche 035-006) : `--donnees <dossier>` juge le jeu fictif « Exemple. Bâti-Démo » (contrat dans kit/README.md), puis
// rejoue les mutants des données sur un jeu témoin construit en mémoire.
//
// Hors ligne, aucune écriture, aucun appel réseau, aucune dépendance. Code de sortie : 0 tout vert, 1 un défaut, 2 usage.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER_KIT = 'plans/011-cadrage-01-11/p5-entreprise/kit'
const FICHIER_REGLES_PILOTE = 'lib/pilote/regles.ts'
const PIECES = {
  readme: 'README.md',
  fiche: 'fiche-decouverte.md',
  matrice: 'matrice.md',
  registre: 'registre-donnees.md',
  annexe: 'annexe-autonomie.md',
}

// ── Lecture ──────────────────────────────────────────────────────────────────────────────────────────

const normaliser = (t) => t.replace(/[’‘]/g, "'").replace(/\r\n/g, '\n').replace(/[  ]/g, ' ')

function lireKit(dossier = path.join(RACINE, DOSSIER_KIT)) {
  const kit = {}
  for (const [cle, nom] of Object.entries(PIECES)) {
    const f = path.join(dossier, nom)
    kit[cle] = fs.existsSync(f) ? normaliser(fs.readFileSync(f, 'utf8')) : null
  }
  return kit
}

// Ce que le code dit du pilote : la liste fermée, le délai d'annulation, le plafond par jour. Fail-closed : illisible = défaut.
function lireCodePilote() {
  const f = path.join(RACINE, FICHIER_REGLES_PILOTE)
  if (!fs.existsSync(f)) return null
  const t = fs.readFileSync(f, 'utf8')
  const liste = t.match(/OUTILS_JAMAIS_AUTO\s*:\s*readonly string\[\]\s*=\s*\[([\s\S]*?)\]/)
  const delai = t.match(/DELAI_ANNULATION_MIN\s*=\s*(\d+)/)
  const plafond = t.match(/PLAFOND_AUTO_JOUR\s*=\s*(\d+)/)
  if (!liste || !delai || !plafond) return null
  const outils = [...liste[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
  return outils.length ? { outils, delai: Number(delai[1]), plafond: Number(plafond[1]) } : null
}

// Les tableaux Markdown d'un texte : en-têtes, lignes, et le titre de la section où ils sont.
function tableaux(texte) {
  const lignes = (texte ?? '').split('\n')
  const resultat = []
  let titre = ''
  for (let i = 0; i < lignes.length; i++) {
    if (/^#{1,6} /.test(lignes[i])) titre = lignes[i]
    if (!lignes[i].startsWith('|') || !(lignes[i + 1] ?? '').match(/^\|\s*:?-{3,}/)) continue
    const cellules = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
    const entetes = cellules(lignes[i])
    const corps = []
    let j = i + 2
    for (; j < lignes.length && lignes[j].startsWith('|'); j++) corps.push(cellules(lignes[j]))
    resultat.push({ titre, entetes, corps })
    i = j - 1
  }
  return resultat
}

const colonne = (tab, motif) => tab.entetes.findIndex((e) => motif.test(e))

// Les sections « ## » d'un texte : { titre, texte }.
function sections(texte) {
  const res = []
  const morceaux = (texte ?? '').split(/^(?=## )/m)
  for (const m of morceaux) if (m.startsWith('## ')) res.push({ titre: m.split('\n')[0], texte: m })
  return res
}

// Les listes « jamais » : elles seules peuvent nommer un geste interdit. Rend le texte sans elles et les défauts de forme.
function blocsJamais(texte) {
  const defauts = []
  const lignes = (texte ?? '').split('\n')
  const dehors = []
  let dedans = false
  let titre = ''
  for (const l of lignes) {
    if (/^#{1,6} /.test(l)) titre = l
    if (l.includes('<!-- jamais:debut -->')) {
      if (dedans) defauts.push('liste « jamais » ouverte deux fois')
      if (!/jamais|interdit/i.test(titre)) defauts.push(`liste « jamais » sous un titre qui ne dit ni « jamais » ni « interdit » : « ${titre} »`)
      dedans = true
      continue
    }
    if (l.includes('<!-- jamais:fin -->')) {
      if (!dedans) defauts.push('liste « jamais » fermée sans être ouverte')
      dedans = false
      continue
    }
    if (dedans) {
      if (l.trim() && !/^- \S/.test(l)) defauts.push(`ligne de liste « jamais » qui n'est pas un point de liste : « ${l.slice(0, 70)} »`)
    } else dehors.push(l)
  }
  if (dedans) defauts.push('liste « jamais » jamais fermée')
  return { dehors: dehors.join('\n'), defauts }
}

// Les références (p5:NN, fichier:ligne, code, § N, horodatages, K1, I1, J+3) ne sont pas des chiffres de contenu.
const sansReferences = (t) => t
  .replace(/`[^`\n]*`/g, ' REF ')
  .replace(/\b(p5|C4|P3|OFF)(:\d+(-\d+)?)(,\s*:\d+(-\d+)?)*/g, ' REF ')
  .replace(/\b[\w./-]+\.(md|ts|tsx|mjs|sql|json)(:\d+(-\d+)?)?/g, ' REF ')
  .replace(/§\s*\d+(\.\d+)*/g, ' REF ')
  .replace(/\[\d{2}:\d{2}\](-\[\d{2}:\d{2}\])?/g, ' REF ')
  .replace(/\b[KI]\d+\b/g, ' REF ')
  .replace(/\bJ\+\d+\b/g, ' REF ')
  .replace(/\bart\.\s*\d+/g, ' REF ')
  .replace(/\b0{8}-0{4}-4000-8000-[0-9a-f]{0,12}/g, ' REF ')

// ── Règles du kit ────────────────────────────────────────────────────────────────────────────────────

const CONFIANCES = ['mesuré', 'déclaré', 'estimé par le client', 'inconnu']
const TYPES_VALEUR = ['temps', 'coût', 'conformité', 'revenu', 'argent récupéré']
const AGENTS = ['Qualification', 'Relance', 'Rédaction', 'Alerte', 'Reporting', 'Conformité']
const BASES_LEGALES = /^(contrat|obligation légale|intérêt légitime|consentement|sauvegarde des intérêts vitaux|mission d'intérêt public)\b/i
const PREFIXES_FICTION = ['199 00', '261 91', '353 01', '465 71', '536 49', '639 98'] // ARCEP, de mémoire, à vérifier (README)

const PARTIES = [
  { n: 1, titre: /entreprise/i, ancres: ['titulaire', 'associé', 'administratif', 'compagnon', 'invité', 'qui décide', 'qui valide', 'qui exécute', 'saisonnalité'] },
  { n: 2, titre: /parcours/i, ancres: ['procédures écrites', 'devis', 'relance', 'facture', 'encaissement'] },
  { n: 3, titre: /irritants/i, ancres: ['claquer des doigts', 'type de valeur', 'fréquence', 'temps perdu', 'exemple récent', 'déjà essayé'] },
  { n: 4, titre: /outils/i, ancres: ['laisse-t-il sortir vos données', 'API', 'export', 'coût', 'accès', 'rôle'] },
  { n: 5, titre: /volumes/i, ancres: ['inconnu', 'mesure de départ', 'mesuré', 'déclaré'] },
  { n: 6, titre: /règles/i, ancres: ['jamais partir', 'TVA', 'mentions légales', 'heures'] },
  { n: 7, titre: /KPI/i, ancres: ["aujourd'hui", 'voudrait suivre', 'base de départ'] },
  { n: 8, titre: /RGPD/i, ancres: ['base légale', 'durée', 'consentement', 'SMS'] },
]

// Les six familles de phrases de p5:42 qui se lisent mécaniquement, plus les promesses de disponibilité (septième famille, en partie).
const PHRASES_INTERDITES = [
  ['gain', /\b(gagnez|gagnerez|économisez|économiserez|récupérez|réduisez|divisez|multipliez|doublez|triplez)\b/i],
  ['gain', /\d+\s*(h|heures?|jours?|minutes?)\s+(de\s+)?(gagnée?s?|économisée?s?|libérée?s?)/i],
  ['gain', /\bgains?\s+(de|d'au moins)\s+\d/i],
  ['témoignage', /témoignage|\blogos?\b/i],
  ['remplace', /\bremplac\w*\s+(un|une|des|vos|votre|le|la)\s+(salarié|employé|secrétaire|assistante?|commercial|personne|poste)/i],
  ['appel', /(l'ia|l'agent|l'assistant|nos agents|vos agents)\s+(\S+\s+){0,3}(répond\w*|décroche\w*|gère\w*|prend\w*|passe\w*)\s+(\S+\s+){0,2}(appels?|téléphone)/i],
  ['appel', /appels?\s+(téléphoniques?\s+)?(gérés?|pris|passés?)\s+par\s+(l'ia|un agent|l'agent|l'assistant)/i],
  ['rendez-vous', /rendez-vous\s+(\S+\s+)?(pris|réservés?|fixés?|calés?)\s+(seuls?|tout seuls?|automatiquement|par l'ia|par l'agent)/i],
  ['rendez-vous', /(l'ia|l'agent|l'assistant)\s+(\S+\s+){0,2}(prend|réserve|fixe|cale)\s+(\S+\s+){0,2}rendez-vous/i],
  ['paiement', /(paiements?|règlements?|acomptes?)\s+(\S+\s+)?encaissés?\s+(par l'ia|automatiquement|seuls?|par l'agent)/i],
  ['paiement', /(l'ia|l'agent|l'assistant)\s+(\S+\s+){0,2}encaisse/i],
  ['drapeau', /déjà disponible|disponible dès|disponible aujourd'hui|inclus d'office|déjà en service/i],
]

const MONTANTS = [
  /\d[\d\s.,]*\s*(€|euros?\b|eur\b|k€)/i,
  /€\s*\d/,
  /\d+\s*%/,
  /\b\d+\s*pour\s*cent\b/i,
  /\b(prix|tarif|forfait|abonnement|mensualité)s?\b[^.\n|]{0,25}\d/i,
]

function jugerKit(kit, code) {
  const defauts = [] // { code, message }
  const d = (c, m) => defauts.push({ code: c, message: m })

  // K1 — les pièces
  for (const [cle, nom] of Object.entries(PIECES)) if (!kit[cle] || !kit[cle].trim()) d('K1', `pièce absente ou vide : ${nom}`)
  if (!code) d('K2', `${FICHIER_REGLES_PILOTE} illisible : OUTILS_JAMAIS_AUTO, DELAI_ANNULATION_MIN ou PLAFOND_AUTO_JOUR introuvable`)

  for (const [cle, nom] of Object.entries(PIECES)) {
    const t = kit[cle]
    if (!t) continue
    // E1 — chaque cellule d'une colonne « Exemple » commence par « Exemple. »
    for (const tab of tableaux(t)) {
      tab.entetes.forEach((e, i) => {
        if (!/Exemple/.test(e)) return
        for (const ligne of tab.corps) {
          const c = (ligne[i] ?? '').trim()
          if (c && c !== '—' && !c.startsWith('Exemple.')) d('E1', `${nom} : valeur d'exemple sans « Exemple. » (colonne « ${e} ») : « ${c.slice(0, 60)} »`)
        }
      })
    }
    // E2 — « Bâti-Démo » toujours marqué
    for (const m of t.matchAll(/Bâti-Démo/g)) {
      if (t.slice(Math.max(0, m.index - 9), m.index) !== 'Exemple. ') d('E2', `${nom} : « Bâti-Démo » sans « Exemple. » juste devant`)
    }
    // E3 — adresses e-mail ; E4 — téléphones ; E5 — SIRET
    for (const m of t.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)) if (!/@exemple\.invalid$/i.test(m[0])) d('E3', `${nom} : adresse e-mail hors de @exemple.invalid : ${m[0]}`)
    const neutre = sansReferences(t)
    for (const m of neutre.matchAll(/(?:\+33\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/g)) d('E4', `${nom} : numéro de téléphone : ${m[0]}`)
    if (/\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b/.test(neutre)) d('E5', `${nom} : numéro de SIRET`)
    // M1 — aucun montant, partout, listes « jamais » comprises
    for (const re of MONTANTS) { const m = neutre.match(re); if (m) d('M1', `${nom} : montant ou pourcentage : « ${m[0].trim()} »`) }
    // J1 — listes « jamais » bien formées ; P42 — aucune phrase interdite hors d'elles
    const { dehors, defauts: dj } = blocsJamais(t)
    for (const m of dj) d('J1', `${nom} : ${m}`)
    for (const [famille, re] of PHRASES_INTERDITES) {
      const m = dehors.match(re)
      if (m) d('P42', `${nom} : phrase interdite de p5:42 (${famille}) hors d'une liste « jamais » : « ${m[0]} »`)
    }
  }

  // README — les sept interdits de p5:42 sont dits
  if (kit.readme) {
    for (const motif of [/chiffre de gain/i, /témoignage/i, /remplace un salarié/i, /appel téléphonique/i, /rendez-vous pris seul/i, /paiement encaissé/i, /drapeau baissé/i]) {
      if (!motif.test(kit.readme)) d('K3', `README.md : l'interdit de p5:42 « ${motif.source} » n'est pas dit`)
    }
    if (!/--donnees/.test(kit.readme)) d('K3', 'README.md : le contrat du jeu de données (035-006) manque')
  }

  // F — la fiche de découverte
  let irritantsFiche = []
  if (kit.fiche) {
    const parts = sections(kit.fiche).filter((s) => /^## Partie \d/.test(s.titre))
    const numeros = parts.map((s) => Number(s.titre.match(/^## Partie (\d)/)[1]))
    if (numeros.join(',') !== '1,2,3,4,5,6,7,8') d('F1', `fiche : les parties lues sont [${numeros.join(', ')}], attendu 1 à 8 dans l'ordre (p5:100-107)`)
    for (const attendu of PARTIES) {
      const s = parts.find((p) => p.titre.startsWith(`## Partie ${attendu.n}`))
      if (!s) continue
      if (!attendu.titre.test(s.titre)) d('F1', `fiche : la partie ${attendu.n} ne parle pas de ${attendu.titre.source} : « ${s.titre} »`)
      for (const a of attendu.ancres) if (!s.texte.toLowerCase().includes(a.toLowerCase())) d('F5', `fiche, partie ${attendu.n} : « ${a} » manque`)
      const tab = tableaux(s.texte)[0]
      if (!tab) { d('F2', `fiche, partie ${attendu.n} : aucun tableau`); continue }
      const idx = Object.fromEntries(['Champ', 'Question', 'Valeur', 'Source', 'Date', 'Confiance'].map((c) => [c, colonne(tab, new RegExp(c))]))
      for (const [c, i] of Object.entries(idx)) if (i < 0) d('F2', `fiche, partie ${attendu.n} : colonne « ${c} » absente (p5:94)`)
      if (tab.corps.length < 3) d('F2', `fiche, partie ${attendu.n} : ${tab.corps.length} champ(s), au moins 3 attendus`)
      if (idx.Confiance < 0 || idx.Valeur < 0) continue
      for (const ligne of tab.corps) {
        const conf = (ligne[idx.Confiance] ?? '').trim()
        const val = ligne[idx.Valeur] ?? ''
        if (!CONFIANCES.includes(conf)) d('F3', `fiche, partie ${attendu.n} : confiance « ${conf} » hors de ${CONFIANCES.join(' / ')}`)
        // Une donnée qu'on n'a pas s'écrit « inconnu », avec la confiance « inconnu » (p5:93) ; l'une ne va pas sans l'autre.
        if (conf === 'inconnu' && !/inconnu/i.test(val)) d('F4', `fiche, partie ${attendu.n} : confiance « inconnu » sur une valeur qui ne dit pas « inconnu »`)
        if (/^Exemple\.\s*inconnu/i.test(val) && conf !== 'inconnu') d('F4', `fiche, partie ${attendu.n} : valeur « inconnu » avec la confiance « ${conf} »`)
      }
      if (attendu.n === 3) irritantsFiche = tab.corps.map((l) => (l[0] ?? '').match(/I\d+/)?.[0]).filter(Boolean)
    }
    const sig = sections(kit.fiche).find((s) => /Signatures/.test(s.titre))
    if (!sig || !/entreprise/.test(sig.texte) || !/Presti/.test(sig.texte) || !/Signé/.test(sig.texte)) d('F6', 'fiche : la signature des deux côtés manque (p5:52)')
  }

  // X — la matrice
  if (kit.matrice) {
    const tab = tableaux(kit.matrice).find((t) => colonne(t, /Type de valeur/) >= 0)
    if (!tab) d('X1', 'matrice : aucun tableau avec une colonne « Type de valeur »')
    else {
      const i = Object.fromEntries([['n', /^N°/], ['irr', /Irritant/], ['type', /Type de valeur/], ['wf', /Workflow/], ['ag', /Agents/], ['kpi', /^KPI/], ['base', /Base de départ/], ['sig', /Signalement/]].map(([k, re]) => [k, colonne(tab, re)]))
      for (const [k, v] of Object.entries(i)) if (v < 0) d('X1', `matrice : colonne « ${k} » absente`)
      if (tab.corps.length < 3) d('X1', `matrice : ${tab.corps.length} irritant(s), au moins 3 attendus`)
      if (Object.values(i).every((v) => v >= 0)) {
        const irritantsMatrice = []
        for (const l of tab.corps) {
          const num = (l[i.n].match(/I\d+/) ?? [l[i.n]])[0]
          irritantsMatrice.push(num)
          const type = l[i.type].trim()
          if (!TYPES_VALEUR.includes(type)) d('X2', `matrice, ${num} : type de valeur « ${type} » hors de ${TYPES_VALEUR.join(' / ')}`)
          if (!/`ent-exemple-[a-z-]+`|agent propre/.test(l[i.wf])) d('X3', `matrice, ${num} : workflow « ${l[i.wf].slice(0, 40)} » hors du nommage ent-exemple-* (p5:163) et sans agent propre`)
          for (const a of l[i.ag].split(',').map((x) => x.trim().replace(/\s*\(.*\)$/, ''))) {
            if (a && a !== '—' && !AGENTS.includes(a) && a !== 'propre') d('X3', `matrice, ${num} : agent inconnu « ${a} »`)
          }
          if (!/inconnue/i.test(l[i.base]) || /\d/.test(l[i.base])) d('X4', `matrice, ${num} : base de départ « ${l[i.base].slice(0, 50)} » : en mode A, « inconnue » et aucun chiffre`)
          if (type === 'temps' && !/aucun ROI mesurable/i.test(l[i.sig])) d('X5', `matrice, ${num} : irritant de temps sans le signalement « aucun ROI mesurable » (p5:298)`)
          if (l[i.kpi].trim() === '—' && !/sans KPI mesurable/i.test(l[i.sig])) d('X6', `matrice, ${num} : irritant sans KPI, non signalé « sans KPI mesurable » (p5:53)`)
        }
        if (kit.fiche) {
          for (const n of irritantsMatrice) if (!irritantsFiche.includes(n)) d('X7', `matrice : ${n} absent de la partie 3 de la fiche`)
          for (const n of irritantsFiche) if (!irritantsMatrice.includes(n)) d('X7', `fiche : l'irritant ${n} n'a pas de ligne dans la matrice`)
        }
      }
    }
  }

  // R — le registre
  if (kit.registre) {
    const tab = tableaux(kit.registre).find((t) => colonne(t, /Base légale/) >= 0)
    if (!tab) d('R1', 'registre : aucun tableau avec une colonne « Base légale »')
    else {
      const i = Object.fromEntries([['donnee', /^Donnée/], ['qui', /De qui/], ['source', /Source/], ['date', /^Date/], ['conf', /Confiance/], ['base', /Base légale/], ['lieu', /Où elle vit/], ['duree', /Durée/], ['ex', /Exemple/]].map(([k, re]) => [k, colonne(tab, re)]))
      for (const [k, v] of Object.entries(i)) if (v < 0) d('R1', `registre : colonne « ${k} » absente (p5:284)`)
      if (tab.corps.length < 8) d('R1', `registre : ${tab.corps.length} donnée(s), au moins 8 attendues`)
      if (Object.values(i).every((v) => v >= 0)) {
        for (const l of tab.corps) {
          const nomD = l[i.donnee].slice(0, 40)
          if (!BASES_LEGALES.test(l[i.base].trim())) d('R2', `registre, « ${nomD} » : base légale « ${l[i.base]} » hors de l'art. 6 du RGPD`)
          if (!/Supabase|outil du client/.test(l[i.lieu])) d('R3', `registre, « ${nomD} » : lieu « ${l[i.lieu].slice(0, 50)} » ni Supabase ni l'outil du client (p5:95)`)
          if (/n8n/.test(l[i.lieu]) && !/passage|identifiants|non gardées|jamais lu/.test(l[i.lieu])) d('R3', `registre, « ${nomD} » : n8n donné comme lieu de stockage (p5:95)`)
          if (!l[i.duree].trim()) d('R4', `registre, « ${nomD} » : durée vide`)
          if (!l[i.source].trim() || !l[i.date].trim() || !l[i.conf].trim()) d('R4', `registre, « ${nomD} » : source, date ou confiance vide (p5:94)`)
        }
      }
    }
    for (const a of [/modèle gratuit en ligne/i, /\bUE\b/, /RLS/, /art\. 28/]) if (!a.test(kit.registre)) d('R5', `registre : « ${a.source} » n'est pas dit`)
  }

  // A — l'annexe d'autonomie
  if (kit.annexe) {
    const tab = tableaux(kit.annexe).find((t) => colonne(t, /Niveau par défaut/) >= 0)
    if (!tab) d('A1', "annexe : aucun tableau avec une colonne « Niveau par défaut »")
    else {
      const i = Object.fromEntries([['type', /Type d'action/], ['defaut', /Niveau par défaut/], ['demande', /Niveau demandé/], ['accord', /Accord écrit/], ['cond', /Condition/]].map(([k, re]) => [k, colonne(tab, re)]))
      for (const [k, v] of Object.entries(i)) if (v < 0) d('A1', `annexe : colonne « ${k} » absente`)
      if (Object.values(i).every((v) => v >= 0)) {
        for (const l of tab.corps) {
          if (l[i.defaut].trim() !== 'carte à valider') d('A2', `annexe, « ${l[i.type]} » : niveau par défaut « ${l[i.defaut]} », attendu « carte à valider » (p5:224)`)
          if (!/^Exemple\. (carte à valider|automatique après accord écrit)$/.test(l[i.demande].trim())) d('A4', `annexe, « ${l[i.type]} » : niveau demandé « ${l[i.demande]} » hors de la liste`)
          if (/encaiss|rembours|moyen de paiement|URSSAF|impôts|supprim|escalade|litige|\bappels?\b|téléphon|devis signé|rendez-vous|modifier un prix|créneau/i.test(l[i.type])) d('A7', `annexe : le geste interdit « ${l[i.type]} » est dans le tableau des types d'action (p5:226)`)
        }
        for (const [nomT, re] of [['relance de devis', /relance de devis/i], ['rappel de paiement', /rappel de paiement/i], ['réponse à une demande simple', /réponse à une demande simple/i], ['alerte interne', /alerte interne/i]]) {
          if (!tab.corps.some((l) => re.test(l[i.type]))) d('A3', `annexe : le type d'action « ${nomT} » de p5:224 manque`)
        }
      }
    }
    const jamais = (kit.annexe.match(/<!-- jamais:debut -->([\s\S]*?)<!-- jamais:fin -->/) ?? [, ''])[1]
    for (const re of [/devis signé/i, /prix sans source/i, /encaisser/i, /rembourser/i, /moyen de paiement/i, /URSSAF/, /impôts/i, /supprimer des données/i, /escalade/i, /litige/i, /sinistre/i, /menace/i, /avocat/i, /assureur/i, /créneau/i, /délai/i, /fournisseur/i, /appel téléphonique/i]) {
      if (!re.test(jamais)) d('A5', `annexe : le geste « ${re.source} » de p5:226 manque à la liste « jamais en automatique »`)
    }
    if (code) {
      for (const o of code.outils) if (!jamais.includes(`\`${o}\``)) d('A6', `annexe : \`${o}\` de OUTILS_JAMAIS_AUTO (${FICHIER_REGLES_PILOTE}) manque à la liste « jamais »`)
      const neutre = kit.annexe.replace(/`[^`]*`/g, '')
      if (!neutre.includes(`${code.delai} minutes`)) d('A8', `annexe : le délai d'annulation du code (${code.delai} minutes) n'est pas dit`)
      if (!neutre.includes(`${code.plafond} par jour`)) d('A8', `annexe : le plafond du code (${code.plafond} par jour) n'est pas dit`)
    }
    for (const a of [/mode ombre/i, /par écrit/i, /révocable/i, /interrupteur général/i, /Signature/]) if (!a.test(kit.annexe)) d('A8', `annexe : « ${a.source} » n'est pas dit`)
    const sig = sections(kit.annexe).find((s) => /Signatures/.test(s.titre))
    if (!sig || !/entreprise/.test(sig.texte) || !/Presti/.test(sig.texte)) d('A9', "annexe : l'acceptation des deux côtés manque")
  }
  return defauts
}

// ── Règles du jeu de données (035-006) ───────────────────────────────────────────────────────────────

const FICHIERS_DONNEES = ['membres.json', 'demandes.json', 'devis.json', 'factures.json', 'relances.json']
const ROLES = ['titulaire', 'associé', 'administratif', 'compagnon', 'invité']
const TEXTES_LIBRES = ['nom', 'client_nom', 'raison_sociale', 'message', 'objet', 'description', 'texte']
const CAS_LIMITES = ['sans_contact', 'doublon', 'stop', 'litige', 'palier_manque', 'prix_absent', 'escalade']
const UUID_FICTIF = /^00000000-0000-4000-8000-[0-9a-f]{12}$/

function lireDonnees(dossier) {
  const jeu = {}
  for (const f of FICHIERS_DONNEES) {
    const p = path.join(dossier, f)
    if (!fs.existsSync(p)) { jeu[f] = undefined; continue }
    try { jeu[f] = JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) { jeu[f] = { illisible: e.message } }
  }
  return jeu
}

function jugerDonnees(jeu) {
  const defauts = []
  const d = (c, m) => defauts.push({ code: c, message: m })
  const vus = new Set()
  for (const f of FICHIERS_DONNEES) {
    const lignes = jeu[f]
    if (lignes === undefined) { d('D1', `${f} absent`); continue }
    if (!Array.isArray(lignes)) { d('D1', `${f} : attendu un tableau d'objets${lignes?.illisible ? ` (${lignes.illisible})` : ''}`); continue }
    if (!lignes.length) d('D1', `${f} : vide`)
    lignes.forEach((l, n) => {
      const ou = `${f}[${n}]`
      if (!l || typeof l !== 'object') { d('D1', `${ou} : pas un objet`); return }
      if (!l.id) d('D2', `${ou} : sans id`)
      if (!l.artisan_id) d('D3', `${ou} : sans artisan_id`)
      const parcourir = (v, cle) => {
        if (Array.isArray(v)) return v.forEach((x) => parcourir(x, cle))
        if (v && typeof v === 'object') return Object.entries(v).forEach(([k, x]) => parcourir(x, k))
        if (typeof v !== 'string') return
        if ((cle === 'id' || cle.endsWith('_id')) && !UUID_FICTIF.test(v)) d('D2', `${ou}.${cle} : « ${v} » hors de la forme 00000000-0000-4000-8000-…`)
        for (const m of v.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)) if (!/@exemple\.invalid$/i.test(m[0])) d('D5', `${ou}.${cle} : adresse hors de @exemple.invalid : ${m[0]}`)
        if (TEXTES_LIBRES.includes(cle) && !v.startsWith('Exemple.')) d('D6', `${ou}.${cle} : texte sans « Exemple. » : « ${v.slice(0, 50)} »`)
        for (const m of v.matchAll(/(?:\+33\s?|\b0)([1-9](?:[\s.-]?\d{2}){4})\b/g)) {
          const chiffres = m[1].replace(/\D/g, '')
          const prefixe = `${chiffres.slice(0, 3)} ${chiffres.slice(3, 5)}`
          if (!PREFIXES_FICTION.includes(prefixe)) d('D7', `${ou}.${cle} : téléphone hors des tranches de fiction : ${m[0]}`)
        }
        if (/\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b/.test(v)) d('D7', `${ou}.${cle} : numéro de SIRET`)
        if (cle === 'cas_limite') vus.add(v)
      }
      parcourir(l, '')
    })
  }
  const membres = Array.isArray(jeu['membres.json']) ? jeu['membres.json'] : []
  for (const [n, m] of membres.entries()) if (!ROLES.includes(m?.role)) d('D4', `membres.json[${n}] : rôle « ${m?.role} » hors de ${ROLES.join(' / ')}`)
  if (membres.length && !membres.some((m) => m?.role === 'titulaire')) d('D4', 'membres.json : aucun titulaire')
  for (const c of CAS_LIMITES) if (!vus.has(c)) d('D8', `cas limite « ${c} » porté par aucune ligne (champ cas_limite)`)
  return defauts
}

// Un jeu témoin minimal, construit ici (jamais écrit sur le disque) : il passe, et chaque mutant des données le casse.
function jeuTemoin() {
  const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const org = id(1)
  return {
    'membres.json': [
      { id: id(11), artisan_id: org, role: 'titulaire', nom: 'Exemple. Titulaire', email: 'titulaire@exemple.invalid' },
      { id: id(12), artisan_id: org, role: 'compagnon', nom: 'Exemple. Compagnon', telephone: '06 39 98 00 01' },
    ],
    'demandes.json': [
      { id: id(21), artisan_id: org, nom: 'Exemple. Client A', email: 'client-a@exemple.invalid', message: 'Exemple. salle de bains', cas_limite: 'doublon' },
      { id: id(22), artisan_id: org, nom: 'Exemple. Client B', email: null, message: 'Exemple. sans contact', cas_limite: 'sans_contact' },
      { id: id(23), artisan_id: org, nom: 'Exemple. Client C', message: 'Exemple. menace d’avocat', cas_limite: 'escalade' },
    ],
    'devis.json': [
      { id: id(31), artisan_id: org, lead_id: id(21), statut: 'envoye', cas_limite: 'prix_absent' },
    ],
    'factures.json': [
      { id: id(41), artisan_id: org, client_nom: 'Exemple. Client A', statut: 'emise', date_echeance: '2026-10-01', cas_limite: 'litige' },
    ],
    'relances.json': [
      { id: id(51), artisan_id: org, objet_id: id(31), canal: 'email', cas_limite: 'palier_manque' },
      { id: id(52), artisan_id: org, objet_id: id(41), canal: 'email', cas_limite: 'stop' },
    ],
  }
}

// ── Mutants ──────────────────────────────────────────────────────────────────────────────────────────

const remplacer = (cle, de, vers) => (kit) => {
  if (!kit[cle] || !kit[cle].includes(de)) throw new Error(`mutant inapplicable : « ${de.slice(0, 50)} » absent de ${PIECES[cle]}`)
  return { ...kit, [cle]: kit[cle].replace(de, vers) }
}
const ajouter = (cle, texte) => (kit) => ({ ...kit, [cle]: `${kit[cle]}\n${texte}\n` })
const retirerSection = (cle, debut) => (kit) => {
  const t = kit[cle]
  const i = t.indexOf(debut)
  if (i < 0) throw new Error(`mutant inapplicable : section « ${debut} » absente`)
  const j = t.indexOf('\n## ', i + 1)
  return { ...kit, [cle]: t.slice(0, i) + (j < 0 ? '' : t.slice(j + 1)) }
}

const MUTANTS_KIT = [
  ['pièce absente : le registre', (k) => ({ ...k, registre: null }), 'K1'],
  ['fiche sans la partie 5', retirerSection('fiche', '## Partie 5'), 'F1'],
  ['fiche : parties 2 et 3 inversées', (k) => {
    const s2 = k.fiche.indexOf('## Partie 2'), s3 = k.fiche.indexOf('## Partie 3'), s4 = k.fiche.indexOf('## Partie 4')
    return { ...k, fiche: k.fiche.slice(0, s2) + k.fiche.slice(s3, s4) + k.fiche.slice(s2, s3) + k.fiche.slice(s4) }
  }, 'F1'],
  ['fiche : colonne « Confiance » renommée', remplacer('fiche', '| Source — Exemple. | Date — Exemple. | Confiance |', '| Source — Exemple. | Date — Exemple. | Fiabilité |'), 'F2'],
  ['fiche : confiance hors de la liste', remplacer('fiche', '| Exemple. date du rendez-vous | déclaré |', '| Exemple. date du rendez-vous | probable |'), 'F3'],
  ['fiche : « inconnu » rendu en « mesuré »', remplacer('fiche', '| Exemple. inconnu | Exemple. le titulaire ne sait pas répondre de mémoire | Exemple. date du rendez-vous | inconnu |', '| Exemple. inconnu | Exemple. le titulaire ne sait pas répondre de mémoire | Exemple. date du rendez-vous | mesuré |'), 'F4'],
  ['fiche : question « claquer des doigts » retirée', (k) => ({ ...k, fiche: k.fiche.replace(/claquer des doigts/gi, 'tout changer') }), 'F5'],
  ['fiche : question des procédures écrites retirée', (k) => ({ ...k, fiche: k.fiche.replace(/procédures écrites/gi, 'habitudes') }), 'F5'],
  ['fiche : signature de Presti retirée', remplacer('fiche', '| Signé pour Presti | Exemple. Benj | fondateur | Exemple. date du rendez-vous |', ''), 'F6'],
  ['valeur sans « Exemple. »', remplacer('fiche', '| Exemple. Rénovation intérieure', '| Rénovation intérieure'), 'E1'],
  ['source sans « Exemple. »', remplacer('fiche', '| Exemple. dit en RDV par le compagnon |', '| dit en RDV par le compagnon |'), 'E1'],
  ['« Bâti-Démo » sans sa marque', ajouter('matrice', 'La démo de Bâti-Démo tourne à blanc.'), 'E2'],
  ['adresse e-mail réelle', ajouter('readme', 'Contact : jean.dupont@gmail.com'), 'E3'],
  ['numéro de téléphone', ajouter('fiche', 'Rappeler le 06 12 34 56 78.'), 'E4'],
  ['numéro de SIRET', ajouter('registre', 'SIRET 123 456 789 00012.'), 'E5'],
  ['prix de l\'offre en euros', ajouter('readme', "L'offre Entreprise démarre à 990 € HT par mois."), 'M1'],
  ['montant écrit « euros »', ajouter('annexe', 'Frais de mise en place : 1 500 euros.'), 'M1'],
  ['pourcentage', ajouter('matrice', 'Les relances ramènent 30 % de devis en plus.'), 'M1'],
  ['forfait chiffré sans symbole', ajouter('readme', 'Forfait de construction : 12 jours facturés 4900.'), 'M1'],
  ['« remplace un salarié »', ajouter('matrice', 'Ce système remplace un salarié administratif.'), 'P42'],
  ['appel géré par l\'IA', ajouter('fiche', "L'IA répond à vos appels le soir."), 'P42'],
  ['rendez-vous pris seul', ajouter('annexe', 'Les rendez-vous sont pris automatiquement dans votre agenda.'), 'P42'],
  ['paiement encaissé par l\'IA', ajouter('registre', 'Les acomptes sont encaissés automatiquement.'), 'P42'],
  ['témoignage inventé', ajouter('readme', '« Un outil formidable » — témoignage de Exemple. Bâti-Démo.'), 'P42'],
  ['chiffre de gain', ajouter('matrice', 'Économisez du temps : 10 heures gagnées chaque semaine.'), 'P42'],
  ['promesse sur un drapeau baissé', ajouter('readme', 'Les organisations multi-membres sont déjà disponibles.'), 'P42'],
  ['phrase interdite cachée dans une liste « jamais » mal formée', remplacer('annexe', '- Passer ou prendre un appel téléphonique.', '- Passer ou prendre un appel téléphonique.\nMais l\'IA répond à vos appels le soir.'), 'J1'],
  ['matrice : type de valeur hors liste', remplacer('matrice', '| argent récupéré |', '| confort |'), 'X2'],
  ['matrice : workflow hors nommage', remplacer('matrice', '`ent-exemple-reporting`', '`rapport-du-lundi`'), 'X3'],
  ['matrice : base de départ chiffrée', remplacer('matrice', '| inconnue, à mesurer |', '| Exemple. 4 jours |'), 'X4'],
  ['matrice : irritant de temps sans signalement', remplacer('matrice', '| aucun ROI mesurable : KPI déclaré seulement (p5:298) |', '| — |'), 'X5'],
  ['matrice : irritant sans KPI non signalé', remplacer('matrice', '| sans KPI mesurable aujourd', '| à voir aujourd'), 'X6'],
  ['matrice : irritant absent de la fiche', remplacer('matrice', '| Exemple. I5 |', '| Exemple. I9 |'), 'X7'],
  ['registre : colonne « Base légale » retirée', (k) => ({ ...k, registre: k.registre.replace('| Base légale proposée |', '| Fondement |') }), 'R1'],
  ['registre : base légale inventée', remplacer('registre', '| intérêt légitime (suivi commercial du client) |', '| habitude du métier |'), 'R2'],
  ['registre : n8n lieu de stockage', remplacer('registre', '| Supabase (UE), sous RLS | à fixer au contrat | Exemple. « relance du palier J+3, partie » |', '| n8n sur Oracle | à fixer au contrat | Exemple. « relance du palier J+3, partie » |'), 'R3'],
  ['registre : modèle gratuit non interdit', (k) => ({ ...k, registre: k.registre.replaceAll('modèle gratuit en ligne', 'modèle quelconque') }), 'R5'],
  ['annexe : niveau par défaut automatique', remplacer('annexe', '| Relance de devis | carte à valider |', '| Relance de devis | automatique |'), 'A2'],
  ['annexe : type « réponse à une demande simple » retiré', (k) => ({ ...k, annexe: k.annexe.split('\n').filter((l) => !l.startsWith('| Réponse à une demande simple')).join('\n') }), 'A3'],
  ['annexe : niveau demandé hors liste', remplacer('annexe', '| Exemple. carte à valider | Exemple. aucun accord : reste en carte | mode ombre terminé ; porte', '| Exemple. tout seul | Exemple. aucun accord : reste en carte | mode ombre terminé ; porte'), 'A4'],
  ['annexe : geste URSSAF retiré', remplacer('annexe', "- Déclarer à l'URSSAF ou aux impôts.\n", ''), 'A5'],
  ['annexe : identifiant du code retiré', remplacer('annexe', '`supprimer_tarif`, ', ''), 'A6'],
  ['annexe : délai du pilote retiré', remplacer('annexe', '**10 minutes pour annuler**', '**un délai pour annuler**'), 'A8'],
  ['annexe : « rembourser » en type d\'action', remplacer('annexe', '| Alerte interne à un membre |', '| Rembourser un acompte |'), 'A7'],
  ['annexe : acceptation de Presti retirée', remplacer('annexe', '| Accepté pour Presti | Exemple. Benj | fondateur | Exemple. date de signature du contrat |', ''), 'A9'],
]

const MUTANTS_DONNEES = [
  ['fichier relances.json absent', (j) => ({ ...j, 'relances.json': undefined }), 'D1'],
  ['identifiant réel', (j) => ({ ...j, 'devis.json': [{ ...j['devis.json'][0], id: '3f2c9a10-1b2c-4d5e-8f90-123456789abc' }] }), 'D2'],
  ['ligne sans artisan_id', (j) => ({ ...j, 'devis.json': [{ ...j['devis.json'][0], artisan_id: undefined }] }), 'D3'],
  ['aucun titulaire', (j) => ({ ...j, 'membres.json': j['membres.json'].map((m) => ({ ...m, role: 'compagnon' })) }), 'D4'],
  ['adresse e-mail réelle', (j) => ({ ...j, 'demandes.json': [{ ...j['demandes.json'][0], email: 'marie.martin@orange.fr' }, ...j['demandes.json'].slice(1)] }), 'D5'],
  ['nom sans « Exemple. »', (j) => ({ ...j, 'demandes.json': [{ ...j['demandes.json'][0], nom: 'Marie Martin' }, ...j['demandes.json'].slice(1)] }), 'D6'],
  ['téléphone réel', (j) => ({ ...j, 'membres.json': [j['membres.json'][0], { ...j['membres.json'][1], telephone: '06 12 34 56 78' }] }), 'D7'],
  ['cas limite « escalade » manquant', (j) => ({ ...j, 'demandes.json': j['demandes.json'].filter((d) => d.cas_limite !== 'escalade') }), 'D8'],
]

function jouerMutants(nom, base, mutants, juger) {
  const resultats = []
  const temoin = juger(base)
  if (temoin.length) return { ok: false, lignes: [`✗ ${nom} : le témoin n'est pas vert (${temoin.length} défaut(s)) : les mutants ne prouvent rien`] }
  for (const [libelle, muter, attendu] of mutants) {
    let mute
    try { mute = muter(base) } catch (e) { resultats.push({ ok: false, ligne: `✗ mutant « ${libelle} » : ${e.message}` }); continue }
    const codes = [...new Set(juger(mute).map((x) => x.code))]
    const ok = codes.includes(attendu)
    resultats.push({ ok, ligne: `${ok ? '✓' : '✗'} mutant « ${libelle} » → ${codes.length ? codes.join(', ') : 'vert'} (attendu ${attendu})` })
  }
  const rouges = resultats.filter((r) => r.ok).length
  return { ok: rouges === mutants.length, lignes: [...resultats.map((r) => r.ligne), `${rouges === mutants.length ? '✓' : '✗'} ${nom} : ${rouges}/${mutants.length} rouges pour la raison attendue`] }
}

// ── Passage ──────────────────────────────────────────────────────────────────────────────────────────

function afficherDefauts(titre, defauts) {
  if (!defauts.length) { console.log(`✓ ${titre} : aucun défaut`); return }
  console.log(`✗ ${titre} : ${defauts.length} défaut(s)`)
  for (const x of defauts) console.log(`  ✗ [${x.code}] ${x.message}`)
}

function principal(argv) {
  const iDonnees = argv.indexOf('--donnees')
  let ok = true
  if (iDonnees >= 0) {
    const dossier = argv[iDonnees + 1]
    if (!dossier) { console.error('usage : node scripts/kit-entreprise-qa.mjs [--donnees <dossier>]'); return 2 }
    const absolu = path.resolve(RACINE, dossier)
    if (!fs.existsSync(absolu)) { console.log(`✗ jeu de données : dossier absent : ${dossier}`); ok = false }
    else {
      const defauts = jugerDonnees(lireDonnees(absolu))
      afficherDefauts(`jeu de données ${dossier}`, defauts)
      ok = !defauts.length
    }
  } else {
    const kit = lireKit()
    const code = lireCodePilote()
    if (code) console.log(`· ${FICHIER_REGLES_PILOTE} : ${code.outils.length} gestes « jamais automatiques », délai ${code.delai} min, plafond ${code.plafond} par jour`)
    const defauts = jugerKit(kit, code)
    afficherDefauts(`kit ${DOSSIER_KIT}`, defauts)
    ok = !defauts.length
    if (ok) {
      const m = jouerMutants('mutants du kit', kit, MUTANTS_KIT, (k) => jugerKit(k, code))
      for (const l of m.lignes) console.log(l)
      ok = m.ok
    }
  }
  const md = jouerMutants('mutants du jeu de données (jeu témoin en mémoire)', jeuTemoin(), MUTANTS_DONNEES, jugerDonnees)
  for (const l of md.lignes) console.log(l)
  ok = ok && md.ok
  console.log(`kit-entreprise-qa : ${ok ? 'PASS' : 'FAIL'}`)
  return ok ? 0 : 1
}

process.exit(principal(process.argv.slice(2)))
