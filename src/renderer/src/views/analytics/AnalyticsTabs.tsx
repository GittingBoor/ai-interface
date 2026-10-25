import { Segmented } from '@renderer/components/Controls'
import { useAnalytics, type AnalyticsTab } from '@renderer/stores/analyticsStore'

const TAB_OPTIONS: readonly { readonly value: AnalyticsTab; readonly label: string }[] = [
  { value: 'overview', label: 'Übersicht' },
  { value: 'analysis', label: 'Analyse' }
]

/** Umschalter zwischen den Reitern der Auswertung (im Kopf beider Reiter). */
export function AnalyticsTabs(): React.JSX.Element {
  const tab = useAnalytics((s) => s.tab)
  return <Segmented label="Ansicht der Auswertung" value={tab} options={TAB_OPTIONS} onChange={(t) => useAnalytics.getState().setTab(t)} />
}
