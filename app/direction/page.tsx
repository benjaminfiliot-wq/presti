import { redirect, permanentRedirect } from 'next/navigation'

export const dynamic = 'force-static'

// L'ancienne adresse du Centre de direction (v10) mène au Poste de contrôle (v11 §1).
//
// Une redirection PERMANENTE, et pas un simple lien : l'adresse a pu être mise en favori, ouverte
// depuis un email d'alerte, ou tapée de mémoire. Rien de ce qui a été partagé ne doit tomber sur un
// 404 — surtout pas l'écran depuis lequel on éteint un incident.
export default function AncienneDirection() {
  permanentRedirect('/controle')
  redirect('/controle')
}
