'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/app/AppShell'
import { supabase } from '@/lib/supabaseClient'
import { peut } from '@/lib/plans'
import { appel } from '../client'
import {
  CLE_TENTATIVE, COLONNES_LUES, DUREE_TENTATIVE_MS, OUTILS, ROUTE_DEMARRER, ROUTE_RETIRER, VueOutils, avisDuRetour, nomDe, urlGoogleSure,
  type Avis, type Connexion, type Fournisseur, type Outil, type ProprietesVue,
} from './vue'

// Le conteneur de « Mes outils » (tâche 036-033). Il lit, appelle les routes déjà construites et jugées (036-009), et tient l'état ;
// tout ce qui s'affiche vit dans ./vue.tsx. La page (./page.tsx) répond 404 avant d'arriver ici tant que le drapeau `connexions` est
// baissé (lib/flags.ts).
//
// Lecture : public.connexions par la session de l'artisan (RLS « connexions_lecture » + droits par colonne de 0193) ; COLONNES_LUES ne
// nomme jamais un secret, et un « select * » serait refusé par la base. L'offre passe par peut() (lib/plans.ts), avec la même règle
// que le serveur (lib/connexions/serveur.ts) : un fondateur compte comme Business.
// Connecter : POST ROUTE_DEMARRER { fournisseur } → { url } et le cookie d'état ; le navigateur ne part que vers accounts.google.com.
// Retirer : seulement après la confirmation (aConfirmer), POST ROUTE_RETIRER { id }.
// Retour : la route de retour renvoie `?connexion=ok|refus&motif=…` (lib/connexions/routes.ts, retourVers). Cet écran lit ces
// paramètres ; la tentative gardée dans l'onglet nomme l'outil (« Gmail connecté. ») et, si l'artisan revient ici par un autre chemin,
// l'état relu en base dit ce qui s'est passé.

type Tentative = { fournisseur: Fournisseur; depuis: number }

function lireTentative(): Tentative | null {
  try {
    const t = JSON.parse(sessionStorage.getItem(CLE_TENTATIVE) ?? 'null') as Tentative | null
    return t && typeof t.depuis === 'number' && Date.now() - t.depuis < DUREE_TENTATIVE_MS && nomDe(t.fournisseur) ? t : null
  } catch { return null }
}
function oublierTentative() { try { sessionStorage.removeItem(CLE_TENTATIVE) } catch { /* rien */ } }

/** La tentative revenue sans paramètre : ce que la base dit de la connexion née ou renouvelée depuis le clic. */
function avisDeLaBase(t: Tentative, connexions: readonly Connexion[]): Avis | null {
  const nom = nomDe(t.fournisseur)
  const recentes = connexions.filter((c) => c.fournisseur === t.fournisseur)
  if (recentes.some((c) => c.etat === 'active' && c.verifiee_le && Date.parse(c.verifiee_le) >= t.depuis)) return { ton: 'ok', texte: `${nom} connecté.` }
  if (recentes.some((c) => c.etat === 'erreur' && c.cree_le && Date.parse(c.cree_le) >= t.depuis)) {
    return { ton: 'erreur', texte: `${nom} n’est pas connecté. L’autorisation est reçue, mais le premier essai de lecture a échoué. Reconnectez l’outil.` }
  }
  return null
}

const tableAbsente = (code: string | undefined) => code === '42P01' || code === 'PGRST205'

