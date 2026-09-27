// Écrit les témoins qui sont des fichiers existants modifiés (fins de ligne en \n) : chaque remplacement doit trouver son
// texte exactement une fois dans le fichier du dépôt. Relancé : repart du fichier du dépôt.
//   node .orchestre/preuves/026-026/outils/temoins-derives.mjs [morceau du chemin]
import fs from 'node:fs'
import path from 'node:path'

const R = path.resolve('.')
const T = path.join(R, 'scripts/fixtures/026-livraison-tresor/d/temoin')
function deriver(rel, remplacements) {
  let t = fs.readFileSync(path.join(R, rel), 'utf8').replace(/\r\n/g, '\n')
  for (const [de, a] of remplacements) {
    const n = t.split(de).length - 1
    if (n !== 1) throw new Error(`${rel} : « ${de.slice(0, 70)} » trouvé ${n} fois`)
    t = t.replace(de, () => a)
  }
  const sortie = path.join(T, `${rel}.temoin`)
  fs.mkdirSync(path.dirname(sortie), { recursive: true })
  fs.writeFileSync(sortie, t)
  console.log('écrit', path.relative(R, sortie).split(path.sep).join('/'))
}

const TACHES = {
  // ── 026-031 : la purge relève les sites en ligne AVANT d'effacer, et date la suppression APRÈS une purge réussie ──────
  'lib/purgeComptes.ts': [
    ["import { PREFIXE_ADRESSE_PURGEE } from '@/lib/urls'\n", "import { PREFIXE_ADRESSE_PURGEE } from '@/lib/urls'\nimport { commandesEnLigneDe, marquerSuppression } from '@/lib/siteRetrait'\n"],
    ['      const aFacture = (count ?? 0) > 0\n      const echec = aFacture', "      const aFacture = (count ?? 0) > 0\n      // Article 3 bis (026-031) : les sites en ligne de l'artisan, relevés AVANT la purge (après, artisan_id passe à nul).\n      let enLigne: string[] = []\n      try { enLigne = await commandesEnLigneDe(c.id) } catch (e) { console.error('[purge-comptes] sites en ligne', c.id, e instanceof Error ? e.message : e) }\n      const echec = aFacture"],
    ['        continue\n      }\n      if (aFacture) anonymises++', "        continue\n      }\n      try { await marquerSuppression(enLigne) } catch (e) { console.error('[purge-comptes] suppression datée', c.id, e instanceof Error ? e.message : e) }\n      if (aFacture) anonymises++"],
  ],
  // ── 026-031 (retraits, purge des dossiers) et 026-141 (pause du bus, sorties de l'usine, clôture, battement) ────────────
  'lib/siteLivraison.ts': [
    ["import { envoyerAlertes, enregistrerPassage, type Alerte } from '@/lib/alertes'\n", "import { envoyerAlertes, enregistrerPassage, type Alerte } from '@/lib/alertes'\nimport { retraitsDus, retirer } from '@/lib/siteRetrait'\nimport { purgerFichiersExpires } from '@/lib/siteDossier'\nimport { busEnPause, cloreTacheLivraison, battementLivreur } from '@/lib/siteLivraisonBus'\nimport { consommerSortiesUsine } from '@/lib/siteLivraisonUsine'\n"],
    ['  enPause: d.enPause ?? (async () => false),', '  enPause: d.enPause ?? busEnPause,'],
    ["  } catch (e) { bilan.erreurs++; console.error('[livraison] courriels', e) }\n  try {\n    if (!(await d.enPause())) bilan.retards", `  } catch (e) { bilan.erreurs++; console.error('[livraison] courriels', e) }
  // 026-141 : la pause du bus est lue une fois ; en cas de doute, on ne retire rien et on ne génère rien.
  let pause = true
  try { pause = await d.enPause() } catch { pause = true }
  if (!pause) {
    try { await consommerSortiesUsine({}) } catch (e) { bilan.erreurs++; console.error('[livraison] sorties de l’usine', e instanceof Error ? e.message : e) }
  }
  try {
    const limite = d.maintenant().getTime() - 30 * 86_400_000
    const { data, error } = await d.base.from('sites_commandes').select('id, etat, genere_le, valide_le, en_ligne_le').in('etat', ['generee', 'validee', 'en_ligne']).order('modifie_le', { ascending: false }).limit(200)
    if (error) throw new Error(error.message)
    const recentes = (data ?? []).filter((c) => {
      const depuis = c.etat === 'generee' ? c.genere_le : c.etat === 'validee' ? c.valide_le : c.en_ligne_le
      return depuis && new Date(depuis).getTime() >= limite
    }).slice(0, 20)
    for (const c of recentes) if ((await cloreTacheLivraison(c.id, c.etat)) === 'erreur') bilan.erreurs++
  } catch (e) { bilan.erreurs++; console.error('[livraison] tâches du bus', e instanceof Error ? e.message : e) }
  try {
    if (!(await d.enPause())) bilan.retards`],
    ["  await enregistrerPassage('livraison', bilan, bilan.erreurs === 0)\n  return bilan", `  // 026-031 : l'article 3 bis — les retraits dus (10 au plus), puis la purge des dossiers expirés ; rien en pause.
  if (!pause) {
    try {
      const dus = await retraitsDus()
      for (const c of dus.slice(0, 10)) {
        try { await retirer(c) } catch (e) { bilan.erreurs++; console.error('[livraison] retrait', c.id, e instanceof Error ? e.message : e) }
      }
    } catch (e) { bilan.erreurs++; console.error('[livraison] retraits', e instanceof Error ? e.message : e) }
    try { await purgerFichiersExpires() } catch (e) { bilan.erreurs++; console.error('[livraison] dossiers expirés', e instanceof Error ? e.message : e) }
  }
  await enregistrerPassage('livraison', bilan, bilan.erreurs === 0)
  // 026-141 : le livreur bat seulement quand le tour a réussi (un livreur qui échoue devient muet pour le veilleur).
  if (bilan.erreurs === 0) await battementLivreur()
  return bilan`],
  ],
}

