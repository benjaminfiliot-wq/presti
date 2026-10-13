'use client'

import { useState } from 'react'
import { ETAPES, LIBELLES_ETAPES, LIBELLES_PREUVE, type Carte, type Pipeline } from '@/lib/crm/pipeline'
import { appel, dateFr, estErreur, euros } from './client'
import { Lien } from './mode'

// Le pipeline : six colonnes, dérivées des VRAIS statuts (lib/crm/pipeline.ts). Déplacer une carte à la main est possible
// (liste « Déplacer vers ») : le geste est journalisé, ne change aucun devis ni aucune facture, et cède la place dès que
// les vrais statuts bougent. Une carte déplacée à la main le dit.
export default function PipelineVue({ p, onChange }: { p: Pipeline; onChange: () => Promise<void> | void }) {
  const [enCours, setEnCours] = useState<string | null>(null)
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null)

  async function deplacer(c: Carte, vers: string) {
    setEnCours(c.cle); setMessage(null)
    const r = await appel<{ etape: string }>('/api/crm/pipeline', { method: 'POST', body: { objet: c.objet, id: c.id, vers } })
    setEnCours(null)
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    setMessage({ texte: `« ${c.titre} » déplacé vers ${LIBELLES_ETAPES[vers as keyof typeof LIBELLES_ETAPES]} (noté au journal).`, erreur: false })
    await onChange()
  }

  if (p.vide) {
    return (
      <div className="psh-panel"><div className="psh-empty">
        <p>Aucun dossier pour l’instant.</p>
        <p className="muted">Chaque demande reçue, chaque devis et chaque chantier apparaîtra ici, dans la colonne que donnent ses vrais statuts.</p>
      </div></div>
    )
  }
  return (
    <div className="crm-pipeline-cadre">
      {message && <p className={`crm-message${message.erreur ? ' erreur' : ''}`} role={message.erreur ? 'alert' : 'status'}>{message.texte}</p>}
      {/* Sur téléphone, les six colonnes défilent de côté : une rangée de raccourcis y saute d'un geste, avec le compte. */}
      <nav className="crm-sauts" aria-label="Aller à une colonne">
        {p.colonnes.map((col) => (
          <a key={col.etape} href={`#crm-col-${col.etape}`} onClick={(e) => { e.preventDefault(); document.getElementById(`crm-col-${col.etape}`)?.closest('section')?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' }) }}>
            {col.libelle} <span className="tnum">{col.cartes.length}</span>
          </a>
        ))}
      </nav>
      <div className="crm-pipeline" aria-label="Pipeline des dossiers">
        {p.colonnes.map((col) => (
          <section key={col.etape} className="crm-col" aria-labelledby={`crm-col-${col.etape}`}>
            <header>
              <h2 id={`crm-col-${col.etape}`}>{col.libelle}</h2>
              <span className="crm-compte tnum" aria-label={`${col.cartes.length} dossier${col.cartes.length > 1 ? 's' : ''}`}>{col.cartes.length}</span>
            </header>
            {col.montant > 0 && <p className="crm-col-total tnum">{euros(col.montant)}</p>}
            <ul>
              {col.cartes.length === 0 && <li className="crm-col-vide">—</li>}
              {col.cartes.map((c) => (
                <li key={c.cle} className={`crm-carte${c.manuel ? ' manuel' : ''}`} data-crm-carte={c.cle}>
                  <Lien className="crm-carte-titre" href={lienCarte(c)}>{c.titre}</Lien>
                  <span className="crm-carte-client">{c.client ?? 'Client sans nom'}</span>
                  <span className="crm-carte-meta">
                    {c.montant !== null && <span className="tnum">{euros(c.montant)}</span>}
                    <span>{c.depuis ? dateFr(c.depuis) : ''}</span>
                  </span>
                  <span className="crm-carte-preuve">{c.manuel ? `Déplacé à la main · statuts réels : ${LIBELLES_ETAPES[c.etapeDerivee]}` : LIBELLES_PREUVE[c.preuve]}{c.autresBrouillons > 0 ? ` · ${c.autresBrouillons} brouillon${c.autresBrouillons > 1 ? 's' : ''} plus ancien${c.autresBrouillons > 1 ? 's' : ''}, non compté${c.autresBrouillons > 1 ? 's' : ''}` : ''}</span>
                  <label className="crm-deplacer">
                    <span className="crm-sr">Déplacer « {c.titre} » vers</span>
                    <select value="" disabled={enCours === c.cle} onChange={(e) => { if (e.target.value) void deplacer(c, e.target.value) }}>
                      <option value="">Déplacer vers…</option>
                      {ETAPES.filter((e) => e !== c.etape).map((e) => <option key={e} value={e}>{LIBELLES_ETAPES[e]}{e === c.etapeDerivee ? ' (statuts réels)' : ''}</option>)}
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {p.classes > 0 && <p className="crm-note">{p.classes} dossier{p.classes > 1 ? 's' : ''} classé{p.classes > 1 ? 's' : ''} (devis refusé ou expiré, demande perdue, chantier annulé) hors du tableau.</p>}
    </div>
  )
}

function lienCarte(c: Carte): string {
  if (c.chantierId) return `/crm/chantiers/${c.chantierId}`
  if (c.devisId) return `/devis/${c.devisId}`
  return '/messages'
}
