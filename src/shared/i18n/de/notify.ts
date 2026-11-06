export const notify = {
  titles: { permission: 'Erlaubnis nötig', question: 'Frage von Claude', done: 'Claude ist fertig' },
  defaultMessages: { permission: 'Claude braucht deine Erlaubnis.', question: 'Claude hat eine Frage.', done: 'Claude ist fertig.' },
  quotaFreeTitle: 'Kontingent wieder frei',
  quotaFreeBody: (open: number): string => (open === 1 ? '1 Durchlauf wartet auf Fortsetzung.' : `${open} Durchläufe warten auf Fortsetzung.`),
  updatingTitle: 'AI Interface wird aktualisiert',
  updatingBody: 'Die neue Version ist bereit, die App startet gleich neu.',
  updateFailedTitle: 'Update fehlgeschlagen',
  updateFailedBody: 'Die App läuft mit der alten Version weiter; Details in den Einstellungen.',
  updateAvailableTitle: 'Update verfügbar',
  updateAvailableBody: 'Neue Version auf GitHub. In der Seitenleiste auf „Aktualisieren“ klicken.'
}
