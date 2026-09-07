import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { exigerReconfirmation } from '@/lib/direction/reconfirmation'
import { journaliser, refusJournal } from '@/lib/direction/journal'
import { sourcer } from '@/lib/direction/fraicheur'
import { encaisseDuMois } from '@/lib/direction/stripe'
import { stripe } from '@/lib/stripe'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// La comptabilité de l'entreprise (prompt v11 §3, J5).
//
//   GET  → ventes de l'année, achats, seuil de TVA, échéances à venir, trésorerie.
//   POST → déposer un achat, marquer une obligation payée.
//
// Ce qui gouverne ce fichier : **un chiffre qui engage porte sa source et sa nature**. Une estimation
// n'est jamais présentée comme un montant dû, un seuil vient de la base et jamais du code, et le
// chiffre d'affaires vient de Stripe et jamais d'une saisie.
//
// La franchise en base (art. 293 B du CGI) : Presti ne facture pas de TVA et ne la récupère pas sur
// ses achats. Le seuil est surveillé — le dépasser change trois choses le même jour (les prix
// affichés, les mentions légales, l'interrupteur `STRIPE_TAXE_AUTO`), et il vaut mieux le voir venir.

/** Les réglages chiffrés, lus en base : ils changent par décret, pas par déploiement. */
async function reglages(): Promise<Record<string, number | string>> {
  const { data } = await supabaseAdmin.from('reglages_globaux').select('cle, valeur')
  const o: Record<string, number | string> = {}
  for (const r of data ?? []) {
    const v = r.valeur as unknown
    o[r.cle] = typeof v === 'number' || typeof v === 'string' ? v : Number(v)
  }
  return o
}

/** Le chiffre d'affaires encaissé depuis le 1er janvier — l'assiette du seuil de franchise. */
const caDeLAnnee = () => sourcer('compta:ca-annee', 'stripe', async () => {
  if (!stripe) throw new Error('Stripe n’est pas configuré.')
  const debut = Math.floor(Date.UTC(new Date().getUTCFullYear(), 0, 1) / 1000)
  let total = 0, curseur: string | undefined
  for (let page = 0; page < 12; page++) {
    const l = await stripe.invoices.list({ status: 'paid', limit: 100, created: { gte: debut }, ...(curseur ? { starting_after: curseur } : {}) }, { timeout: 20_000, maxNetworkRetries: 0 })
    for (const f of l.data) total += f.amount_paid ?? 0
    if (!l.has_more || !l.data.length) break
    curseur = l.data[l.data.length - 1].id
  }
  return total
}, 300_000)

export async function GET(req: Request) {
  // Drapeau baissé = cet espace n'existe pas : 404 avant tout, y compris avant l'identité.
  if (!actif('comptabilite')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'comptabilite', 'voir')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)

  const anneeDebut = `${new Date().getUTCFullYear()}-01-01`
  const [reg, ca, encaisseMois, { data: achats }, { data: obligations }] = await Promise.all([
    reglages(),
    caDeLAnnee(),
    encaisseDuMois(),
    supabaseAdmin.from('achats').select('id, fournisseur, libelle, categorie, date_facture, ht_cents, tva_cents, ttc_cents, payee, echeance, origine, note')
      .gte('date_facture', anneeDebut).order('date_facture', { ascending: false }).limit(300),
    supabaseAdmin.from('obligations').select('id, type, libelle, echeance, montant_cents, estime, statut, paye_le')
      .eq('statut', 'a_venir').order('echeance').limit(50),
  ])

  const seuil = Number(reg.tva_seuil_franchise_cents) || 0
  const seuilMajore = Number(reg.tva_seuil_majore_cents) || 0
  const alerteA = Number(reg.tva_alerte_pourcent) || 80
  const caCents = ca.valeur ?? null

  const depensesAnnee = (achats ?? []).reduce((n, a) => n + (a.ttc_cents ?? 0), 0)
  const impayes = (achats ?? []).filter((a) => !a.payee)

  return NextResponse.json({
    // ── Les ventes ────────────────────────────────────────────────────────────────────────────────
    ventes: { annee: ca, mois: encaisseMois },
    // ── La TVA : où on en est du seuil, et ce que ça implique ────────────────────────────────────
    tva: {
      regime: 'franchise en base (art. 293 B du CGI)',
      seuil, seuilMajore, alerteA,
      ca: caCents,
      // On ne calcule un pourcentage que si on connaît le chiffre : sinon on n'affiche rien.
      pourcent: caCents !== null && seuil > 0 ? Math.round((caCents / seuil) * 1000) / 10 : null,
      alerte: caCents !== null && seuil > 0 && caCents >= seuil * (alerteA / 100),
      depasse: caCents !== null && seuil > 0 && caCents >= seuil,
      source: ca.source, a: ca.a, erreur: ca.erreur,
    },
    // ── Les achats ────────────────────────────────────────────────────────────────────────────────
    achats: {
      lignes: achats ?? [],
      totalAnnee: depensesAnnee,
      impayes: impayes.length,
      resteAPayer: impayes.reduce((n, a) => n + (a.ttc_cents ?? 0), 0),
      // La TVA sur les achats n'est PAS déductible en franchise : on la montre pour mémoire, et on dit
      // pourquoi elle ne se récupère pas — sinon quelqu'un finira par croire qu'on l'oublie.
      tvaSubie: (achats ?? []).reduce((n, a) => n + (a.tva_cents ?? 0), 0),
    },
    obligations: obligations ?? [],
    // ── Trésorerie : l'encaissé de l'année moins les dépenses de l'année ──────────────────────────
    tresorerie: caCents !== null ? { net: caCents - depensesAnnee, encaisse: caCents, depenses: depensesAnnee } : null,
    reglages: reg,
    role: f.role,
    a: new Date().toISOString(),
  })
}

