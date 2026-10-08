import fs from 'node:fs'
import path from 'node:path'

// Un moteur sans adaptateur vérifié reste visible mais ne reçoit aucune fiche.
export const PARC = Object.freeze([
  { nom: 'codex', cout: 'abonnement', aptitudes: ['code', 'redaction'], taille: 'grande', fort: true, commande: ['node', 'scripts/executant.mjs', 'lancer'] },
  { nom: 'haiku', cout: 'abonnement', aptitudes: ['code', 'redaction', 'petit-code'], taille: 'grande', fort: false, commande: ['node', 'scripts/executant.mjs', 'lancer', '--moteur=haiku'] },
  { nom: 'antigravity', cout: 'gratuit', aptitudes: ['code', 'redaction'], taille: 'grande', fort: true, commande: ['node', 'scripts/executant.mjs', 'lancer', '--moteur=antigravity'] },
  { nom: 'codex-gratuit', cout: 'gratuit', aptitudes: ['code', 'redaction'], taille: 'moyenne', fort: false, commande: ['node', 'scripts/executant.mjs', 'lancer', '--moteur=codex-gratuit'] },
  { nom: 'ollama-local', cout: 'gratuit', aptitudes: ['redaction', 'petit-code'], taille: 'petite', fort: false, commande: null },
  { nom: 'hermes', cout: 'gratuit', aptitudes: ['redaction', 'relecture'], taille: 'moyenne', fort: false, commande: null },
  { nom: 'atomic-agent', cout: 'gratuit', aptitudes: ['redaction'], taille: 'petite', fort: false, commande: null },
  { nom: 'openclaw', cout: 'inconnu', aptitudes: ['redaction'], taille: 'petite', fort: false, commande: null },
  { nom: 'perplexity', cout: 'abonnement', aptitudes: ['recherche web'], taille: 'inconnue', fort: false, commande: null },
  { nom: 'firecrawl', cout: 'abonnement', aptitudes: ['veille', 'recherche web'], taille: 'inconnue', fort: false, commande: null },
  { nom: 'fish-audio', cout: 'abonnement', aptitudes: ['voix'], taille: 'inconnue', fort: false, commande: null },
])
export function quotaActif(journal, nom, maintenant = Date.now()) {
  try { return Date.parse(JSON.parse(fs.readFileSync(journal, 'utf8'))[nom]?.jusqua || '') > maintenant } catch { return false }
}
export function sensible(perimetre) { return perimetre.some((p) => /(?:^|\/)(?:security|securite|stripe|paiement|facture|auth|client|supabase)(?:\/|\.|$)/i.test(p)) }
export function choisirMoteur({ moteurs = PARC, aptitude = 'code', perimetre = [], journal, payant = false, sonde = () => true, jugeFort = false }) {
  for (const m of moteurs) {
    if (!m.aptitudes.includes(aptitude)) continue
    if (m.cout !== 'gratuit' && m.cout !== 'abonnement' && !payant) continue
    if (m.cout === 'payant' && !payant) continue
    if (!m.fort && sensible(perimetre) && !jugeFort) continue
    if (!m.commande || journal && quotaActif(journal, m.nom)) continue
    try { if (!sonde(m)) continue } catch { continue }
    return m
  }
  return null
}
export function noterQuota(journal, moteur, jusqua) {
  if (!Number.isFinite(Date.parse(jusqua))) throw new Error('échéance de quota invalide')
  let etat = {}; try { etat = JSON.parse(fs.readFileSync(journal, 'utf8')) } catch { /* premier quota */ }
  etat[moteur] = { jusqua, vu: new Date().toISOString() }
  fs.mkdirSync(path.dirname(journal), { recursive: true })
  fs.writeFileSync(journal, JSON.stringify(etat, null, 2) + '\n')
}
