// La comptabilité et le relevé du partenaire (prompt v11 §3 et §7).
//
// Le cœur de cette suite, c'est l'ANNEXE A du contrat. Trois cas, trois paires de montants, et la
// formule doit tomber au centime sur les trois :
//
//     51,00 € de résultat avec 59,00 € apportés  →  19,64 € / 31,36 €
//     51,00 € de résultat sans apport            →  10,20 € / 40,80 €
//   1 020,00 € de résultat avec 708,00 € apportés →  317,28 € / 702,72 €
//
// Ce que ces chiffres apprennent, et qui n'a rien d'évident : la commission porte sur le CHIFFRE
// D'AFFAIRES du client apporté, pas sur le résultat. Le cas 1 donnerait 18,36 € au lieu de 19,64 € si
// on se trompait d'assiette — proche, et faux.
//
// Le reste vérifie ce qui entoure le calcul : les montants en centimes (jamais de flottant), les
// comptes de démonstration exclus, les taux lus depuis la base et non écrits en dur, l'immuabilité
// d'un relevé arrêté, et le fait que le partenaire LIT son relevé sans pouvoir l'arrêter.
//
// Usage : node --import ./scripts/ts-loader.mjs scripts/controle-compta-e2e.mjs
// Syntaxe : node --check scripts/controle-compta-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { calculerReleve, bornesDuMois, TAUX } from '../lib/controle/releve.ts'
import { verdict } from '../lib/direction/apports.ts'
import { verifierSessionTest } from './lib/connexion-test.mjs'

for (const f of ['.env.local']) {
  if (!fs.existsSync(f)) continue
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
const APP = (process.env.TEST_BASE || 'https://prestiapp.fr').replace(/\/$/, '')
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_SB || !ANON || !SERVICE) { console.log('\n⛔ Supabase non configuré.\n'); process.exit(2) }

const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } })
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }
const SAUT = (n, w) => console.log(`  ⏭  ${n} — ${w}`)
const eur = (c) => (c / 100).toFixed(2).replace('.', ',') + ' €'

