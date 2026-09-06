// Côté navigateur : retirer l'abonnement push de CET appareil quand l'artisan se déconnecte
// (revue v9 J2 : sans cela, un appareil restait abonné après « se déconnecter » — un téléphone prêté
// ou un poste partagé continuait de recevoir « Nouvelle demande »). Jamais bloquant : on fait au mieux.

export async function desabonnerCetAppareil(jeton: string | null | undefined): Promise<void> {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return
    if (jeton) {
      await fetch('/api/push/abonner', {
        method: 'DELETE', keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {})
    }
    await sub.unsubscribe().catch(() => {})
  } catch { /* au mieux */ }
}
