'use client'

// Centre d'aide (sprint J-1 §4 B4) : recherche plein texte sur lib/aide.ts, articles groupés
// par outil, chaque article affiché comme le panneau « C'est quoi ? ». En tête : une vidéo pas à pas par
// fonctionnalité du menu (lib/aideVideos.ts, vraies captures d'écran), avec les mêmes étapes par écrit.
// Masqué derrière le drapeau `aideCentre` : sans lui, la route répond 404.

import { useEffect, useMemo, useState } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import { ArticleCorps, libelle } from '@/app/AidePanneau'
import { ARTICLES, chercher, type Article } from '@/lib/aide'
import { actif } from '@/lib/flags'
import { videosVisibles, type AideVideo } from '@/lib/aideVideos'
import VideoAide from './VideoAide'
import ChargementConsole from '@/components/ui/ChargementConsole' // refonte 18/10 (5.4) : squelette en console v2

// Ordre de lecture = ordre du menu de la console. Les articles dont la page n'est listée
// nulle part tombent dans « Autres » : un nouvel article n'est jamais perdu.
const GROUPES: { id: string; titre: string; pages: string[] }[] = [
  { id: 'dashboard', titre: 'Tableau de bord', pages: ['/dashboard'] },
  { id: 'messages', titre: 'Messages', pages: ['/messages', '/messages/canaux'] },
  { id: 'devis', titre: 'Devis', pages: ['/devis', '/devis/[id]'] },
  { id: 'factures', titre: 'Factures', pages: ['/factures'] },
  { id: 'chiffres', titre: 'Mes chiffres', pages: ['/chiffres'] },
  { id: 'tarifs', titre: 'Mes tarifs', pages: ['/tarifs'] },
  { id: 'inventaire', titre: 'Inventaire', pages: ['/inventaire'] },
  { id: 'profil', titre: 'Ma page', pages: ['/profil'] },
  { id: 'plateforme', titre: 'Ma plateforme', pages: ['/plateforme'] },
  { id: 'abonnement', titre: 'Abonnement', pages: ['/abonnement'] },
  { id: 'outils', titre: 'Réponses instantanées', pages: ['/outils'] },
  { id: 'parametres', titre: 'Paramètres', pages: ['/parametres?onglet=legal', '/parametres?onglet=securite', '/parametres?onglet=donnees'] },
]

function ArticleDetails({ article, ouvert }: { article: Article; ouvert: boolean }) {
  return (
    <details className="aide-art" id={article.id} open={ouvert}>
      <summary>
        <span>{article.titre}</span>
        <span className="pg">{libelle(article.page)}</span>
      </summary>
      <div className="aide-art-b"><ArticleCorps article={article} /></div>
    </details>
  )
}

export default function AidePage() {
  if (!actif('aideCentre')) notFound()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [q, setQ] = useState('')
  const [cible, setCible] = useState<string | null>(null)
  const videos = useMemo(() => videosVisibles(), [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setReady(true)
    })
  }, [router])

  // /aide#devis.editeur (depuis le panneau « ? ») : l'article visé s'ouvre et défile à l'écran.
  useEffect(() => {
    if (!ready) return
    const h = decodeURIComponent(window.location.hash.slice(1))
    if (!h || !(ARTICLES.some((a) => a.id === h) || videos.some((v) => `video-${v.id}` === h))) return
    setCible(h)
    const t = setTimeout(() => document.getElementById(h)?.scrollIntoView({ block: 'start' }), 60)
    return () => clearTimeout(t)
  }, [ready, videos])

  // Les articles dont le TITRE contient la requête passent devant : « devis » doit donner
  // « Devis » et « Éditeur de devis » avant un article qui ne fait que mentionner le mot.
  const resultats = useMemo(() => {
    const n = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    const mots = n(q.trim()).split(/\s+/).filter(Boolean)
    const dansTitre = (a: Article) => mots.every((m) => n(a.titre).includes(m))
    const r = chercher(q)
    return [...r.filter(dansTitre), ...r.filter((x) => !dansTitre(x))]
  }, [q])
  // La recherche passe aussi par les vidéos : titre, résumé et étapes (mêmes mots, mêmes accents ignorés).
  const videosTrouvees = useMemo(() => {
    const n = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    const mots = n(q.trim()).split(/s+/).filter(Boolean)
    if (!mots.length) return videos
    return videos.filter((v: AideVideo) => { const t = n([v.titre, v.resume, ...v.etapes].join(' ')); return mots.every((m) => t.includes(m)) })
  }, [q, videos])
  const groupes = useMemo(() => {
    const places = new Set<string>()
    const g = GROUPES.map((gr) => {
      const articles = gr.pages.flatMap((p) => ARTICLES.filter((a) => a.page === p))
      articles.forEach((a) => places.add(a.id))
      return { ...gr, articles }
    }).filter((gr) => gr.articles.length)
    const reste = ARTICLES.filter((a) => !places.has(a.id))
    if (reste.length) g.push({ id: 'autres', titre: 'Autres', pages: [], articles: reste })
    return g
  }, [])

  const enRecherche = q.trim().length > 0

  return (
    <AppShell active="aide" title="Centre d’aide" crumb="Chaque outil, expliqué">
      {!ready ? (
        <ChargementConsole />
      ) : (
        <>
          <div className="aide-rech">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher : devis, facture, assistant, site…"
              aria-label="Rechercher dans l’aide"
              autoFocus
            />
            {enRecherche && <span className="aide-rech-n" aria-live="polite">{resultats.length} {resultats.length > 1 ? 'articles' : 'article'} · {videosTrouvees.length} {videosTrouvees.length > 1 ? 'vidéos' : 'vidéo'}</span>}
          </div>

          {enRecherche ? (
            resultats.length || videosTrouvees.length ? (
              <div className="aide-grp">
                <h2>Résultats pour « {q.trim()} »</h2>
                {videosTrouvees.map((v) => <VideoAide key={v.id} video={v} ouvert={false} />)}
                {resultats.map((a) => <ArticleDetails key={a.id} article={a} ouvert />)}
              </div>
            ) : (
              <div className="aide-vide">Aucun article ne parle de « {q.trim()} ». Essayez un autre mot : devis, facture, assistant, site, crédits…</div>
            )
          ) : (
            <>
              <nav className="aide-chips" aria-label="Aller à un outil">
                {videos.length > 0 && <a href="#grp-videos">Vidéos pas à pas</a>}
                {groupes.map((g) => <a key={g.id} href={`#grp-${g.id}`}>{g.titre}</a>)}
              </nav>
              {videos.length > 0 && (
                <section id="grp-videos" className="aide-grp" aria-labelledby="grp-videos-t">
                  <h2 id="grp-videos-t">Vidéos pas à pas : chaque fonctionnalité, en images</h2>
                  {videos.map((v) => <VideoAide key={v.id} video={v} ouvert={cible === `video-${v.id}`} />)}
                </section>
              )}
              {groupes.map((g) => (
                <section key={g.id} id={`grp-${g.id}`} className="aide-grp">
                  <h2>{g.titre}</h2>
                  {g.articles.map((a) => <ArticleDetails key={a.id} article={a} ouvert={cible === a.id} />)}
                </section>
              ))}
            </>
          )}
        </>
      )}
    </AppShell>
  )
}