const marque = `compta-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
const comptes = []

async function compte(role) {
  const email = `${marque}-${role}@presti-test.invalid`
  const password = `Cp-${crypto.randomBytes(9).toString('base64url')}-1`
  const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !u?.user?.id) return null
  comptes.push(u.user.id)
  const { error: eA } = await admin.from('artisans').insert({
    id: u.user.id, email, nom: `Compta ${role}`, metier: 'Test', slug: `${marque}-${role}`,
    plan: 'gratuit', is_founder: true, role_interne: role, est_demo: true,
  })
  if (eA) { console.log('     insertion :', eA.message); return null }
  await admin.from('direction_roles').upsert({ user_id: u.user.id, role: role === 'partenaire' ? 'lecture' : 'direction' }, { onConflict: 'user_id' })
  const pub = createClient(URL_SB, ANON, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password })
  if (!s?.session?.access_token) return null
  await verifierSessionTest(s.session.access_token)
  return { uid: u.user.id, email, jeton: s.session.access_token }
}

const api = async (chemin, jeton, init = {}) => {
  const r = await fetch(`${APP}${chemin}`, { ...init, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}), ...(init.headers ?? {}) } })
  const t = await r.text()
  let j = null
  try { j = JSON.parse(t) } catch { /* le statut suffit */ }
  return { statut: r.status, data: j, brut: t }
}

async function main() {
  console.log('\n══ Comptabilité et relevé du partenaire ══\n')

  // ── 0. La reprise sur remboursement (contrat, article 5.4) ─────────────────────────────────────
  console.log('0. La reprise sur remboursement, au centime')
  {
    // Le cas nominal : 100 € encaissés d'un client apporté, 40 € remboursés dans le mois.
    // Encaissé net 60 €, commission 20 % de 60 € = 12 €, et la reprise affichée vaut 20 % de 40 €.
    const r = calculerReleve('2026-08', [{ artisan_id: 'a', nom: 'Apporté', encaisse: 10000, rembourse: 4000, tauxApport: 20, statutApport: 'prouve' }], 0)
    T('l’encaissé du mois est NET du remboursement', r.encaisse === 6000, `${eur(r.encaisse)}`)
    T('la commission porte sur le net : 20 % de 60 € = 12 €', r.commission === 1200, `${eur(r.commission)}`)
    T('la reprise est affichée à part : 20 % de 40 € = 8 €', r.reprise === 800, `${eur(r.reprise)}`)
    T('le résultat distribuable baisse AUSSI du remboursement', r.resultat === 6000, `${eur(r.resultat)}`)
    // 60 € de résultat, 12 € de commission, base 48 €, intéressement 9,60 € → 21,60 € dû.
    T('le dû au partenaire suit : 12 € + 20 % de 48 € = 21,60 €', r.dûAuPartenaire === 2160, `${eur(r.dûAuPartenaire)}`)

    // Sans remboursement, le même mois donnerait 20 € de commission et 36 € dus : la reprise a bien
    // retiré 8 € de commission ET la part d'intéressement correspondante.
    const sans = calculerReleve('2026-08', [{ artisan_id: 'a', nom: 'Apporté', encaisse: 10000, tauxApport: 20, statutApport: 'prouve' }], 0)
    T('… soit exactement 8 € de commission en moins qu’un mois sans remboursement', sans.commission - r.commission === 800, `${eur(sans.commission)} → ${eur(r.commission)}`)

    // Un remboursement plus gros que l'encaissement du mois : le dû devient négatif, et il le reste.
    const neg = calculerReleve('2026-08', [{ artisan_id: 'a', nom: 'Apporté', encaisse: 1000, rembourse: 9000, tauxApport: 20, statutApport: 'prouve' }], 0)
    T('un remboursement plus gros que le mois rend un dû NÉGATIF, pas zéro', neg.dûAuPartenaire < 0, `${eur(neg.dûAuPartenaire)}`)
    T('… et l’article 5.4 dit « déduite du relevé suivant », donc on ne le tronque pas', neg.commission === -1600, `${eur(neg.commission)}`)

    // Un client jamais apporté : le résultat baisse, mais il n'y a aucune commission à reprendre.
    const nonApporte = calculerReleve('2026-08', [{ artisan_id: 'b', nom: 'Venu seul', encaisse: 10000, rembourse: 4000, tauxApport: 0, statutApport: null }], 0)
    T('un client non apporté remboursé : le résultat baisse, la commission reste à zéro',
      nonApporte.resultat === 6000 && nonApporte.commission === 0 && nonApporte.reprise === 0, JSON.stringify({ r: nonApporte.resultat, c: nonApporte.commission }))

    // Un apport contesté : la reprise se fait au taux contesté, comme la commission.
    const conteste = calculerReleve('2026-08', [{ artisan_id: 'c', nom: 'Contesté', encaisse: 10000, rembourse: 4000, tauxApport: 10, statutApport: 'conteste' }], 0)
    T('un apport contesté reprend à 10 %, comme il commissionne à 10 %', conteste.reprise === 400 && conteste.commission === 600, `${eur(conteste.reprise)} / ${eur(conteste.commission)}`)

    // Sans remboursement, rien ne change : la nouveauté ne doit pas déplacer un centime des mois passés.
    T('un mois sans remboursement calcule exactement comme avant', sans.rembourse === 0 && sans.reprise === 0 && sans.dûAuPartenaire === 3600, `${eur(sans.dûAuPartenaire)}`)
  }

  // ── 0 bis. Du registre au relevé, sans retaper le taux au milieu ────────────────────────────────
  //
  // C'est le test qui manquait le 08/09, et son absence a coûté un facteur 100 sur la commission
  // d'Alexandre : `verdict()` rendait 0.2, `calculerReleve` redivisait par 100. Les deux moitiés
  // étaient testées séparément et passaient — celle-ci écrivait `tauxApport: 20` à la main, donc
  // elle testait sa propre constante, pas le chemin.
  console.log('0 bis. Du registre au relevé, sans retaper le taux')
  {
    const parLeRegistre = (ligne, encaisse) => {
      const v = verdict(ligne)
      return calculerReleve('2026-08', [{ artisan_id: 'x', nom: 'Apporté', encaisse, tauxApport: v.compte ? v.tauxPct : 0, statutApport: ligne.statut }], 0)
    }
    const prouve = parLeRegistre({ statut: 'prouve', piece: null, motif: null }, 5900)
    T('⭑ un apport prouvé à 59 € commissionne 11,80 € — le taux traverse sans se faire diviser',
      prouve.commission === 1180, `${eur(prouve.commission)} (attendu 11,80 €)`)

    const conteste2 = parLeRegistre({ statut: 'conteste', piece: null, motif: 'désaccord' }, 5900)
    T('un apport contesté commissionne 5,90 € (10 %)', conteste2.commission === 590, eur(conteste2.commission))

    const sansPiece = parLeRegistre({ statut: 'declare', piece: null, motif: null }, 5900)
    T('un apport déclaré sans pièce ne commissionne rien', sansPiece.commission === 0, eur(sansPiece.commission))

    // 0077 — le taux que Benjamin décide traverse lui aussi, et le contrat garde le dernier mot.
    const regle15 = parLeRegistre({ statut: 'prouve', piece: null, motif: null, taux_pct: 15 }, 5900)
    T('⭑ le taux réglé à 15 % donne 8,85 €, pas le taux par défaut', regle15.commission === 885, eur(regle15.commission))

    const contesteRegle = parLeRegistre({ statut: 'conteste', piece: null, motif: 'désaccord', taux_pct: 20 }, 5900)
    T('⭑ un apport contesté reste plafonné à 10 % même réglé à 20 % : le contrat prime',
      contesteRegle.commission === 590, eur(contesteRegle.commission))

    const horsBornes = verdict({ statut: 'prouve', piece: null, motif: null, taux_pct: 45 })
    T('un taux hors de la fourchette du contrat est ignoré, pas appliqué', horsBornes.tauxPct === 20, `${horsBornes.tauxPct} %`)
  }

  // ── 1. L'annexe A du contrat, au centime ────────────────────────────────────────────────────────
  console.log('1. L’annexe A du contrat, au centime')
  const cas = [
    { nom: 'un client apporté à 59 €', clients: [{ artisan_id: 'a', nom: 'Apporté', encaisse: 5900, tauxApport: 20, statutApport: 'prouve' }], couts: 800, du: 1964, fondateur: 3136 },
    { nom: 'aucun apport', clients: [{ artisan_id: 'b', nom: 'Direct', encaisse: 5100, tauxApport: 0, statutApport: null }], couts: 0, du: 1020, fondateur: 4080 },
    { nom: '708 € apportés sur 1 020 € de résultat', clients: [
      { artisan_id: 'c', nom: 'Apporté', encaisse: 70800, tauxApport: 20, statutApport: 'prouve' },
      { artisan_id: 'd', nom: 'Direct', encaisse: 31200, tauxApport: 0, statutApport: null },
    ], couts: 0, du: 31728, fondateur: 70272 },
  ]
  for (const c of cas) {
    const r = calculerReleve('2026-08', c.clients, c.couts)
    T(`${c.nom} → ${eur(c.du)} au partenaire`, r.dûAuPartenaire === c.du, `${eur(r.dûAuPartenaire)} — commission ${eur(r.commission)}, intéressement ${eur(r.interessement)}`)
    T(`${c.nom} → ${eur(c.fondateur)} au fondateur`, r.partFondateur === c.fondateur, eur(r.partFondateur))
    T(`${c.nom} : les deux parts font le résultat, au centime`, r.dûAuPartenaire + r.partFondateur === r.resultat,
      `${eur(r.dûAuPartenaire)} + ${eur(r.partFondateur)} ≠ ${eur(r.resultat)}`)
  }

  // L'assiette de la commission est le CHIFFRE D'AFFAIRES du client apporté, pas le résultat. Si elle
  // portait sur le résultat, le premier cas donnerait 18,36 € au lieu de 19,64 € — 1,28 € d'écart sur
  // un seul client, des centaines d'euros sur une année.
  const surResultat = Math.round(5100 * 0.2) + Math.round((5100 - Math.round(5100 * 0.2)) * 0.2)
  T('la commission porte sur le chiffre d’affaires apporté, pas sur le résultat',
    surResultat === 1836 && calculerReleve('2026-08', cas[0].clients, cas[0].couts).dûAuPartenaire === 1964,
    `assiette « résultat » : ${eur(surResultat)} · assiette « CA apporté » : ${eur(calculerReleve('2026-08', cas[0].clients, cas[0].couts).dûAuPartenaire)}`)
  // Et l'ordre des opérations, lui, ne change rien : les deux écritures sont égales. C'est une fausse
  // subtilité qu'il vaut mieux écarter explicitement, pour que personne ne la « corrige » un jour.
  T('« C + 20 % (R − C) » et « 20 % R + 80 % C » donnent le même montant',
    Math.round(5100 * 0.2) + Math.round(1180 * 0.8) === 1964)

  console.log('\n2. Ce que le calcul refuse de faire')
  const perte = calculerReleve('2026-08', [{ artisan_id: 'x', nom: 'X', encaisse: 2900, tauxApport: 20, statutApport: 'prouve' }], 10000)
  T('un résultat négatif ne fait pas payer le partenaire', perte.interessement === 0, eur(perte.interessement))
  T('mais la commission reste due : elle porte sur du chiffre d’affaires, pas sur un bénéfice', perte.commission === 580, eur(perte.commission))
  const conteste = calculerReleve('2026-08', [{ artisan_id: 'y', nom: 'Y', encaisse: 5900, tauxApport: 10, statutApport: 'conteste' }], 0)
  T('un apport contesté paie 10 %, pas 20 %', conteste.commission === 590, eur(conteste.commission))
  T('les taux du contrat sont nommés une fois, pas éparpillés', TAUX.commission === 0.2 && TAUX.interessement === 0.2 && TAUX.commissionContestee === 0.1)
  T('un mois mal écrit est refusé', bornesDuMois('2026-13') === null && bornesDuMois('août') === null && bornesDuMois('2026-08') !== null)

  // ── 3. En production ────────────────────────────────────────────────────────────────────────────
  console.log('\n3. En production')
  const sonde = await api('/api/controle/releve?mois=2026-08', null)
  // 0071 est collée et le drapeau est levé depuis longtemps : un 404 ici n'est plus « pas encore
  // ouvert », c'est une route disparue. Le `return` faisait sortir la suite au vert sans avoir
  // éprouvé une seule fois la porte du relevé.
  T('le relevé existe (0071 collée, drapeau levé)', sonde.statut !== 404, `HTTP ${sonde.statut}`)
  T('sans jeton → 401', sonde.statut === 401, String(sonde.statut))

  const b = await compte('fondateur')
  if (!b?.jeton) { SAUT('production', 'création du fondateur de test impossible'); return }

  const mauvais = await api('/api/controle/releve?mois=pas-un-mois', b.jeton)
  T('un mois mal écrit → 400', mauvais.statut === 400, String(mauvais.statut))

  const r = await api('/api/controle/releve?mois=2026-08', b.jeton)
  if (r.statut === 404 && r.data?.code === 'sans_partenaire') SAUT('relevé', 'aucun partenaire déclaré en base')
  else {
    T('le relevé répond avec son détail par client', r.statut === 200 && Array.isArray(r.data?.releve?.clients), `${r.statut} — ${r.brut.slice(0, 120)}`)
    if (r.statut === 200) {
      const rel = r.data.releve
      T('les montants sont des entiers de centimes', [rel.encaisse, rel.commission, rel.dûAuPartenaire, rel.partFondateur].every(Number.isInteger),
        JSON.stringify({ e: rel.encaisse, c: rel.commission, d: rel.dûAuPartenaire }))
      T('les deux parts font le résultat', rel.dûAuPartenaire + rel.partFondateur === rel.resultat, `${rel.dûAuPartenaire} + ${rel.partFondateur} ≠ ${rel.resultat}`)
      T('aucun compte de démonstration dans le détail', !(rel.clients ?? []).some((c) => /presti-test\.invalid|example\.com/.test(c.nom ?? '')),
        JSON.stringify((rel.clients ?? []).map((c) => c.nom)))
      T('le relevé du mois en cours est un brouillon', r.data.fige === false || r.data.statut === 'brouillon', String(r.data.statut))
    }
  }

  const enCours = new Date().toISOString().slice(0, 7)
  const arreterTot = await api('/api/controle/releve', b.jeton, { method: 'POST', body: JSON.stringify({ mois: enCours, action: 'arreter' }) })
  T('on n’arrête pas un mois qui n’est pas fini', arreterTot.statut === 400 && arreterTot.data?.code === 'mois_en_cours',
    `${arreterTot.statut} ${arreterTot.data?.code ?? ''}`)

  // ── 4. Le partenaire lit le sien, il ne l'arrête pas ────────────────────────────────────────────
  console.log('\n4. Le partenaire lit, il n’engage pas l’entreprise')
  const p = await compte('partenaire')
  if (!p?.jeton) SAUT('partenaire', 'création impossible')
  else {
    const lecture = await api('/api/controle/releve?mois=2026-08', p.jeton)
    // « 200 ou 404 » passait quoi qu'il arrive, y compris le jour où on retirerait ce droit au
    // partenaire par erreur. Le contrat lui donne accès à SON relevé : c'est 200, ou c'est un bug.
    T('il peut lire un relevé (contrat, annexe A)', lecture.statut === 200, `${lecture.statut} — ${lecture.brut.slice(0, 120)}`)
    const arrete = await api('/api/controle/releve', p.jeton, { method: 'POST', body: JSON.stringify({ mois: '2026-08', action: 'arreter' }) })
    T('il ne peut PAS arrêter un relevé → 403', arrete.statut === 403, `${arrete.statut} — ${arrete.brut.slice(0, 110)}`)
    const compta = await api('/api/controle/compta', p.jeton)
    T('il n’accède pas à la comptabilité de l’entreprise', [403, 404].includes(compta.statut), String(compta.statut))
  }

  console.log(`\n══ ${ok} vérifications passées, ${ko} en échec ══\n`)
}

async function menage() {
  for (const id of comptes) {
    await admin.from('direction_roles').delete().eq('user_id', id).then(() => {}, () => {})
    await admin.from('artisans').update({ is_founder: false, role_interne: null }).eq('id', id).then(() => {}, () => {})
    await admin.from('journal_direction').delete().eq('acteur_id', id).then(() => {}, () => {})
    await admin.rpc('purger_compte_test', { p_id: id }).then(() => {}, () => {})
    await admin.from('artisans').delete().eq('id', id).then(() => {}, () => {})
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
  const { count } = await admin.from('artisans').select('id', { count: 'exact', head: true }).like('email', `%${marque}%`)
  if (count) console.error(`  ⚠️  ${count} compte(s) SUBSISTENT — ils portent des privilèges.`)
  else if (comptes.length) console.log(`  🧹 ${comptes.length} compte(s) de test purgé(s)`)
}

main()
  .catch((e) => { console.error('\n💥', e?.message ?? e); ko++ })
  .finally(async () => { await menage(); process.exit(ko === 0 ? 0 : 1) })
