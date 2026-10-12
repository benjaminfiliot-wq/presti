'use client'

// Le tableau de bord comptable, côté AFFICHAGE (refonte du 12/10/2026). Il reçoit une vue déjà calculée
// (lib/comptaTableau.ts) et ne calcule rien : c'est ce qui permet à scripts/compta-tableau-qa.mjs de le rendre
// en HTML et de lire ce que l'artisan verrait. Aucune donnée d'exemple : sans pièce ni fichier, il affiche
// l'état vide, qui dit ce qui va apparaître et comment commencer. Un seul « exemple » existe, et il est
// étiqueté comme tel : l'image d'aide, ouverte seulement quand l'artisan la demande (bouton « ? »).
//
// Chaque chiffre dit d'où il vient (vos factures Presti, vos fichiers). Un seul montant par pièce, jamais de
// ligne de taxe ni de régime fiscal.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Indicateurs } from '@/lib/tableau-de-bord/calculer'
import { euros, PERIODES, type Impaye, type MoisCompta, type Origine, type PeriodeId, type VueCompta } from '@/lib/comptaTableau'
import { Repartition } from './Tableau'

const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`
const dateFr = (iso: string) => iso.split('-').reverse().join('/')
const court = (c: number): string => {
  const n = c / 100
  return n >= 1000 ? new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(n) : Math.round(n).toLocaleString('fr-FR')
}

function provenance(o: Origine): string {
  if (o.presti && o.fichiers) return `Presti ${euros(o.presti)} · fichiers ${euros(o.fichiers)}`
  if (o.presti) return 'vos factures Presti'
  if (o.fichiers) return 'vos fichiers'
  return 'rien sur la période'
}

function Carte({ lab, val, sub, ton, attr }: { lab: string; val: string; sub: ReactNode; ton?: 'crit' | 'ok'; attr: string }) {
  return (
    <div className={`cpt-carte${ton ? ` ${ton}` : ''}`} data-carte={attr}>
      <div className="lab">{lab}</div>
      <div className="val tnum">{val}</div>
      <div className="sub">{sub}</div>
    </div>
  )
}

function Panneau({ titre, tag, children, id }: { titre: string; tag?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="psh-panel cpt-panel" aria-labelledby={id}>
      <header><h2 id={id}>{titre}</h2>{tag ? <span className="tag">{tag}</span> : null}</header>
      <div className="cpt-body">{children}</div>
    </section>
  )
}

/** Mois par mois : chiffre d'affaires (Presti + fichiers, empilés), dépenses, et l'encaissé en courbe.
 *  Les valeurs sont écrites dans l'étiquette d'accessibilité : le dessin n'est jamais la seule source. */
function GraphiqueMois({ mois }: { mois: MoisCompta[] }) {
  const L = 640, H = 230, base = H - 26, hmax = base - 24
  const max = Math.max(1, ...mois.map((m) => Math.max(m.facturePresti + m.recettesFichiers, m.depenses, m.encaisse)))
  const pas = L / Math.max(1, mois.length)
  const y = (v: number) => base - Math.round((v / max) * hmax)
  const courbe = mois.map((m, k) => `${k === 0 ? 'M' : 'L'}${(k * pas + pas / 2).toFixed(1)} ${y(m.encaisse)}`).join(' ')
  const etiquette = mois.map((m) => `${m.libelle} : facturé ${euros(m.facturePresti + m.recettesFichiers)}, encaissé ${euros(m.encaisse)}, dépenses ${euros(m.depenses)}`).join(' ; ')
  return (
    <svg className="cpt-graph" viewBox={`0 0 ${L} ${H}`} role="img" aria-label={`Mois par mois — ${etiquette}`}>
      <line className="axe" x1="0" x2={L} y1={base} y2={base} />
      {mois.map((m, k) => {
        const cx = k * pas + pas / 2
        const w = Math.min(26, pas * 0.32)
        const hp = m.facturePresti > 0 ? Math.max(2, base - y(m.facturePresti)) : 0
        const hf = m.recettesFichiers > 0 ? Math.max(2, base - y(m.recettesFichiers)) : 0
        const hd = m.depenses > 0 ? Math.max(2, base - y(m.depenses)) : 0
        const ca = m.facturePresti + m.recettesFichiers
        return (
          <g key={m.cle} className={m.dansPeriode ? 'dans' : 'hors'}>
            {hp > 0 && <rect className="b-presti" x={cx - w - 1} y={base - hp} width={w} height={hp} rx="3" style={{ animationDelay: `${k * 35}ms` }} />}
            {hf > 0 && <rect className="b-fichiers" x={cx - w - 1} y={base - hp - hf} width={w} height={hf} rx="3" style={{ animationDelay: `${k * 35}ms` }} />}
            {hd > 0 && <rect className="b-depenses" x={cx + 1} y={base - hd} width={w} height={hd} rx="3" style={{ animationDelay: `${k * 35 + 60}ms` }} />}
            {ca > 0 && <text className="val" x={cx - w / 2 - 1} y={base - hp - hf - 6} textAnchor="middle">{court(ca)}</text>}
            <text className="lab" x={cx} y={H - 8} textAnchor="middle">{m.libelle}</text>
          </g>
        )
      })}
      {mois.some((m) => m.encaisse > 0) && <path className="courbe" d={courbe} fill="none" />}
      {mois.map((m, k) => (m.encaisse > 0 ? <circle key={m.cle} className="point" cx={k * pas + pas / 2} cy={y(m.encaisse)} r="3.5" /> : null))}
    </svg>
  )
}

/** L'anneau des sources de demandes. */
function Anneau({ parts, total }: { parts: { libelle: string; nb: number; part: number }[]; total: number }) {
  const r = 42, c = 2 * Math.PI * r
  let cumul = 0
  return (
    <svg className="cpt-anneau" viewBox="0 0 120 120" role="img" aria-label={`Sources des demandes : ${parts.map((p) => `${p.libelle} ${p.nb} (${p.part} %)`).join(', ')}`}>
      <circle className="piste" cx="60" cy="60" r={r} />
      {parts.map((p, i) => {
        const l = total ? (p.nb / total) * c : 0
        const el = <circle key={p.libelle} className={`seg s${i % 6}`} cx="60" cy="60" r={r} strokeDasharray={`${l} ${c - l}`} strokeDashoffset={-cumul} />
        cumul += l
        return el
      })}
      <text className="nb" x="60" y="58" textAnchor="middle">{total}</text>
      <text className="lib" x="60" y="75" textAnchor="middle">{total > 1 ? 'demandes' : 'demande'}</text>
    </svg>
  )
}

function anciennete(i: Impaye): string {
  if (i.echeance && i.joursRetard > 0) return `${i.joursRetard} j de retard (échéance ${dateFr(i.echeance)})`
  if (i.echeance) return `échéance le ${dateFr(i.echeance)}`
  return `en attente depuis ${i.joursDepuisEmission} j`
}

/** Le bouton « ? » : l'image d'aide, la seule chose marquée « exemple » de l'écran, n'existe dans la page que
 *  lorsqu'elle est ouverte. Échap ferme, le focus revient au bouton. */
export function AideCompta() {
  const [ouvert, setOuvert] = useState(false)
  const bouton = useRef<HTMLButtonElement>(null)
  const fermer = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!ouvert) return
    fermer.current?.focus()
    const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false) }
    window.addEventListener('keydown', touche)
    return () => { window.removeEventListener('keydown', touche); bouton.current?.focus() }
  }, [ouvert])
  return (
    <>
      <button ref={bouton} type="button" className="cpt-aide" data-compta-aide aria-haspopup="dialog" aria-expanded={ouvert} onClick={() => setOuvert(true)}>
        <span aria-hidden="true">?</span><span className="cpt-aide-txt">Comment ça marche</span>
      </button>
      {ouvert && (
        <div className="cpt-modal" role="dialog" aria-modal="true" aria-labelledby="cpt-modal-titre" data-compta-aide-fenetre onClick={(e) => { if (e.target === e.currentTarget) setOuvert(false) }}>
          <div className="cpt-modal-boite">
            <div className="cpt-modal-tete">
              <h2 id="cpt-modal-titre">Comment ça marche <span className="pill">Exemple</span></h2>
              <button ref={fermer} type="button" className="ca-secondaire" onClick={() => setOuvert(false)}>Fermer</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marque/aide/compta-etapes.svg" width={960} height={420} alt="Exemple illustré en trois étapes : 1, déposez vos fichiers Excel ou CSV ; 2, vérifiez le rangement de l’assistant et validez en un clic ; 3, le tableau de bord se tient à jour tout seul avec vos factures Presti." />
            <p className="cpt-note">Image d’illustration, sans vos données. Vos factures, devis et demandes Presti sont comptés sans rien faire ; les fichiers servent surtout à ajouter vos dépenses.</p>
          </div>
        </div>
      )}
    </>
  )
}

export function BarrePeriode({ periode, onPeriode }: { periode: PeriodeId; onPeriode?: (p: PeriodeId) => void }) {
  return (
    <div className="cpt-periodes" role="group" aria-label="Période">
      {PERIODES.map((p) => (
        <button key={p.id} type="button" className={p.id === periode ? 'actif' : undefined} aria-pressed={p.id === periode} disabled={!onPeriode} onClick={() => onPeriode?.(p.id)}>{p.nom}</button>
      ))}
    </div>
  )
}

export function EtatVide() {
  return (
    <section className="psh-panel cpt-vide" data-compta-vide aria-labelledby="cpt-vide-titre">
      <div className="cpt-vide-tete">
        <div>
          <p className="ca-eyebrow">Votre tableau de bord</p>
          <h2 id="cpt-vide-titre">Il se remplira tout seul.</h2>
        </div>
        <AideCompta />
      </div>
      <p>Rien à saisir, rien à configurer : ce tableau lit ce que vous faites déjà dans Presti, et chaque nouvelle facture le met à jour.</p>
      <ul className="cpt-vide-liste">
        <li><b>Chiffre d’affaires et encaissé, mois par mois</b><span>dès votre première facture dans Presti</span></li>
        <li><b>Impayés et leur ancienneté</b><span>avec la relance prête à envoyer</span></li>
        <li><b>Sources de vos demandes</b><span>formulaire de votre page, e-mail… d’après chaque demande reçue</span></li>
        <li><b>Dépenses, bénéfice et marge</b><span>en déposant vos relevés ou vos fichiers Excel plus bas</span></li>
      </ul>
      <ol className="cpt-vide-etapes">
        <li><a href="/devis">Faites un devis</a>, puis la facture : elle compte aussitôt.</li>
        <li>Ou déposez vos fichiers Excel ou CSV juste en dessous : l’assistant les range.</li>
        <li>Revenez quand vous voulez : les chiffres sont toujours ceux du jour.</li>
      </ol>
    </section>
  )
}

export default function TableauCompta({ vue, indicateurs, periode, onPeriode, onRelance, majLe, apercu, tronque }: {
  vue: VueCompta
  indicateurs?: Indicateurs | null
  periode: PeriodeId
  onPeriode?: (p: PeriodeId) => void
  onRelance?: (i: Impaye) => void
  /** Heure de la dernière lecture des données Presti (« HH:MM »). */
  majLe?: string
  /** Nombre de lignes de fichiers comptées en aperçu, pas encore validées. */
  apercu?: number
  tronque?: boolean
}) {
  if (vue.vide) return <EtatVide />
  const c = vue.cartes
  const premiers = vue.impayes.slice(0, 6)
  const suite = vue.impayes.slice(6)
  const totalAnc = vue.anciennete.aEcheance + vue.anciennete.retard30 + vue.anciennete.retard60 + vue.anciennete.retardPlus
  const segments = [
    { cle: 'a', v: vue.anciennete.aEcheance, nom: 'Pas encore échu ou sans échéance' },
    { cle: 'r30', v: vue.anciennete.retard30, nom: '1 à 30 j de retard' },
    { cle: 'r60', v: vue.anciennete.retard60, nom: '31 à 60 j de retard' },
    { cle: 'rp', v: vue.anciennete.retardPlus, nom: 'Plus de 60 j de retard' },
  ]
  let cumul = 0
  const retard = vue.anciennete.retard30 + vue.anciennete.retard60 + vue.anciennete.retardPlus

  const ligneImpaye = (i: Impaye) => (
    <li key={i.cle} data-compta-impaye={i.origine}>
      <div className="qui">
        <b>{i.client}</b>
        <small>{i.libelle} · {dateFr(i.emission)} · <span className={i.joursRetard > 0 ? 'retard' : undefined}>{anciennete(i)}</span></small>
        <span className={`cpt-src ${i.origine}`}>{i.origine === 'presti' ? 'Facture Presti' : 'Vos fichiers'}</span>
      </div>
      <div className="combien">
        <strong className="tnum">{euros(i.montant)}</strong>
        <span className="cpt-gestes">
          {onRelance && <button type="button" className="ca-secondaire" onClick={() => onRelance(i)}>Préparer la relance</button>}
          {i.origine === 'presti' && <a className="ca-secondaire" href="/factures">Ouvrir</a>}
        </span>
      </div>
    </li>
  )

  return (
    <div className="cpt" data-compta-tableau>
      <div className="cpt-barre">
        <div className="cpt-relie" data-compta-relie>
          <span className="pdot" aria-hidden="true" />
          <span><b>Relié à Presti</b> · vos factures, devis et demandes sont comptés sans import{majLe ? `, lus à ${majLe}` : ''}{vue.sources.fichiers ? ` · ${pluriel(vue.sources.fichiers, 'ligne de vos fichiers', 'lignes de vos fichiers')} sur la période` : ''}</span>
        </div>
        <div className="cpt-outils">
          <BarrePeriode periode={periode} onPeriode={onPeriode} />
          <AideCompta />
        </div>
      </div>
      {apercu ? <p className="cpt-apercu" role="status">Aperçu : {pluriel(apercu, 'ligne de vos fichiers est comptée', 'lignes de vos fichiers sont comptées')} sans être encore validée{apercu > 1 ? 's' : ''}. <a href="#ca-titre">Valider ou annuler</a></p> : null}

      <section className="cpt-cartes" aria-label={`Vos chiffres · ${vue.periode.nom}`}>
        <Carte attr="facture" lab="Chiffre d’affaires" val={euros(c.facture.total)} sub={provenance(c.facture)} />
        <Carte attr="encaisse" lab="Encaissé" val={euros(c.encaisse.total)} sub={provenance(c.encaisse)} ton={c.encaisse.total > 0 ? 'ok' : undefined} />
        <Carte attr="depenses" lab="Dépenses" val={c.depenses === null ? '—' : euros(c.depenses)} sub={c.depenses === null ? 'déposez vos dépenses plus bas' : 'vos fichiers'} />
        <Carte attr="benefice" lab="Bénéfice" val={c.benefice === null ? '—' : euros(c.benefice)} ton={c.benefice !== null && c.benefice < 0 ? 'crit' : undefined}
          sub={c.benefice === null ? 'connu dès que vos dépenses le sont' : c.marge === null ? 'marge : —' : `marge ${String(c.marge).replace('.', ',')} %`} />
        <Carte attr="impayes" lab="Impayés à ce jour" val={euros(c.impayes.total)} ton={retard > 0 ? 'crit' : undefined}
          sub={c.impayes.nombre ? `${pluriel(c.impayes.nombre, 'pièce', 'pièces')}${retard > 0 ? ` · ${euros(retard)} en retard` : ''}` : 'aucun impayé'} />
        <Carte attr="clients" lab="Clients" val={String(c.clients)} sub={c.clients ? 'facturés sur la période' : 'aucun sur la période'} />
      </section>

      <div className="cpt-grille">
        <Panneau id="cpt-mois" titre="Mois par mois" tag={vue.periode.nom}>
          <GraphiqueMois mois={vue.mois} />
          <ul className="cpt-legende" aria-hidden="true">
            <li><i className="b-presti" />Facturé dans Presti</li>
            {vue.mois.some((m) => m.recettesFichiers > 0) && <li><i className="b-fichiers" />Recettes de vos fichiers</li>}
            {vue.mois.some((m) => m.depenses > 0) && <li><i className="b-depenses" />Dépenses</li>}
            {vue.mois.some((m) => m.encaisse > 0) && <li><i className="courbe" />Encaissé</li>}
          </ul>
          {!vue.encaisseAuMoisDeReglement && c.encaisse.presti > 0 && <p className="cpt-note">L’encaissé de vos factures Presti est rangé au mois où elles ont été émises.</p>}
        </Panneau>

        <Panneau id="cpt-impayes" titre="Impayés" tag={c.impayes.nombre ? <span className={`pill${retard > 0 ? ' crit' : ''}`}><span className="pdot" />{c.impayes.nombre}</span> : null}>
          {vue.impayes.length === 0 ? <p className="cpt-vide-txt">Aucun impayé à ce jour.</p> : <>
            <svg className="cpt-pile" viewBox="0 0 100 8" preserveAspectRatio="none" role="img" aria-label={`Ancienneté des impayés : ${segments.map((s) => `${s.nom} ${euros(s.v)}`).join(', ')}`}>
              <rect className="piste" x="0" y="0" width="100" height="8" rx="2" />
              {segments.map((s) => { const w = totalAnc ? (s.v / totalAnc) * 100 : 0; const x = cumul; cumul += w; return w > 0 ? <rect key={s.cle} className={`seg ${s.cle}`} x={x} y="0" width={w} height="8" /> : null })}
            </svg>
            <ul className="cpt-anc">{segments.filter((s) => s.v > 0).map((s) => <li key={s.cle}><i className={s.cle} aria-hidden="true" />{s.nom}<b className="tnum">{euros(s.v)}</b></li>)}</ul>
            <ul className="cpt-impayes">{premiers.map(ligneImpaye)}</ul>
            {suite.length > 0 && <details className="cpt-suite"><summary>Voir {pluriel(suite.length, 'autre impayé', 'autres impayés')}</summary><ul className="cpt-impayes">{suite.map(ligneImpaye)}</ul></details>}
          </>}
        </Panneau>

        <Panneau id="cpt-sources" titre="Sources des demandes" tag={vue.periode.nom}>
          {vue.demandes.total === 0 ? <p className="cpt-vide-txt">Aucune demande reçue sur la période.</p> : (
            <div className="cpt-sources">
              <Anneau parts={vue.demandes.parCanal} total={vue.demandes.total} />
              <ul className="cpt-sources-liste">{vue.demandes.parCanal.map((p, i) => <li key={p.libelle}><i className={`s${i % 6}`} aria-hidden="true" /><span>{p.libelle}</span><b className="tnum">{p.nb}<small> · {p.part} %</small></b></li>)}</ul>
            </div>
          )}
          <p className="cpt-note">D’après le canal enregistré sur chaque demande reçue dans Presti.</p>
        </Panneau>

        <Panneau id="cpt-clients" titre="Meilleurs clients" tag={vue.periode.nom}>
          {vue.meilleursClients.length === 0 ? <p className="cpt-vide-txt">Aucun client facturé sur la période.</p> : (
            <ul className="cpt-clients">{vue.meilleursClients.map((m) => (
              <li key={m.nom}>
                <span className="nom">{m.nom}<small>{m.origine === 'presti' ? 'Presti' : m.origine === 'fichiers' ? 'vos fichiers' : 'Presti et vos fichiers'}</small></span>
                <span className="piste" aria-hidden="true"><i style={{ width: `${Math.max(3, Math.round((m.montant / vue.meilleursClients[0].montant) * 100))}%` }} /></span>
                <b className="tnum">{euros(m.montant)}</b>
              </li>
            ))}</ul>
          )}
        </Panneau>

        <Panneau id="cpt-devis" titre="Devis">
          <div className="cpt-duo">
            <div><b className="tnum">{vue.devis.acceptes.nombre}</b><span>{vue.devis.acceptes.nombre > 1 ? 'acceptés' : 'accepté'} · {vue.periode.nom.toLowerCase()}</span><small className="tnum">{euros(vue.devis.acceptes.montant)}</small></div>
            <div><b className="tnum">{vue.devis.enAttente.nombre}</b><span>en attente de réponse</span><small className="tnum">{euros(vue.devis.enAttente.montant)}</small></div>
          </div>
          {indicateurs && indicateurs.aRelancer.liste.length > 0 && <>
            <h3 className="cpt-sous">À relancer · sans réponse depuis plus de {indicateurs.aRelancer.seuilJours} jours</h3>
            <ul className="cpt-relances">{indicateurs.aRelancer.liste.map((d) => (
              <li key={d.id}><a href={`/devis/${d.id}`}><span className="qui"><b>{d.client || 'Client'}</b><small>{d.numero || 'Devis'}</small></span><span className="quand"><b className="tnum">{euros(Math.round(d.montant * 100))}</b><small>envoyé il y a {d.jours} j</small></span></a></li>
            ))}</ul>
          </>}
        </Panneau>

        {indicateurs && (indicateurs.chantiers.length > 0 || indicateurs.villes.length > 0) && (
          <Panneau id="cpt-chantiers" titre="Vos chantiers" tag="12 mois">
            <h3 className="cpt-sous">Types de chantier</h3>
            <Repartition comptes={indicateurs.chantiers} vide="Le type de chantier se remplit quand Presti le reconnaît dans une demande." />
            <h3 className="cpt-sous">Villes des demandes</h3>
            <Repartition comptes={indicateurs.villes} vide="Les villes apparaîtront quand une demande nommera sa commune." />
          </Panneau>
        )}
      </div>

      <p className="cpt-note">
        Chiffre d’affaires : factures Presti émises ou payées (avoirs et factures annulées exclus), plus les recettes de vos fichiers. Encaissé : factures marquées payées, lignes de fichiers marquées payées.
        Impayés : ce qui reste dû aujourd’hui, quelle que soit la période. Un seul montant par facture : ce que le client règle.
        {tronque ? ' Attention : seules les 2 000 pièces les plus récentes de chaque type sont lues, certains totaux peuvent être incomplets.' : ''}
      </p>
    </div>
  )
}
