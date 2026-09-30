// L'horloge décalée du service du pont (026-194) : chargée par --import dans le processus du service, avec
// JUGE_HORLOGE_ISO=<instant ISO en UTC, terminé par Z>. Date.now() et new Date() partent de cet instant et avancent ensuite
// au rythme réel : le juge fait ainsi « passer » 9 min, 11 min ou 61 min entre deux passes du service sans les attendre. Seul
// Date est touché (les délais des minuteries restent réels) : le service décide de ce qui est dû par Date.now(), jamais par
// performance.now() ni process.hrtime.
const Reelle = globalThis.Date
const iso = process.env.JUGE_HORLOGE_ISO
if (iso) {
  const t = Reelle.parse(iso)
  if (!/Z$/.test(iso) || !Number.isFinite(t)) throw new Error(`JUGE_HORLOGE_ISO : une date ISO en UTC (…Z) est attendue, reçu « ${iso} »`)
  const decalage = t - Reelle.now()
  class DateDecalee extends Reelle {
    constructor(...a) { if (a.length === 0) super(Reelle.now() + decalage); else super(...a) }
    static now() { return Reelle.now() + decalage }
  }
  globalThis.Date = DateDecalee
}
