import { FAVORITE_COLORS, hostColor, hostLabel } from '@renderer/lib/hosts'
import type { SeriesStyle } from '@renderer/lib/analytics'

/** Beschriftung und Farben der Serien in der Auswertung. */
export const SERIES_STYLE: SeriesStyle = { hostLabel, hostColor, palette: FAVORITE_COLORS }
