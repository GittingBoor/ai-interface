import { Segmented } from '@renderer/components/Controls'
import { useAnalytics, type AnalyticsTab } from '@renderer/stores/analyticsStore'
import { useT } from '@renderer/i18n/useT'

/** Umschalter zwischen den Reitern der Auswertung (im Kopf beider Reiter). */
export function AnalyticsTabs(): React.JSX.Element {
  const t = useT().usage.analytics
  const tab = useAnalytics((s) => s.tab)
  const options: readonly { readonly value: AnalyticsTab; readonly label: string }[] = [
    { value: 'overview', label: t.tabOverview },
    { value: 'analysis', label: t.tabAnalysis }
  ]
  return <Segmented label={t.tabsAria} value={tab} options={options} onChange={(t) => useAnalytics.getState().setTab(t)} />
}
