// scripts/fixtures/026-pilotage/c/tirages.mjs — les tirages au hasard du juge d'écran de la station (lot c, fiche 026-104,
// écrit par Claude Code). Chaque passage tire les montants, les compteurs, les comptes à rebours et les textes de la base
// des jeux d'essai ; le juge compare l'écran à CE qu'il vient de tirer : un écran qui recopie un gabarit ne passe pas deux
// fois. Chaque tirage reste au contrat des vues (s/contrat-vues.mjs) : aucun « @ », aucun 9 chiffres de suite, aucun « http ».
import { jeu } from './commun.mjs'

const MODELES = ['MODÈLE gpt-6-luna · Codex', 'MODÈLE gpt-6-sol · Codex', 'MODÈLE llama-4-scout · Cerebras · gratuit', 'MODÈLE qwen-3 · Ollama local · gratuit', 'sans IA']
const METIERS = ['plombier', 'couvreur', 'menuisier', 'électricien', 'maçon', 'carreleur', 'peintre']
const VILLES = ['Lyon', 'Annecy', 'Nantes', 'Grenoble', 'Chambéry', 'Valence', 'Dijon']
const ACTIVITES = ['Maquette %m, %v', 'Formulaire soumis : %m', 'Site lu : %m (%v)', 'Réponse classée : oui', 'Faits vérifiés : %n', 'Message écrit : variante %l']
const SANTE = [['en ligne', null], ['dégradée', 'Stripe lent'], ['hors ligne', 'base injoignable']]

/** Les chiffres d'un texte remplacés par un tirage (même forme : « 12/20 · P2 » → « 7/31 · P2 »). */
function retirer(h, texte) { return String(texte).replace(/\d+/g, (x) => String(h.entre(x.length > 1 ? 1 : 0, x.length > 1 ? 97 : 9))) }

export function tirerTresorerie(h) {
  const net = h.montant(120, 9800), depenses = h.montant(15, 950), marge = Math.round((net - depenses) * 100) / 100
  const frais = Math.round(net * 0.029 * 100) / 100
  const t = jeu('tresorerie.json').reponse
  t.encaisse.mois.valeur = { brut: Math.round((net + frais) * 100) / 100, frais, net, paiements: h.entre(1, 40), rembourse: 0 }
  t.encaisse.mois.source = h.parmi(['stripe', 'stripe_live'])
  t.mrr.valeur = { mrr: h.montant(29, 900), abonnements: h.entre(1, 30) }
  t.depenses_mois.valeur = depenses
  t.depenses_mois.source = h.parmi(['achats_et_couts', 'supabase'])
  t.marge.valeur = marge
  t.marge.source = h.parmi(['marge_du_mois', 'supabase'])
  t.tva.valeur.texte = `${h.entre(2, 60)} % du seuil de franchise`
  return { statut: 200, reponse: t, tire: { net, depenses, marge, brut: t.encaisse.mois.valeur.brut, frais, paiements: t.encaisse.mois.valeur.paiements, mrr: t.mrr.valeur.mrr, tva: t.tva.valeur.texte, sources: { encaisse_mois: t.encaisse.mois.source, depense_mois: t.depenses_mois.source, marge_mois: t.marge.source } } }
}

/** vue=direct tirée : barre, équipage, Attention, Commandement, bandeau. `base` : un jeu de vue=direct (défaut vues/direct.json). */
export function tirerDirect(h, base = 'vues/direct.json') {
  const d = jeu(base).reponse
  const v = d.valeur
  const b = v.barre.valeur
  for (const c of b.compteurs) {
    if (c.ton !== 'muet') c.texte = retirer(h, c.texte)
    c.source = `${c.source}${h.parmi(['', '_v2', '_jour'])}`
  }
  b.cloche = h.entre(1, 60)
  b.jour = `JOUR ${h.entre(1, 240)}`
  b.nuit = h.suivant() < 0.5
  b.auto = { actif: h.suivant() < 0.5, texte: 'AUTO' }
  b.version.valeur = Array.from({ length: 7 }, () => '0123456789abcdef'[h.entre(0, 15)]).join('')
  const [etat, raison] = h.parmi(SANTE)
  b.sante.valeur = { etat, raison }
  b.erreurs.valeur = h.entre(1, 40)
  b.commandes_mois.valeur = h.entre(0, 90)
  b.sites_en_ligne.valeur = h.entre(0, 90)
  if (v.equipage.valeur) {
    for (const a of v.equipage.valeur.agents) {
      if (!a.activite.includes('<img')) a.activite = h.parmi(ACTIVITES).replace('%m', h.parmi(METIERS)).replace('%v', h.parmi(VILLES)).replace('%n', String(h.entre(1, 40))).replace('%l', h.parmi(['A', 'B', 'C']))
      a.modele = { texte: h.parmi(MODELES), source: 'vu' }
      a.cadence = h.parmi(['toutes les 5 min', 'toutes les 15 min', 'toutes les 30 min', 'une fois par jour'])
      a.activite_le = new Date(Date.parse(a.activite_le) - h.entre(0, 600) * 60_000).toISOString()
    }
    v.equipage.valeur.agents[h.entre(0, v.equipage.valeur.agents.length - 1)].modele = { texte: 'sans IA', source: 'aucun' }
    for (const c of v.equipage.valeur.couts.valeur) c.cout_mois_eur = h.montant(0, 30)
  }
  if (v.attention.valeur && v.attention.valeur.cartes.length) {
    for (const c of v.attention.valeur.cartes) { const n = h.entre(1, 9); c.titre = c.titre.replace(/^\d+/, String(n)); c.nombre = n }
    v.attention.valeur.total = v.attention.valeur.cartes.length + h.entre(0, 30)
    b.cloche = v.attention.valeur.total
  }
  const cmd = v.commandement.valeur
  if (cmd) {
    for (const m of cmd.missions) { m.cible = h.entre(2, 200); m.valeur = h.entre(0, m.cible); m.texte = `${m.valeur}/${m.cible}`; m.atteinte = m.valeur >= m.cible }
    const n = cmd.argent.valeur?.niveau
    if (n) { n.lv = h.entre(1, 9); n.xp = h.entre(0, 999); n.prochainSeuil = 1000; n.part = n.xp / 1000; n.texte = `${n.xp} / 1 000 XP` }
    cmd.compteRendu = cmd.compteRendu.map((l) => retirer(h, l))
  }
  if (v.bandeau.valeur) v.bandeau.valeur.elements = v.bandeau.valeur.elements.map((e) => ({ ...e, texte: `${h.parmi(['Site', 'Pack', 'Oui'])} · ${h.parmi(METIERS)}, ${h.parmi(VILLES)} · ${h.entre(20, 900)} €` }))
  return { statut: 200, reponse: d }
}

/** Les sources des compteurs tirées (VU-4 : l'Aide doit les lire dans ce qui est servi). */
export function tirerSources(h, direct) {
  for (const c of direct.reponse.valeur.barre.valeur.compteurs) c.source = `${h.parmi(['pilotage', 'station', 'jauges', 'acq'])}_${h.parmi(['agents', 'chef', 'compteurs', 'reunion', 'envois'])}_${h.entre(10, 99)}`
  return direct
}
