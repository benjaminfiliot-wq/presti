'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { apiDirection } from '../client'
import Station, { type Role } from './Station'

// /controle/station — la session et le rôle se vérifient comme dans le Poste (app/controle/page.tsx) : pas de session →
// /login ; 403 ou 404 (un partenaire, un drapeau baissé) → /dashboard ; 401 → /login. Le rôle vient de la route la plus
// légère du Poste. La `decision` de l'adresse (liens du digest) n'est gardée que si c'est un UUID.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function Entree() {
  const router = useRouter()
  const params = useSearchParams()
  const [role, setRole] = useState<Role | null>(null)
  const [prenom, setPrenom] = useState('')
  const [refus, setRefus] = useState<string | null>(null)
  const demande = params.get('decision') ?? ''
  const decision = UUID.test(demande) ? demande : undefined

  const verifier = useCallback(async () => {
    setRefus(null)
    const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
    const versLogin = () => router.replace(`/login?retour=${encodeURIComponent(window.location.pathname + window.location.search)}`)
    if (!data.session) { versLogin(); return }
    const r = await apiDirection<{ role?: Role }>('/api/controle/journal?limite=1')
    if (r.status === 403 || r.status === 404) { router.replace('/dashboard'); return }
    if (r.status === 401) { versLogin(); return }
    if (!r.ok) { setRefus(r.data.error ?? 'La station ne répond pas pour l’instant.'); return }
    const meta = data.session.user?.user_metadata as Record<string, unknown> | undefined
    setPrenom(typeof meta?.prenom === 'string' ? meta.prenom : '')
    setRole(r.data.role ?? 'direction')
  }, [router])

  useEffect(() => { void verifier() }, [verifier])

  if (role === null) {
    return (
      <div className="mc mc-attente" data-station>
        {refus ? (
          <div className="mc-attente-boite" role="alert">
            <p>{refus}</p>
            <button type="button" onClick={() => void verifier()}>Réessayer</button>
          </div>
        ) : <p className="mc-attente-boite">Vérification de l’accès…</p>}
      </div>
    )
  }
  return <Station role={role} decision={decision} prenom={prenom} />
}

export default function StationPage() {
  return (
    <Suspense fallback={<div className="mc mc-attente" data-station><p className="mc-attente-boite">Chargement…</p></div>}>
      <Entree />
    </Suspense>
  )
}