type Corps = {
  action?: unknown
  fournisseur?: unknown; libelle?: unknown; categorie?: unknown; date_facture?: unknown
  ht?: unknown; tva?: unknown; ttc?: unknown; payee?: unknown; echeance?: unknown; note?: unknown
  id?: unknown
}
const CATEGORIES = ['hebergement', 'base', 'ia', 'email', 'domaine', 'store', 'paiement', 'assurance', 'comptable', 'materiel', 'autre']

/** Un montant saisi « 12,90 » ou « 12.90 » devient 1290 centimes. Refuse le reste. */
function centimes(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) : null
  if (typeof v !== 'string') return null
  const t = v.trim().replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null
  return Math.round(Number(t) * 100)
}

export async function POST(req: Request) {
  // Drapeau baissé = cet espace n'existe pas : 404 avant tout, y compris avant l'identité.
  if (!actif('comptabilite')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'comptabilite', 'ecrire')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)

  const b = (await req.json().catch(() => null)) as Corps | null
  const action = typeof b?.action === 'string' ? b.action : ''

  if (action === 'achat') {
    const fournisseur = typeof b?.fournisseur === 'string' ? b.fournisseur.trim().slice(0, 120) : ''
    const categorie = typeof b?.categorie === 'string' && CATEGORIES.includes(b.categorie) ? b.categorie : 'autre'
    const date = typeof b?.date_facture === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.date_facture) ? b.date_facture : ''
    const ttc = centimes(b?.ttc)
    const ht = centimes(b?.ht) ?? ttc
    const tva = centimes(b?.tva) ?? (ttc !== null && ht !== null ? ttc - ht : 0)
    if (!fournisseur) return NextResponse.json({ error: 'Le fournisseur est obligatoire.' }, { status: 400 })
    if (!date) return NextResponse.json({ error: 'Date attendue : AAAA-MM-JJ.' }, { status: 400 })
    if (ttc === null || ttc < 0) return NextResponse.json({ error: 'Montant TTC illisible : écrivez 12,90.' }, { status: 400 })
    if (ht === null || ht < 0 || ht > ttc) return NextResponse.json({ error: 'Le HT ne peut pas dépasser le TTC.' }, { status: 400 })

    // Une écriture comptable se re-confirme : elle change des chiffres qui serviront à un relevé et à
    // une déclaration.
    const refus = await exigerReconfirmation(req, f.uid, 'argent')
    if (refus) return refus

    const { data, error } = await supabaseAdmin.from('achats').insert({
      fournisseur, libelle: typeof b?.libelle === 'string' ? b.libelle.trim().slice(0, 200) : null,
      categorie, date_facture: date, ht_cents: ht, tva_cents: tva, ttc_cents: ttc,
      payee: b?.payee !== false,
      echeance: typeof b?.echeance === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.echeance) ? b.echeance : null,
      origine: 'manuel', note: typeof b?.note === 'string' ? b.note.trim().slice(0, 300) : null,
      cree_par: f.uid,
    }).select('id').single()
    if (error) { console.error('[compta] achat :', error.message); return NextResponse.json({ error: 'Rien n’a été fait.', code: 'transaction' }, { status: 503 }) }
    if (!(await journaliser({ acteur: f, action: 'achat_ajoute', cible_type: 'achat', cible_id: data.id, apres: { fournisseur, ttc, date }, reconfirme: true }, req))) return refusJournal()
    return NextResponse.json({ ok: true, message: `Achat ${fournisseur} enregistré : ${(ttc / 100).toFixed(2).replace('.', ',')} €.` })
  }

  if (action === 'obligation_payee') {
    const id = typeof b?.id === 'string' ? b.id : ''
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Échéance inconnue.' }, { status: 404 })
    const { data, error } = await supabaseAdmin.from('obligations')
      .update({ statut: 'payee', paye_le: new Date().toISOString().slice(0, 10) }).eq('id', id).select('libelle').maybeSingle()
    if (error) return NextResponse.json({ error: 'Rien n’a été fait.', code: 'transaction' }, { status: 503 })
    if (!data) return NextResponse.json({ error: 'Échéance inconnue.' }, { status: 404 })
    await journaliser({ acteur: f, action: 'obligation_modifiee', cible_type: 'obligation', cible_id: id, apres: { statut: 'payée' } }, req)
    return NextResponse.json({ ok: true, message: `${data.libelle} marquée payée.` })
  }

  return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
}
