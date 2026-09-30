// Formulaire des sites commandés : la confirmation suit uniquement une réponse HTTP réussie.
;(function () {
  document.querySelectorAll('form.devis__form[data-slug]').forEach(function (formulaire) {
    var conteneur = formulaire.parentNode
    var merci = conteneur.querySelector('.devis__merci')
    var echec = conteneur.querySelector('.devis__echec')
    var bouton = formulaire.querySelector('[type="submit"]')

    formulaire.addEventListener('submit', async function (evenement) {
      evenement.preventDefault()
      if (formulaire.reportValidity && !formulaire.reportValidity()) return
      echec.hidden = true
      bouton.disabled = true
      var champs = new FormData(formulaire)
      var projet = String(champs.get('projet') || '').trim()
      var commune = String(champs.get('commune') || '').trim()
      var delai = String(champs.get('delai') || '').trim()
      var libre = String(champs.get('message') || '').trim()
      var message = 'Projet : ' + projet + ' · Commune : ' + commune + ' · Quand : ' + delai
      if (libre) message += '\n' + libre
      try {
        var reponse = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: formulaire.dataset.slug,
            commande: formulaire.dataset.commande,
            contact: String(champs.get('contact') || '').trim(),
            nom_prospect: null,
            message: message,
            website: String(champs.get('website') || ''),
          }),
        })
        if (!reponse.ok) throw new Error('Envoi refusé')
        if (merci) {
          merci.querySelectorAll('[data-champ]').forEach(function (element) {
            element.textContent = String(champs.get(element.dataset.champ) || '') || 'À préciser à la visite'
          })
        }
        formulaire.reset()
        formulaire.hidden = true
        if (merci) { merci.hidden = false; merci.focus({ preventScroll: true }) }
      } catch (_) {
        echec.hidden = false
        echec.focus({ preventScroll: true })
      } finally {
        bouton.disabled = false
      }
    })

    var encore = merci && merci.querySelector('.devis__encore')
    if (encore) encore.addEventListener('click', function () {
      merci.hidden = true
      echec.hidden = true
      formulaire.hidden = false
      var premier = formulaire.querySelector('select, input, textarea')
      if (premier) premier.focus()
    })
  })
})()
