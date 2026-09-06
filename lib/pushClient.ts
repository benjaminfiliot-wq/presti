// Côté navigateur : retirer l'abonnement push de CET appareil quand l'artisan se déconnecte
// (revue v9 J2 : sans cela, un appareil restait abonné après « se déconnecter » — un téléphone prêté
// ou un poste partagé continuait de recevoir « Nouvelle demande »). Jamais bloquant : on fait au mieux.

export async function desabonnerCetAppareil(jeton: string | null | undefined): Promise<void> {
  const retirer = (corps: Record<string, string>) => (jeton
    ? fetch('/api/push/abonner', { method: 'DELETE', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` }, body: JSON.stringify(corps) }).catch(() => {})
    : Promise.resolve())
  // La coque native (J3) : le jeton APNs/FCM de cet appareil, gardé par app/NatifPont.tsx.
  try {
    const natif = sessionStorage.getItem('presti.jeton_natif')
    if (natif) { await retirer({ jeton: natif }); sessionStorage.removeItem('presti.jeton_natif') }
  } catch { /* stockage indisponible */ }
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return
    await retirer({ endpoint: sub.endpoint })
    await sub.unsubscribe().catch(() => {})
  } catch { /* au mieux */ }
}