export default function Outils() {
  const router = useRouter()
  const [etat, setEtat] = useState<ProprietesVue['etat']>('chargement')
  const [message, setMessage] = useState<string | undefined>(undefined)
  const [outils, setOutils] = useState<readonly Outil[]>([])
  const [connexions, setConnexions] = useState<Connexion[]>([])
  const [avis, setAvis] = useState<Avis | null>(null)
  const [aConfirmer, setAConfirmer] = useState<string | null>(null)
  const [occupe, setOccupe] = useState<string | null>(null)

  const charger = useCallback(async (): Promise<Connexion[] | null> => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) { router.replace('/login'); return null }
    const uid = data.session.user.id
    const [art, cnx] = await Promise.all([
      supabase.from('artisans').select('plan, is_founder').eq('id', uid).maybeSingle(),
      supabase.from('connexions').select(COLONNES_LUES).eq('artisan_id', uid).neq('etat', 'retiree').order('cree_le', { ascending: true }),
    ])
    if (art.error) { setEtat('erreur'); setMessage('Votre offre n’a pas pu être lue. Rechargez dans un instant.'); return null }
    if (cnx.error) {
      if (tableAbsente(cnx.error.code)) { setEtat('fermee'); return null }
      setEtat('erreur'); setMessage('Vos outils n’ont pas pu être lus. Rechargez dans un instant.'); return null
    }
    const a = art.data as { plan?: string | null; is_founder?: boolean | null } | null
    const plan = a?.is_founder ? 'business' : (a?.plan ?? null)
    const lignes = (cnx.data ?? []) as unknown as Connexion[]
    setOutils(OUTILS.filter((o) => peut(plan, o.capacite)))
    setConnexions(lignes)
    setEtat('pret')
    return lignes
  }, [router])

  useEffect(() => {
    let vivant = true
    void (async () => {
      const p = new URLSearchParams(window.location.search)
      const t = lireTentative()
      const retour = avisDuRetour(p.get('connexion'), p.get('motif'), p.get('outil') ?? t?.fournisseur)
      if (retour) {
        setAvis(retour)
        oublierTentative()
        window.history.replaceState(null, '', window.location.pathname)
      }
      const lignes = await charger()
      if (!vivant || retour || !t || !lignes) return
      const a = avisDeLaBase(t, lignes)
      if (a) { setAvis(a); oublierTentative() }
    })()
    return () => { vivant = false }
  }, [charger])

  const connecter = useCallback(async (f: Fournisseur) => {
    setOccupe(f); setAvis(null)
    try { sessionStorage.setItem(CLE_TENTATIVE, JSON.stringify({ fournisseur: f, depuis: Date.now() } satisfies Tentative)) } catch { /* l'écran relira la base */ }
    const r = await appel<{ url?: unknown }>(ROUTE_DEMARRER, { method: 'POST', body: { fournisseur: f } })
    if (r.ok && urlGoogleSure(r.corps.url)) { window.location.assign(r.corps.url); return }
    oublierTentative()
    setOccupe(null)
    setAvis({ ton: 'erreur', texte: `${nomDe(f)} : ${r.ok ? 'la connexion n’a pas pu s’ouvrir. Réessayez.' : r.erreur}` })
  }, [])

  const confirmerRetrait = useCallback(async (id: string) => {
    if (aConfirmer !== id) return // jamais un retrait sans la confirmation de cette ligne
    const nom = nomDe(connexions.find((c) => c.id === id)?.fournisseur) ?? 'L’outil'
    setOccupe(id); setAvis(null)
    const r = await appel<{ ok?: boolean }>(ROUTE_RETIRER, { method: 'POST', body: { id } })
    setOccupe(null); setAConfirmer(null)
    setAvis(r.ok ? { ton: 'ok', texte: `${nom} retiré : l’accès est coupé et l’autorisation effacée.` } : { ton: 'erreur', texte: r.erreur })
    await charger()
  }, [aConfirmer, connexions, charger])

  const actions: ProprietesVue['actions'] = {
    connecter: (f) => { void connecter(f) },
    demanderRetrait: (id) => { setAConfirmer(id); setAvis(null) },
    confirmerRetrait: (id) => { void confirmerRetrait(id) },
    annulerRetrait: () => setAConfirmer(null),
  }

  return (
    <AppShell active="crm" title="Mes outils" crumb="Outil de gestion · Gmail, Google Agenda, Google Drive" wide>
      <VueOutils etat={etat} message={message} outils={outils} horsOffre={etat === 'pret' && outils.length === 0} connexions={connexions}
        avis={avis} aConfirmer={aConfirmer} occupe={occupe} actions={actions} />
    </AppShell>
  )
}