// ── 026-078 : le Poste ──────────────────────────────────────────────────────────────────────────────────────────────────
TACHES['lib/direction/journal.ts'] = [
  ["  | 'site_valide' | 'site_regeneration' | 'site_en_ligne'", "  | 'site_valide' | 'site_regeneration' | 'site_en_ligne'\n  // 026-078 : la soumission du plan à la Search Console (repli de 026-201) et le dossier envoyé sur simple demande.\n  | 'site_search_console' | 'site_dossier_envoye'"],
]
TACHES['app/api/controle/sites/route.ts'] = [
  ["import { ETATS, type EtatCommande } from '@/lib/siteCommande'", "import { ETATS, erreursFabrication, type Commande, type EtatCommande } from '@/lib/siteCommande'"],
  ["genere_le, valide_le, en_ligne_le, scores, verifications, consigne, regenerations, cree_le, modifie_le')", "genere_le, valide_le, en_ligne_le, search_console_le, retiree_le, dossier_envoye_le, scores, verifications, consigne, regenerations, cree_le, modifie_le, matiere')"],
  ["  if (etat && ETATS.includes(etat as EtatCommande) && etat !== 'brouillon') q = q.eq('etat', etat)", "  if (etat && (ETATS.includes(etat as EtatCommande) || etat === 'retiree') && etat !== 'brouillon') q = q.eq('etat', etat)"],
  ["  return NextResponse.json({ commandes: (data ?? []).map((c) => ({ ...c, artisan:", `  // 026-078 : le résumé de la matière, jamais la matière brute (SIREN, adresse, photos d'origine restent en base).
  const resume = (c: Record<string, unknown>) => {
    const m = (c.matiere ?? {}) as { photos?: unknown[]; artisan?: unknown; prestations?: unknown[] }
    let manquants: string[] = []
    try { manquants = erreursFabrication(c as unknown as Commande) } catch { manquants = ['dossier illisible'] }
    return { photos: Array.isArray(m.photos) ? m.photos.length : 0, voix: !!m.artisan, prestations: Array.isArray(m.prestations) ? m.prestations.length : 0, manquants }
  }
  return NextResponse.json({ commandes: (data ?? []).map(({ matiere: _matiere, ...c }) => ({ ...c, matiere_resume: resume({ ...c, matiere: _matiere }), artisan:`],
]
TACHES['app/api/controle/sites/[id]/route.ts'] = [
  ["import { addDomain, normalizeDomain, type DnsRecord } from '@/lib/vercelDomains'\n", `import { addDomain, normalizeDomain, type DnsRecord } from '@/lib/vercelDomains'
import type { Fondateur } from '@/lib/direction/garde'
import { exigerReconfirmation } from '@/lib/direction/reconfirmation'
import { creerJetonDossier } from '@/lib/siteDossier'
import { sendEmail } from '@/lib/email'
`],
  ['type Action = keyof typeof ACTIONS\n', `type Action = keyof typeof ACTIONS

// 026-078 : trois gestes de plus, traités à part pour que les trois premiers restent tels quels.
const NOUVELLES = ['valider_et_mettre_en_ligne', 'search_console', 'envoyer_dossier'] as const
type Nouvelle = (typeof NOUVELLES)[number]

async function actionNouvelle(req: Request, f: Fondateur, id: string, action: Nouvelle) {
  const { data: c, error } = await reprise(() => supabaseAdmin.from('sites_commandes').select('id, artisan_id, etat, email, domaine, domaine_mode, search_console_le').eq('id', id).maybeSingle(), (r) => !r.error)
  if (error) return NextResponse.json({ error: 'Commande indisponible.', code: 'indisponible' }, { status: 503 })
  if (!c) return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
  const maintenant = new Date().toISOString()
  const journal = (nom: 'site_en_ligne' | 'site_search_console' | 'site_dossier_envoye', avant: unknown, apres: unknown, reconfirme = false) =>
    reprise(() => journaliser({ acteur: f, action: nom, cible_type: 'site_commande', cible_id: id, artisan_id: c.artisan_id ?? undefined, avant, apres, reconfirme }, req).catch(() => false), (ok) => ok === true)
  const refusJournal = () => NextResponse.json({ error: 'Le journal de direction est indisponible : geste refusé.', code: 'indisponible' }, { status: 503 })
  const impossible = (quoi: string) => NextResponse.json({ error: \`Impossible depuis l'état « \${c.etat} » : \${quoi}.\` }, { status: 409 })
  if (action === 'valider_et_mettre_en_ligne') {
    if (c.etat !== 'generee') return impossible('la mise en ligne en un geste demande une commande générée')
    if (!(await siteDepose(id))) return NextResponse.json({ error: 'Aucun site déposé pour cette commande (scripts/site-deposer.mjs).' }, { status: 409 })
    let dns: DnsRecord[] = []
    const domaine = c.domaine_mode !== 'aucun' && c.domaine ? normalizeDomain(c.domaine) : null
    if (domaine) {
      const statut = await addDomain(domaine)
      if (!statut.ok) return NextResponse.json({ error: \`Domaine \${domaine} : \${statut.error || 'rattachement refusé'}\` }, { status: 502 })
      dns = statut.records
    }
    if (!(await journal('site_en_ligne', { etat: 'generee' }, { etat: 'en_ligne' }))) return refusJournal()
    const { data: passe, error: eMaj } = await reprise(() => supabaseAdmin.from('sites_commandes').update({ etat: 'en_ligne', valide_le: maintenant, en_ligne_le: maintenant, modifie_le: maintenant }).eq('id', id).eq('etat', 'generee').select('id, etat, valide_le, en_ligne_le'), (r) => !r.error)
    if (eMaj) return NextResponse.json({ error: 'Écriture impossible.', code: 'indisponible' }, { status: 503 })
    if (!passe || passe.length === 0) return NextResponse.json({ error: 'La commande a changé entre-temps : rechargez.' }, { status: 409 })
    if (c.artisan_id) await supabaseAdmin.from('artisans').update({ site_origine: 'commande' }).eq('id', c.artisan_id)
    return NextResponse.json({ ok: true, commande: passe[0], dns })
  }
  if (action === 'search_console') {
    if (c.etat !== 'en_ligne') return impossible('le plan ne se soumet que pour un site en ligne')
    if (c.search_console_le) return NextResponse.json({ ok: true, deja: true, search_console_le: c.search_console_le })
    if (!(await journal('site_search_console', { search_console_le: null }, { search_console_le: maintenant }))) return refusJournal()
    const { error: eSc } = await supabaseAdmin.from('sites_commandes').update({ search_console_le: maintenant }).eq('id', id).is('search_console_le', null)
    if (eSc) return NextResponse.json({ error: 'Écriture impossible.', code: 'indisponible' }, { status: 503 })
    return NextResponse.json({ ok: true, search_console_le: maintenant })
  }
  if (c.etat !== 'en_ligne' && c.etat !== 'retiree') return impossible('le dossier ne s’envoie que pour un site en ligne ou retiré')
  // Écrire à un client (plan §4.3) : reconfirmation « artisan ».
  const refus = await exigerReconfirmation(req, f.uid, 'artisan')
  if (refus) return refus
  if (!(await journal('site_dossier_envoye', { etat: c.etat }, { dossier: 'envoye' }, true))) return refusJournal()
  const jeton = await creerJetonDossier(id, 90)
  const lien = \`https://prestiapp.fr/api/site-dossier/\${id}?j=\${encodeURIComponent(jeton)}\`
  const envoi = await sendEmail({ to: c.email, subject: 'Le dossier complet de votre site', text: \`Bonjour,\\n\\nComme le prévoit l’article 3 bis des conditions générales, voici le dossier complet de votre site (pages, images, plan du site), à télécharger ici :\\n\${lien}\\n\\nCe lien est valable 90 jours.\\n\\nL’équipe Presti\`, critique: true })
  if (!envoi.ok) return NextResponse.json({ error: 'L’e-mail n’est pas parti : réessayez.' }, { status: 502 })
  await supabaseAdmin.from('sites_commandes').update({ dossier_envoye_le: maintenant }).eq('id', id)
  return NextResponse.json({ ok: true, dossier_envoye_le: maintenant })
}
`],
  ["  if (!(action in ACTIONS)) return NextResponse.json({ error: 'Action inconnue : valider, regenerer ou mettre_en_ligne.' }, { status: 400 })", "  if ((NOUVELLES as readonly string[]).includes(String(corps.action))) return actionNouvelle(req, f, id, String(corps.action) as Nouvelle)\n  if (!(action in ACTIONS)) return NextResponse.json({ error: 'Action inconnue : valider, regenerer, mettre_en_ligne, valider_et_mettre_en_ligne, search_console ou envoyer_dossier.' }, { status: 400 })"],
]
TACHES['app/api/controle/a-faire/route.ts'] = [
  ["import { CRONS_ATTENDUS } from '@/lib/alertes'\n", "import { CRONS_ATTENDUS } from '@/lib/alertes'\nimport { heuresOuvreesEntre } from '@/lib/siteLivraison'\nimport { erreursFabrication, type Commande } from '@/lib/siteCommande'\n"],
  ["export type Ligne = { id: string; type: 'paiement' | 'alerte' | 'cron';", "export type Ligne = { id: string; type: 'paiement' | 'alerte' | 'cron' | 'commande';"],
  ["const LIBELLES_TYPE = { paiement: 'Paiement', alerte: 'Alerte', cron: 'Tâche' } as const", "const LIBELLES_TYPE = { paiement: 'Paiement', alerte: 'Alerte', cron: 'Tâche', commande: 'Site' } as const"],
  ["'purges-rgpd': 'Purges RGPD' }", "'purges-rgpd': 'Purges RGPD', livraison: 'Livraison des sites' }"],
  ['const cronsEnRetard = () =>', `// 026-078 : les commandes de site qui attendent un geste humain.
type CommandeAttente = { id: string; artisan_id: string | null; etat: string; paye_le: string | null; genere_le: string | null; valide_le: string | null; en_ligne_le: string | null; search_console_le: string | null; nom: string | null }
const commandesEnAttente = () => sourcer('afaire:commandes', 'supabase', async () => {
  const { data, error } = await supabaseAdmin.from('sites_commandes').select('id, artisan_id, etat, paye_le, genere_le, valide_le, en_ligne_le, search_console_le, domaine_mode, domaine, metier, metiers_secondaires, communes, matiere').in('etat', ['payee', 'generee', 'validee', 'en_ligne']).limit(200)
  if (error) throw new Error(error.message)
  const ids = [...new Set((data ?? []).map((c) => c.artisan_id).filter(Boolean))] as string[]
  const { data: artisans } = ids.length ? await supabaseAdmin.from('artisans').select('id, nom').in('id', ids) : { data: [] as { id: string; nom: string | null }[] }
  const noms = new Map((artisans ?? []).map((a) => [a.id as string, (a.nom as string | null) ?? null]))
  return (data ?? []).map((c) => ({ ...c, nom: (c.artisan_id && noms.get(c.artisan_id)) || null, complet: erreursFabrication(c as unknown as Commande).length === 0 })) as (CommandeAttente & { complet: boolean })[]
})

const cronsEnRetard = () =>`],
  ['  const [echecs, alertes, crons] = await Promise.all([echecsRecents(), alertesOuvertes(), cronsEnRetard()])\n  const lignes: Ligne[] = []', `  const [echecs, alertes, crons, commandes] = await Promise.all([echecsRecents(), alertesOuvertes(), cronsEnRetard(), commandesEnAttente()])
  const lignes: Ligne[] = []
  const maintenant = new Date()
  const onglet: Action = { libelle: 'Ouvrir l’onglet Sites', route: '/controle?onglet=sites', methode: 'GET', reconfirmation: false }
  for (const c of commandes.valeur ?? []) {
    const heures = (d: string | null) => (d ? heuresOuvreesEntre(new Date(d), maintenant) : 0)
    const nom = c.nom || 'Artisan sans compte'
    let libelle: string | null = null, detail = nom, action = onglet
    if (c.etat === 'payee' && heures(c.paye_le) > 24) {
      if (!c.complet) { libelle = 'Appeler l’artisan : dossier incomplet'; action = { libelle: 'Ouvrir la fiche client', route: '/controle?onglet=clients', methode: 'GET', reconfirmation: false } }
      else { libelle = 'Générer le site'; detail = \`\${nom} · node --import ./scripts/ts-loader.mjs scripts/livrer-site.mjs \${c.id}\` }
    } else if (c.etat === 'generee') libelle = 'Relire et mettre en ligne'
    else if (c.etat === 'validee') libelle = 'Mettre en ligne'
    else if (c.etat === 'en_ligne' && !c.search_console_le && heures(c.en_ligne_le) > 24) libelle = 'Soumettre le plan du site à la Search Console'
    if (!libelle) continue
    lignes.push({ id: \`commande:\${c.id}\`, type: 'commande', libelleType: LIBELLES_TYPE.commande, gravite: heures(c.valide_le) > 48 ? 'critique' : 'attention', libelle, detail, a: c.paye_le ?? maintenant.toISOString(), source: 'supabase', action })
  }`],
  ['  const sources = { stripe: { a: echecs.a, erreur: echecs.erreur }, alertes: { a: alertes.a, erreur: alertes.erreur }, crons: { a: crons.a, erreur: crons.erreur } }', '  const sources = { stripe: { a: echecs.a, erreur: echecs.erreur }, alertes: { a: alertes.a, erreur: alertes.erreur }, crons: { a: crons.a, erreur: crons.erreur }, commandes: { a: commandes.a, erreur: commandes.erreur } }'],
]
TACHES['app/controle/Sites.tsx'] = [
  ['  apercu?: string | null\n}', "  apercu?: string | null\n  search_console_le?: string | null\n  retiree_le?: string | null\n  dossier_envoye_le?: string | null\n  matiere_resume?: { photos: number; voix: boolean; prestations: number; manquants: string[] }\n}"],
  ["  { id: 'en_ligne', label: 'En ligne' },\n]", "  { id: 'en_ligne', label: 'En ligne' },\n  { id: 'retiree', label: 'Retirés' },\n]"],
  ['  const colonnes = 6\n', `  // 026-078 : mettre en ligne en un geste, noter le plan soumis, envoyer le dossier (reconfirmation « artisan »).
  const geste = async (c: Commande, action: 'valider_et_mettre_en_ligne' | 'search_console' | 'envoyer_dossier', message: string) => {
    if (action === 'valider_et_mettre_en_ligne' && !window.confirm(\`Le site relu sera mis en ligne\${c.domaine ? \` sur \${c.domaine}\` : ''}, tel quel.\`)) return
    setBusyId(c.id)
    try {
      const r = await apiDirection<{ ok?: boolean; dns?: { type: string; name: string; value: string }[]; error?: string }>(\`/api/controle/sites/\${c.id}\`, { method: 'POST', body: JSON.stringify({ action }) }, true)
      if (r.ok) {
        signaler?.({ type: 'ok', text: message })
        if (r.data.dns && r.data.dns.length > 0) setDnsParCommande((prev) => ({ ...prev, [c.id]: r.data.dns! }))
        void charger(etatFiltre)
      } else signaler?.({ type: 'err', text: r.data.error ?? 'Action refusée.' })
    } finally {
      setBusyId(null)
    }
  }

  const colonnes = 6
`],
  ["                          Domaine : {c.domaine_mode} ({c.domaine || 'aucun'})<br />", "                          Domaine : {c.domaine_mode} ({c.domaine || 'aucun'})<br />\n                          {c.matiere_resume ? <>Matière : {c.matiere_resume.photos} photo(s), {c.matiere_resume.prestations} prestation(s), voix de l’artisan {c.matiere_resume.voix ? 'présente' : 'absente'}{c.matiere_resume.manquants.length ? <> — manque : {c.matiere_resume.manquants.join(' ; ')}</> : null}<br /></> : null}"],
  ["                                  {busyId === c.id ? 'Patientez…' : 'Valider'}\n                                </button>", `                                  {busyId === c.id ? 'Patientez…' : 'Valider'}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn--primary"
                                  disabled={busyId === c.id}
                                  onClick={() => void geste(c, 'valider_et_mettre_en_ligne', 'Site mis en ligne.')}
                                >
                                  {busyId === c.id ? 'Patientez…' : 'Mettre en ligne'}
                                </button>`],
  ["                          {c.etat === 'en_ligne' && (\n", `                          {(c.etat === 'en_ligne' || c.etat === 'retiree') && role === 'direction' && (
                            <div style={{ marginTop: '.8rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                              {c.etat === 'en_ligne' && !c.search_console_le && (
                                <button type="button" className="btn btn--ghost" disabled={busyId === c.id} onClick={() => void geste(c, 'search_console', 'Soumission du plan notée.')}>
                                  Plan soumis à la Search Console
                                </button>
                              )}
                              <button type="button" className="btn btn--ghost" disabled={busyId === c.id} onClick={() => void geste(c, 'envoyer_dossier', 'Dossier envoyé à l’artisan.')}>
                                Envoyer le dossier
                              </button>
                            </div>
                          )}

                          {c.etat === 'en_ligne' && (
`],
]

const quoi = process.argv[2]
for (const [rel, remplacements] of Object.entries(TACHES)) if (!quoi || rel.includes(quoi)) deriver(rel, remplacements)
