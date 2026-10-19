// lib/consoleV2Client.ts — CLIENT : « ce compte voit-il la console v2 ? » (refonte 18/10, drapeau `consoleV2`).
//
// Drapeau levé → oui pour tous. Drapeau baissé mais en ESSAI (lib/flags.ts) → c'est le SERVEUR qui dit oui ou non
// (GET /api/essais, qui lit lib/essais.ts ; la liste des comptes n'est jamais dans le JavaScript public). Une seule requête
// par chargement de page, partagée par tous les composants qui demandent. La dernière réponse est gardée dans ce navigateur
// pour que la bonne coque s'affiche du premier coup aux visites suivantes (confort seulement : la requête tranche toujours).
'use client'

import { useEffect, useState } from 'react'
import { FLAGS, ESSAI } from '@/lib/flags'
import { supabase } from '@/lib/supabaseClient'

const CLE = 'presti.console-v2'
let enCours: Promise<Record<string, boolean>> | null = null

/** Les essais ouverts à ce compte (une seule requête par page). */
export function essaisDuCompte(): Promise<Record<string, boolean>> {
  if (!enCours) {
    enCours = (async () => {
      const { data } = await supabase.auth.getSession()
      const jeton = data.session?.access_token
      if (!jeton) return {}
      const r = await fetch('/api/essais', { headers: { Authorization: `Bearer ${jeton}` }, cache: 'no-store' }).catch(() => null)
      return r && r.ok ? ((await r.json().catch(() => ({}))) as Record<string, boolean>) : {}
    })()
  }
  return enCours
}

const lireCache = (): boolean => { try { return localStorage.getItem(CLE) === '1' } catch { return false } }
const ecrireCache = (v: boolean) => { try { if (v) localStorage.setItem(CLE, '1'); else localStorage.removeItem(CLE) } catch { /* stockage indisponible : la v1 s'affiche d'abord, sans gravité */ } }

/** true / false une fois tranché ; au premier rendu, la dernière réponse connue (ou false). */
export function useConsoleV2(): boolean {
  const [v2, setV2] = useState<boolean>(FLAGS.consoleV2)
  useEffect(() => {
    if (FLAGS.consoleV2) return
    if (!ESSAI.consoleV2) { ecrireCache(false); return }
    if (lireCache()) setV2(true)
    let vivant = true
    void essaisDuCompte().then((e) => { if (!vivant) return; const oui = e.consoleV2 === true; setV2(oui); ecrireCache(oui) })
    return () => { vivant = false }
  }, [])
  return v2
}
