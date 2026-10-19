'use client'

import { useId, useState } from 'react'
import type { EtatPastille, Frise as FriseT, Pastille } from '@/lib/crm/pipeline'
import { LIBELLES_ETAPES } from '@/lib/crm/pipeline'
import { appel, dateFr, estErreur, euros } from './client'
import { Lien } from './mode'

// La frise d'un dossier (plan du 18/10, n°3) : sept pastilles, Demande · Devis envoyé · Signé · Acompte · Chantier · Facturé ·
// Payé. Tout vient de lib/crm/pipeline.ts (frise), calculé côté serveur sur les vrais statuts : l'écran ne recompose rien.
//  • complète (fiche chantier, fiche client, panneau de l'atelier) : toucher une pastille dit la date et ouvre la pièce ; la
//    première étape à faire porte son geste (« Demander l'acompte » crée la facture d'acompte, après confirmation) ;
//  • compacte (cartes du pipeline) : sept points, lus d'une phrase par les lecteurs d'écran.
// Un dossier déplacé à la main dans le pipeline le dit : la frise, elle, suit toujours les vrais statuts.
const MOTS: Record<EtatPastille, string> = { fait: 'fait', en_cours: 'en cours', a_venir: 'à venir', na: 'ne s’applique pas', arrete: 'arrêté' }

export const resumeFrise = (f: FriseT) => f.pastilles.map((p) => `${p.libelle} : ${MOTS[p.etat]}`).join(', ')

export default function Frise({ frise, compacte = false, onChange, sansAction = false, ici }: { frise: FriseT; compacte?: boolean; onChange?: () => void | Promise<void>; sansAction?: boolean; ici?: string }) {
  const id = useId()
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState<{ texte: string; erreur: boolean; lien?: string } | null>(null)
  const courante = frise.pastilles.find((p) => p.etat === 'en_cours' || p.etat === 'a_venir')?.etape ?? null

  if (compacte) {
    return (
      <ol className="crm-frise compacte" aria-label={`Étapes du dossier. ${resumeFrise(frise)}`}>
        {frise.pastilles.map((p) => <li key={p.etape} className={`e-${p.etat}`} title={`${p.libelle} : ${MOTS[p.etat]}${p.date ? ` · ${dateFr(p.date)}` : ''}`} aria-hidden="true"><i /></li>)}
      </ol>
    )
  }

  const choisie = frise.pastilles.find((p) => p.etape === ouverte) ?? null
  // Un geste qui ouvrirait la page où l'on est déjà (« Ouvrir le chantier » sur la fiche du chantier) n'est pas proposé.
  const action = sansAction || (ici && frise.prochaine?.href === ici) ? null : frise.prochaine
  async function demanderAcompte() {
    if (!action?.acompte) return
    if (!confirm(`Créer la facture d’acompte de ${action.acompte.pct} % (${euros(action.acompte.montant)}) ? Une facture émise ne se modifie plus (elle s’annule par un avoir). Elle n’est pas envoyée au client : vous l’envoyez depuis l’écran Factures.`)) return
    setEnvoi(true); setMessage(null)
    const r = await appel<{ numero: string }>('/api/crm/acompte', { method: 'POST', body: { devis_id: action.acompte.devisId } })
    setEnvoi(false)
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    setMessage({ texte: `Facture d’acompte ${r.corps.numero} créée.`, erreur: false, lien: '/factures' })
    await onChange?.()
  }

  return (
    <div className="crm-frise-cadre">
      <ol className="crm-frise" aria-label="Étapes du dossier">
        {frise.pastilles.map((p) => (
          <li key={p.etape} className={`e-${p.etat}${p.etape === courante ? ' courante' : ''}`} aria-current={p.etape === courante ? 'step' : undefined}>
            <button type="button" aria-expanded={ouverte === p.etape} aria-controls={`${id}-detail`} onClick={() => setOuverte(ouverte === p.etape ? null : p.etape)}>
              <i aria-hidden="true">{p.etat === 'fait' ? '✓' : p.etat === 'arrete' ? '×' : ''}</i>
              <span className="nom">{p.libelle}</span>
              <span className="crm-sr"> : {MOTS[p.etat]}</span>
              {p.date && <span className="quand tnum">{dateFr(p.date).slice(0, 5)}</span>}
            </button>
          </li>
        ))}
      </ol>
      <div id={`${id}-detail`} aria-live="polite">
        {choisie && <DetailPastille p={choisie} />}
      </div>
      {frise.manuel && <p className="crm-frise-note">Déplacé à la main vers « {LIBELLES_ETAPES[frise.manuel]} » dans le pipeline : la frise suit les vrais statuts.</p>}
      {action && (
        <div className="crm-frise-action">
          <span className="muted">Prochaine étape · {action.etape === 'acompte' ? 'Acompte' : frise.pastilles.find((p) => p.etape === action.etape)?.libelle}</span>
          {action.acompte
            ? <button type="button" className="psh-btn primary" disabled={envoi} onClick={() => void demanderAcompte()}>{envoi ? 'Création…' : `${action.libelle} (${action.acompte.pct} %)`}</button>
            : action.href ? <Lien className="psh-btn ghost" href={action.href}>{action.libelle}</Lien> : null}
        </div>
      )}
      {message && <p className={`crm-message${message.erreur ? ' erreur' : ''}`} role={message.erreur ? 'alert' : 'status'}>{message.texte}{message.lien && <> · <Lien href={message.lien}>Voir les factures</Lien></>}</p>}
    </div>
  )
}

function DetailPastille({ p }: { p: Pastille }) {
  return (
    <div className={`crm-frise-detail e-${p.etat}`}>
      <p><b>{p.libelle}</b> · {MOTS[p.etat]}{p.date ? ` · ${dateFr(p.date)}` : ''}</p>
      <p className="muted">{p.detail}</p>
      {p.piece && <Lien className="crm-frise-piece" href={p.piece.href}>{p.piece.libelle} →</Lien>}
    </div>
  )
}
