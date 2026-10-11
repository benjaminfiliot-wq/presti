// Témoin du juge qualite-sites-qa (fiche 026-246) : une implémentation MINIMALE du contrat de CONTRAT.md, qui passe QSI-1 à QSI-9.
// Auto-contrôle du juge — il prouve que le juge sait dire « vert » ; il n'est JAMAIS installé comme scripts/agents/controleur-qualite.mjs
// (026-247 écrit la vraie production, avec Playwright, le coffre de l'usine et les gardes de l'agent). Chaque ligne que
// sabotages.json altère (une ancre exacte, unique) porte une règle du contrat : ne pas la reformuler sans mettre ce fichier à jour.
export const BUDGET_POIDS_OCTETS = 3 * 1024 * 1024
const SEUIL_TEXTE = 4.5
const SEUIL_GRAND_TEXTE = 3

function luminance([r, g, b]) {
  const c = [r, g, b].map((v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
export function ratioContraste(a, b) {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (clair + 0.05) / (sombre + 0.05)
}
const rgb = (texte) => { const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(String(texte ?? '')); return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null }
const arrondi = (x) => Math.round(x * 100) / 100
const grandTexte = (el) => el.taille_px >= 24 || (el.gras && el.taille_px >= 18.66)

const periode = (ms) => new Date(ms).toISOString().slice(0, 7)
const panne = (code, mesure, commande, ms) => ({ panne: code, mesure, cle_idempotence: `qualite_site:${commande}:${code}:${periode(ms)}` })
const hoteDe = (url) => new URL(url).hostname.replace(/^www\./, '')
const sansFragment = (url) => { const u = new URL(url); u.hash = ''; return u.href }
const texteVisible = (html) => String(html ?? '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const normaliser = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
const chiffresCollees = (s) => String(s ?? '').replace(/(\d)[\s .](?=\d)/g, '$1')
const POINT_ENTREE_REPOND = (s) => (s >= 200 && s < 400) || s === 401 || s === 403 || s === 405

async function verifierLien(url, lecteurPrudent) {
  let r
  try { r = await lecteurPrudent(url) } catch { return { url, mort: true, statut: null, raison: 'injoignable' } }
  if (r?.refus) {
    if (r.refus === 'injoignable') return { url, mort: true, statut: null, raison: 'injoignable' }
    if (r.refus === 'redirections') return { url, mort: true, statut: null, raison: 'boucle_redirections' }
    if (r.refus === 'trop_gros' || r.refus === 'type') return { url, mort: false, statut: null }
    return { url, mort: false, non_verifie: r.refus }
  }
  if (r.statut >= 400) return { url, mort: true, statut: r.statut, raison: `http_${r.statut}`, corps: r.corps }
  return { url, mort: false, statut: r.statut, corps: r.corps }
}

async function auditer(site, deps, ms) {
  const { navigateur, lecteurPrudent } = deps
  const id = site.commande_id
  const obs = await navigateur.ouvrir(site.url_en_ligne)
  const verdicts = { disponibilite: null, poids: null, accessibilite: null, liens: null, mentions: null, formulaire: null, visuel: null }

  // QSI-2 — ce que le navigateur a réellement reçu : code, protocole final, certificat (jamais déduits de l'URL demandée).
  const statut = obs.statut ?? null
  const dispo = { statut, protocole: obs.protocole ?? null, certificat_valide: obs.protocole === 'https' ? obs.certificat?.valide === true : null, url_finale: obs.url_finale ?? site.url_en_ligne, pannes: [] }
  verdicts.disponibilite = dispo
  if (statut === null || statut >= 400) dispo.pannes.push(panne('indisponible', { statut, erreur: obs.erreur ?? null }, id, ms))
  else {
    if (dispo.protocole === 'http') dispo.pannes.push(panne('http_non_securise', { protocole: 'http' }, id, ms))
    if (dispo.protocole === 'https' && dispo.certificat_valide === false) dispo.pannes.push(panne('certificat_invalide', { raison: obs.certificat?.raison ?? null }, id, ms))
  }
  if (statut === null || statut >= 400) return finir(id, ms, verdicts)

  // QSI-3 — les octets réellement reçus (réponse complète décodée), jamais l'en-tête Content-Length.
  const octets = obs.octets.length
  verdicts.poids = { octets, budget_octets: BUDGET_POIDS_OCTETS, pannes: octets > BUDGET_POIDS_OCTETS ? [panne('poids_excessif', { octets, budget_octets: BUDGET_POIDS_OCTETS }, id, ms)] : [] }

  // QSI-4 — ratio WCAG calculé sur les couleurs rendues ; alt manquant compté.
  const insuffisants = []
  for (const el of obs.elements_texte ?? []) {
    const fg = rgb(el.couleur), bg = rgb(el.fond)
    if (!fg || !bg) continue
    const ratio = ratioContraste(fg, bg), seuil = grandTexte(el) ? SEUIL_GRAND_TEXTE : SEUIL_TEXTE
    if (ratio < seuil) insuffisants.push({ element: el.selecteur, ratio: arrondi(ratio), seuil })
  }
  const imagesSansAlt = (obs.images ?? []).filter((i) => i.alt === null).length
  const acc = { controles: (obs.elements_texte ?? []).length, insuffisants, images_total: (obs.images ?? []).length, images_sans_alt: imagesSansAlt, pannes: [] }
  if (insuffisants.length) acc.pannes.push(panne('contraste_insuffisant', { insuffisants }, id, ms))
  if (imagesSansAlt) acc.pannes.push(panne('alt_manquant', { images_sans_alt: imagesSansAlt }, id, ms))
  verdicts.accessibilite = acc

  // QSI-5 — chaque lien interne distinct, par le lecteur prudent (robots.txt, 1 requête par seconde), jamais autrement.
  const racine = hoteDe(obs.url_finale ?? site.url_en_ligne)
  const vus = new Set([sansFragment(obs.url_finale ?? site.url_en_ligne)]), internes = []
  for (const l of obs.liens ?? []) {
    let u; try { u = new URL(l.href) } catch { continue }
    if (!/^https?:$/.test(u.protocol) || hoteDe(u.href) !== racine) continue
    const cle = sansFragment(u.href)
    if (vus.has(cle)) continue
    vus.add(cle); internes.push({ url: cle, texte: l.texte ?? '' })
  }
  const resultats = []
  for (const l of internes) resultats.push({ ...l, ...(await verifierLien(l.url, lecteurPrudent)) })
  const morts = resultats.filter((r) => r.mort).map((r) => ({ url: r.url, statut: r.statut, raison: r.raison }))
  const liens = { verifies: resultats.filter((r) => !r.non_verifie).length, liens_morts: morts, non_verifies: resultats.filter((r) => r.non_verifie).map((r) => ({ url: r.url, raison: r.non_verifie })), pannes: [] }
  if (morts.length) liens.pannes.push(panne('lien_mort', { liens_morts: morts }, id, ms))
  verdicts.liens = liens

  // QSI-6 — les mentions attendues de CETTE commande, cherchées dans le texte rendu (accueil + page des mentions légales).
  const pageLegale = resultats.find((r) => /mentions|l[ée]gal/i.test(`${new URL(r.url).pathname} ${r.texte}`))
  const texte = `${obs.texte ?? texteVisible(obs.html)} ${pageLegale?.corps ? texteVisible(pageLegale.corps) : ''}`
  const attendues = Object.entries(site.mentions_attendues ?? {}).filter(([, v]) => v), presentes = [], absentes = []
  for (const [nom, valeur] of attendues) {
    const trouve = nom === 'siren' ? chiffresCollees(texte).includes(String(valeur).replace(/\D/g, '')) : normaliser(texte).includes(normaliser(valeur))
    ;(trouve ? presentes : absentes).push(nom)
  }
  verdicts.mentions = { attendues: attendues.map(([n]) => n), presentes, absentes, pannes: absentes.length ? [panne('mentions_absentes', { absentes }, id, ms)] : [] }

  // QSI-7 — formulaire de contact, contrôle PASSIF : sa présence dans le HTML rendu, puis un GET sur son point d'entrée.
  const formes = obs.formulaires ?? []
  const forme = formes.find((f) => (f.champs ?? []).some((c) => c.type === 'textarea')) ?? formes[0]
  const form = { present: Boolean(forme), action: null, methode: null, champs: [], point_entree_statut: null, pannes: [] }
  if (!forme) form.pannes.push(panne('formulaire_absent', {}, id, ms))
  else {
    form.methode = String(forme.methode || 'GET').toUpperCase()
    form.champs = (forme.champs ?? []).map((c) => c.nom).filter(Boolean)
    if (!forme.action) form.pannes.push(panne('formulaire_sans_action', { methode: form.methode }, id, ms))
    else {
      form.action = new URL(forme.action, obs.url_finale ?? site.url_en_ligne).href
      const r = await verifierLien(form.action, lecteurPrudent)
      form.point_entree_statut = r.non_verifie ? null : r.statut
      if (!r.non_verifie && (r.mort && r.raison !== 'http_401' && r.raison !== 'http_403' && r.raison !== 'http_405')) form.pannes.push(panne('formulaire_injoignable', { statut: r.statut, raison: r.raison }, id, ms))
    }
  }
  verdicts.formulaire = form

  // QSI-8 — avis visuel : Codex seul, données personnelles déclarées ; sinon « non_mesure », jamais un moteur gratuit ni :cloud.
  const cfg = deps.MOTEUR_DE?.qualite_sites
  const permis = cfg && cfg.moteur === 'codex' && cfg.personnelles === true && !/cloud/i.test(String(cfg.modele ?? '')) && typeof deps.moteur === 'function' && obs.capture?.length > 0
  verdicts.visuel = permis
    ? { verdict: String(await deps.moteur(obs.capture, { moteur: cfg.moteur, modele: cfg.modele, personnelles: true })), moteur: 'codex', pannes: [] }
    : { verdict: 'non_mesure', moteur: null, pannes: [] }
  return finir(id, ms, verdicts)
}

function finir(id, ms, verdicts) {
  const pannes = Object.values(verdicts).filter(Boolean).flatMap((v) => v.pannes ?? [])
  return { commande_id: id, periode: periode(ms), mesure_le: new Date(ms).toISOString(), sain: pannes.length === 0, verdicts }
}

export async function passeQualite(deps) {
  const { magasin, horloge } = deps
  const travail = await magasin.travail()
  if (travail?.pause) return { pause: true, audits: [] }
  const audits = []
  for (const site of travail?.sites ?? []) {
    if (site.compte_supprime_le || site.retiree_le || site.etat === 'retiree') { audits.push({ commande_id: site.commande_id, statut: 'exclu_retrait' }); continue }
    if (!site.url_en_ligne) { audits.push({ commande_id: site.commande_id, statut: 'livraison_inachevee' }); continue }
    const rapport = await auditer(site, deps, horloge.maintenant())
    await magasin.rapport(rapport)
    audits.push({ commande_id: site.commande_id, statut: 'audite', sain: rapport.sain, pannes: Object.values(rapport.verdicts).filter(Boolean).flatMap((v) => v.pannes ?? []).map((p) => p.panne) })
  }
  await magasin.battement('qualite_sites')
  return { audits }
}
