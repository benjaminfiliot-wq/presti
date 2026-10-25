'use client'

// Panneau « C'est quoi ? » (sprint J-1 §4 B1). Le contenu vient de lib/aide.ts, jamais
// d'ici : ce fichier ne fait que dériver l'article de l'écran courant et l'afficher.
// Le même corps d'article (ArticleCorps) sert au centre d'aide /aide (B4).

import { useEffect, useRef, type ReactNode } from 'react'
import { ARTICLES, type Article } from '@/lib/aide'
import { PLANS } from '@/lib/plans'
import { actif } from '@/lib/flags'
import type { AideVideo } from '@/lib/aideVideos'
import { offreAide } from '@/lib/aideAutomatique'
import PastilleOffre from '@/app/aide/PastilleOffre'

// Libellés humains des chemins cités dans `reglagesLies` — l'artisan lit « Ma plateforme »,
// pas « /plateforme ».
const LIBELLES: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/messages': 'Messages',
  '/messages/canaux': 'Canaux',
  '/devis': 'Devis',
  '/devis/nouveau': 'Nouveau devis',
  '/devis/[id]': 'Éditeur de devis',
  '/factures': 'Factures',
  '/tarifs': 'Mes tarifs',
  '/inventaire': 'Inventaire',
  '/profil': 'Ma page',
  '/profil#donnees': 'Ma page',
  '/plateforme': 'Ma plateforme',
  '/abonnement': 'Abonnement',
  '/outils': 'Réponses instantanées',
  '/parametres': 'Paramètres',
  '/parametres?onglet=notifications': 'Notifications',
  '/parametres?onglet=legal': 'Entreprise & légal',
  '/parametres?onglet=securite': 'Sécurité',
  '/parametres?onglet=donnees': 'Données & confidentialité',
  '/aide': 'Centre d’aide',
  '/crm': 'CRM atelier',
  '/crm#accueil': 'CRM atelier · accueil',
  '/crm/chantiers/[id]': 'Fiche chantier',
  '/crm#agenda': 'CRM atelier · planning',
  '/assistant': 'Assistant de gestion',
}
export const libelle = (chemin: string): string => LIBELLES[chemin] ?? chemin

// L'article de l'écran courant. Ordre : chemin + recherche exacts (onglets de /parametres) ›
// page dynamique (`/devis/[id]`) › chemin exact › page sans son onglet › clé `active` du
// shell. Retourne null si l'écran n'a pas d'article : le bouton « ? » ne s'affiche pas.
export function articlePour(chemin: string, recherche: string, active: string): Article | null {
  const complet = chemin + recherche
  const exact = ARTICLES.find((a) => a.page === complet)
  if (exact) return exact
  const dyn = ARTICLES.find((a) => a.page.includes('[') && new RegExp('^' + a.page.replace(/\[[^\]]+\]/g, '[^/]+') + '$').test(chemin))
  if (dyn) return dyn
  const plain = ARTICLES.find((a) => a.page === chemin)
  if (plain) return plain
  const sansOnglet = ARTICLES.find((a) => a.page.split('?')[0] === chemin)
  if (sansOnglet) return sansOnglet
  return ARTICLES.find((a) => a.page === `/${active}`) ?? null
}

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="aide-sec">
      <h3>{titre}</h3>
      {children}
    </section>
  )
}

// Sections dans l'ordre du type Article : à quoi ça sert · comment on s'en sert · pour vos
// clients · crédits · réglages liés · « Disponible avec … » (seulement si la fonctionnalité n'est pas dans toutes les offres).
export function ArticleCorps({ article }: { article: Article }) {
  return (
    <div className="aide-corps">
      <Section titre="À quoi ça sert"><p>{article.aQuoiCaSert}</p></Section>
      <Section titre="Comment on s’en sert">
        <ol>{article.commentOnSenSert.map((e, i) => <li key={i}>{e}</li>)}</ol>
      </Section>
      <Section titre="Pour vos clients"><p>{article.pourVosClients}</p></Section>
      <Section titre="Ce que ça coûte en crédits"><p>{article.credits}</p></Section>
      {article.reglagesLies.length > 0 && (
        <Section titre="Réglages liés">
          <div className="aide-liens">
            {article.reglagesLies.map((r) => <a key={r} href={r}>{libelle(r)}</a>)}
          </div>
        </Section>
      )}
      <Section titre="Offre">
        <PastilleOffre offre={offreAide(article.id)} />
        {article.disponibleAvec !== 'toutes' && (
          <span className="aide-plan" style={{ marginLeft: 8 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            Disponible avec l’offre {PLANS[article.disponibleAvec].label}
          </span>
        )}
      </Section>
    </div>
  )
}

export default function AidePanneau({
  article,
  open,
  onClose,
  onRevoirVisite,
  video,
}: {
  article: Article | null
  /** La vidéo pas à pas de l'écran courant (lib/aideVideos.ts), s'il y en a une. */
  video?: AideVideo | null
  open: boolean
  onClose: () => void
  onRevoirVisite?: () => void
}) {
  const panRef = useRef<HTMLElement>(null)
  const fermerRef = useRef<HTMLButtonElement>(null)
  const precedent = useRef<Element | null>(null)
  // Le callback vit dans une ref : l'effet d'ouverture ne doit pas se rejouer (et
  // re-focaliser le bouton Fermer) à chaque rendu du shell.
  const fermer = useRef(onClose)
  fermer.current = onClose

  useEffect(() => {
    if (!open) return
    precedent.current = document.activeElement
    const t = setTimeout(() => fermerRef.current?.focus(), 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); fermer.current(); return }
      if (e.key !== 'Tab' || !panRef.current) return
      // Focus piégé dans le panneau (aria-modal) : Tab boucle, Maj+Tab aussi.
      const f = Array.from(panRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'))
        .filter((el) => el.offsetParent !== null)
      if (!f.length) return
      const premier = f[0], dernier = f[f.length - 1]
      if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus() }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus() }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      const p = precedent.current as HTMLElement | null
      if (p && typeof p.focus === 'function') p.focus()
    }
  }, [open])

  return (
    <>
      <div className={`aide-scrim${open ? ' on' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside
        ref={panRef}
        className={`aide-pan${open ? ' on' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="aide-pan-titre"
        inert={!open}
      >
        <div className="aide-pan-h">
          <div style={{ minWidth: 0, flex: 1 }}>
            <span className="psh-crumb">C’est quoi ?</span>
            <h2 id="aide-pan-titre">{article?.titre ?? 'Pas encore d’explication pour cet écran'}</h2>
          </div>
          <button ref={fermerRef} type="button" className="aide-x" onClick={onClose} aria-label="Fermer l’aide">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="aide-pan-b">
          {article ? <ArticleCorps article={article} /> : <p className="muted" style={{ padding: '14px 0' }}>{video ? 'Une vidéo explique cet écran pas à pas.' : 'Cet écran sera expliqué bientôt.'}</p>}
        </div>
        {(onRevoirVisite || actif('aideCentre') || video) && (
          <div className="aide-pan-f">
            {onRevoirVisite && (
              <button type="button" className="psh-btn ghost" onClick={onRevoirVisite}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
                Revoir la visite
              </button>
            )}
            {actif('aideCentre') && video && (
              <a className="psh-btn primary" href={`/aide#video-${video.id}`}>Voir la vidéo</a>
            )}
            {actif('aideCentre') && (
              <a className="psh-btn ghost" href={article ? `/aide#${article.id}` : '/aide'}>Tout le centre d’aide</a>
            )}
          </div>
        )}
      </aside>
    </>
  )
}
