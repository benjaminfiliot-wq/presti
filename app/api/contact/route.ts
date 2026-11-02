import { NextResponse } from 'next/server'
import { getIp, isBanned, recordAbuse } from '@/lib/security'
import { consommerLimiteStricte } from '@/lib/limites'
// Audit du 20/10 : plafond FAIL-CLOSED (consommerLimiteStricte) — cette route dépense de l'IA ou écrit à un tiers ; base muette = refus, pas « tout passe ».
import { notifierEntreprise } from '@/lib/email'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { actif } from '@/lib/flags'
import { traiterContact, enregistrerDemandeDemo } from '@/lib/demandesDemo'

// Le formulaire de contact public (§ mise en service du 05/09/2026).
//
// Pourquoi il existe : les mentions légales publiaient `contact@prestiapp.fr`, une adresse dont la
// boîte n'a jamais pu être créée chez l'hébergeur du domaine. Tout ce qu'on y écrivait était perdu
// SANS QUE PERSONNE NE LE SACHE — ni l'expéditeur, qui croyait avoir écrit, ni nous. Publier une
// adresse qui jette le courrier est pire que ne rien publier.
//
// Ce formulaire remplace ce besoin sans dépendre d'aucune boîte : le message part par le service
// d'envoi déjà en place, vers l'adresse réellement relevée (EMAIL_ENTREPRISE), avec l'adresse de
// l'expéditeur en « répondre à » pour qu'un simple bouton Répondre suffise.
//
// 02/11/2026 (chantier 4, lot L19, tâche 032-026) : la logique vit dans lib/demandesDemo.ts (`traiterContact`), jugée hors ligne par
// scripts/demandes-demo-qa.mjs ; cette route n'en est que le branchement. Drapeau `demandesDemo` baissé : le comportement d'avant,
// à l'octet près. Levé (après 0190 appliquée et contrôlée) : une demande de démo est AUSSI rangée dans `demandes_demo`.

export const runtime = 'nodejs'
export const maxDuration = 20

export async function POST(req: Request) {
  const r = await traiterContact({
    drapeau: actif('demandesDemo'),
    ip: () => getIp(req),
    banni: isBanned,
    abus: recordAbuse,
    limite: consommerLimiteStricte,
    corps: () => req.json(),
    notifier: notifierEntreprise,
    enregistrer: (ligne) => enregistrerDemandeDemo(supabaseAdmin, ligne),
  })
  return NextResponse.json(r.corps, { status: r.statut })
}
