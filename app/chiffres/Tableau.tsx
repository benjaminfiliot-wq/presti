// Le tableau de bord de gestion, côté affichage : il reçoit des indicateurs DÉJÀ calculés
// (lib/tableau-de-bord/calculer.ts) et ne calcule rien. Aucune donnée, aucun appel : c'est ce qui
// permet à scripts/tableau-de-bord-qa.mjs de le rendre en HTML et de lire ce que l'artisan verrait.
//
// Presti est en franchise en base : un seul montant par pièce, jamais de ligne de taxe.
import type { ReactNode } from 'react'
import type { Compte, Indicateurs } from '@/lib/tableau-de-bord/calculer'

const nombre = (n: number, decimales?: number) => n.toLocaleString('fr-FR', decimales === undefined ? { maximumFractionDigits: 0 } : { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
/** Entier : « 1 240 € » ; avec des centimes : « 1 240,50 € ». */
export const eur = (n: number): string => `${Number.isInteger(n) ? nombre(n) : nombre(n, 2)} €`
const court = (n: number): string => (n >= 1000 ? new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(n) : nombre(n))
const pluriel = (n: number, un: string, plusieurs: string) => (n > 1 ? plusieurs : un)

/** 0,4 h → « 24 min » · 2,5 h → « 2,5 h » · 52 h → « 2,2 j ». */
export function delai(heures: number): string {
  if (heures < 1) return `${Math.max(1, Math.round(heures * 60))} min`
  if (heures < 24) return `${nombre(heures, Number.isInteger(heures) ? 0 : 1)} h`
  const j = heures / 24
  return `${nombre(Math.round(j * 10) / 10, Number.isInteger(Math.round(j * 10) / 10) ? 0 : 1)} j`
}

function Panneau({ titre, tag, children }: { titre: string; tag?: ReactNode; children: ReactNode }) {
  return (
    <section className="psh-panel tdb-panel">
      <header>
        <h2>{titre}</h2>
        {tag ? <span className="tag">{tag}</span> : null}
      </header>
      <div className="tdb-body">{children}</div>
    </section>
  )
}

function Kpi({ lab, val, sub, ton }: { lab: string; val: string; sub: ReactNode; ton?: 'crit' }) {
  return (
    <div className={`tdb-kpi${ton ? ` ${ton}` : ''}`}>
      <div className="lab">{lab}</div>
      <div className="val tnum">{val}</div>
      <div className="sub">{sub}</div>
    </div>
  )
}

type Point = { libelle: string; v: number; court: string; plein: string }

/** Barres verticales en SVG. Les valeurs sont écrites en toutes lettres dans l'étiquette d'accessibilité :
 *  le dessin n'est jamais la seule source de l'information. */
function Barres({ nom, points }: { nom: string; points: Point[] }) {
  const L = 320, H = 150, base = H - 24, hmax = base - 20
  const max = Math.max(0, ...points.map((p) => p.v))
  const pas = L / Math.max(1, points.length)
  return (
    <svg className="tdb-chart" viewBox={`0 0 ${L} ${H}`} role="img" aria-label={`${nom} : ${points.map((p) => `${p.libelle} ${p.plein}`).join(', ')}`}>
      <line className="tdb-axe" x1="0" x2={L} y1={base} y2={base} />
      {points.map((p, k) => {
        const h = max > 0 && p.v > 0 ? Math.max(3, Math.round((p.v / max) * hmax)) : 0
        const cx = k * pas + pas / 2
        const derniere = k === points.length - 1
        return (
          <g key={p.libelle + k} className={derniere ? 'tdb-cur' : undefined}>
            {h > 0 ? <rect className="tdb-bar" x={cx - pas * 0.3} y={base - h} width={pas * 0.6} height={h} rx="3" style={{ animationDelay: `${k * 45}ms` }} /> : <line className="tdb-zero" x1={cx - pas * 0.3} x2={cx + pas * 0.3} y1={base - 1} y2={base - 1} />}
            <text className="tdb-val" x={cx} y={base - h - 6} textAnchor="middle">{p.court}</text>
            <text className="tdb-lab" x={cx} y={H - 7} textAnchor="middle">{p.libelle}</text>
          </g>
        )
      })}
    </svg>
  )
}

/** Une répartition en liste : libellé, barre proportionnelle, effectif. */
function Repartition({ comptes, vide }: { comptes: Compte[]; vide: string }) {
  if (comptes.length === 0) return <p className="tdb-vide">{vide}</p>
  return (
    <ul className="tdb-rep">
      {comptes.map((c) => (
        <li key={c.libelle}>
          <span className="nom">{c.libelle}</span>
          <span className="piste" aria-hidden="true"><i style={{ width: `${Math.max(2, c.part)}%` }} /></span>
          <span className="nb tnum">{c.nb}<small> · {c.part} %</small></span>
        </li>
      ))}
    </ul>
  )
}

export default function Tableau({ i, tronque }: { i: Indicateurs; tronque?: boolean }) {
  const a = i.argent
  if (i.vide) {
    return (
      <div className="psh-panel">
        <div className="psh-empty">Vos chiffres apparaîtront ici dès votre première demande, votre premier devis ou votre première facture.<br />Rien à configurer : tout est calculé à partir de ce que vous faites déjà dans Presti.</div>
      </div>
    )
  }

  const total = a.encaisseAnnee + a.enAttente + a.enRetard
  const part = (v: number) => (total > 0 ? (v / total) * 100 : 0)
  const segments: { cle: string; v: number; nom: string; nb?: number }[] = [
    { cle: 'ok', v: a.encaisseAnnee, nom: `Encaissé en ${i.periode.annee}` },
    { cle: 'attente', v: a.enAttente, nom: 'En attente', nb: a.nbEnAttente },
    { cle: 'retard', v: a.enRetard, nom: 'En retard', nb: a.nbEnRetard },
  ]
  let cumul = 0

  const variation = a.variationMois === null
    ? <>{i.periode.moisPrecedentLibelle} : rien à comparer</>
    : <><span className={`tdb-delta ${a.variationMois >= 0 ? 'ok' : 'warn'}`}>{a.variationMois >= 0 ? '+' : '−'}{Math.abs(a.variationMois)} %</span> par rapport à {i.periode.moisPrecedentLibelle}</>

  return (
    <div className="tdb">
      <section className="tdb-kpis" aria-label="Chiffre d’affaires facturé">
        <Kpi lab="Facturé ce mois" val={eur(a.caMois)} sub={variation} />
        <Kpi lab="Mois dernier" val={eur(a.caMoisPrecedent)} sub={i.periode.moisPrecedentLibelle} />
        <Kpi lab={`Facturé en ${i.periode.annee}`} val={eur(a.caAnnee)} sub={`dont ${eur(a.encaisseAnnee)} encaissés`} />
        <Kpi lab="En retard" val={eur(a.enRetard)} ton={a.nbEnRetard > 0 ? 'crit' : undefined} sub={a.nbEnRetard > 0 ? `${a.nbEnRetard} ${pluriel(a.nbEnRetard, 'facture', 'factures')} · jusqu’à ${a.retardMaxJours} j de retard` : 'aucune facture en retard'} />
      </section>

      <div className="tdb-grid">
        <Panneau titre="Facturé, mois par mois">
          <Barres nom="Chiffre d’affaires facturé" points={i.mois.map((m) => ({ libelle: m.libelle, v: m.ca, court: court(m.ca), plein: eur(m.ca) }))} />
        </Panneau>

        <Panneau titre="Votre argent">
          <svg className="tdb-pile" viewBox="0 0 100 7" preserveAspectRatio="none" role="img" aria-label={segments.map((s) => `${s.nom} ${eur(s.v)}`).join(', ')}>
            <rect className="piste" x="0" y="0" width="100" height="7" rx="2" />
            {segments.map((s) => {
              const w = part(s.v)
              const x = cumul
              cumul += w
              return w > 0 ? <rect key={s.cle} className={`seg ${s.cle}`} x={x} y="0" width={w} height="7" /> : null
            })}
          </svg>
          <ul className="tdb-lignes">
            {segments.map((s) => (
              <li key={s.cle}>
                <span className={`pastille ${s.cle}`} aria-hidden="true" />
                <span className="nom">{s.nom}{s.nb ? <small> · {s.nb} {pluriel(s.nb, 'facture', 'factures')}</small> : null}</span>
                <b className="tnum">{eur(s.v)}</b>
              </li>
            ))}
          </ul>
        </Panneau>

        <Panneau titre="Devis sur 12 mois">
          <div className="tdb-trio">
            <div><b className="tnum">{i.devis.envoyes}</b><span>envoyés</span></div>
            <div><b className="tnum">{i.devis.acceptes}</b><span>{pluriel(i.devis.acceptes, 'accepté', 'acceptés')}</span></div>
            <div><b className="tnum">{i.devis.tauxAcceptation === null ? '—' : `${i.devis.tauxAcceptation} %`}</b><span>d’acceptation</span></div>
          </div>
          <p className="tdb-ligne">
            {i.devis.delaiMoyenHeures === null
              ? 'Délai entre la demande et le devis : pas encore de mesure.'
              : <>Délai moyen entre la demande et le devis : <b className="tnum">{delai(i.devis.delaiMoyenHeures)}</b><small> · sur {i.devis.nbDelais} {pluriel(i.devis.nbDelais, 'demande', 'demandes')}</small></>}
          </p>
        </Panneau>

        <Panneau titre="Devis à relancer" tag={i.aRelancer.total > 0 ? <span className="pill warn"><span className="pdot" />{i.aRelancer.total}</span> : null}>
          {i.aRelancer.liste.length === 0 ? (
            <p className="tdb-vide">Aucun devis resté sans réponse depuis plus de {i.aRelancer.seuilJours} jours.</p>
          ) : (
            <ul className="tdb-relances">
              {i.aRelancer.liste.map((d) => (
                <li key={d.id}>
                  <a href={`/devis/${d.id}`}>
                    <span className="qui"><b>{d.client || 'Client'}</b><small>{d.numero || 'Devis'}</small></span>
                    <span className="quand"><b className="tnum">{eur(d.montant)}</b><small>envoyé il y a {d.jours} j</small></span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Panneau>

        <Panneau titre="Demandes reçues" tag={`${i.demandes.total} sur 6 mois`}>
          <Barres nom="Demandes reçues" points={i.mois.map((m) => ({ libelle: m.libelle, v: m.demandes, court: String(m.demandes), plein: `${m.demandes} ${pluriel(m.demandes, 'demande', 'demandes')}` }))} />
          <Repartition comptes={i.demandes.parCanal} vide="Aucune demande sur les 6 derniers mois." />
        </Panneau>

        <Panneau titre="Vos chantiers">
          <h3 className="tdb-sous">Types de chantier</h3>
          <Repartition comptes={i.chantiers} vide="Le type de chantier se remplit quand Presti le reconnaît dans une demande." />
          <h3 className="tdb-sous">Villes des demandes</h3>
          <Repartition comptes={i.villes} vide="Les villes apparaîtront quand une demande nommera sa commune (« à Marans », « 17230 Marans »)." />
        </Panneau>
      </div>

      <p className="tdb-note">
        Facturé : factures émises, avoirs et factures annulées exclus. Encaissé : factures marquées payées. En retard : échéance dépassée, non payée.
        Calculé le {i.periode.jour.split('-').reverse().join('/')}.
        {tronque ? ' Attention : seules les 1 000 pièces les plus récentes de chaque type sont lues, certains totaux peuvent être incomplets.' : ''}
      </p>
    </div>
  )
}
