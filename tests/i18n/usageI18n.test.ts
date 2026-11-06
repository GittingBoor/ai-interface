import { afterEach, describe, expect, it } from 'vitest'
import { setActiveLanguage } from '../../src/renderer/src/i18n/activeLocale'
import { formatMetric, metricLabel, topWithRestSeries, type ChartSeries } from '../../src/renderer/src/lib/analytics'
import { measureLabel } from '../../src/renderer/src/lib/projectActivity'

function series(key: string): ChartSeries {
  return { key, label: key, color: '#000', values: [1], total: 1, memberKeys: [key] }
}

describe('Start und Verbrauch folgen der Sprache', () => {
  afterEach(() => setActiveLanguage('de'))

  it('beschriftet Kennzahlen auf Deutsch', () => {
    expect(metricLabel('cost')).toBe('API-Gegenwert')
    expect(measureLabel('time')).toBe('Arbeitszeit')
    expect(formatMetric('hours', 2)).toBe('2 h')
  })

  it('beschriftet Kennzahlen und den Rest auf Englisch und Japanisch', () => {
    setActiveLanguage('en')
    expect(metricLabel('cost')).toBe('API value')
    expect(measureLabel('time')).toBe('Work time')
    const many = Array.from({ length: 8 }, (_, i) => series(`s${i}`))
    expect(topWithRestSeries(many, 2).at(-1)?.label).toBe('Rest')
    setActiveLanguage('ja')
    expect(metricLabel('hours')).toBe('時間')
    expect(formatMetric('hours', 2)).toBe('2 時間')
  })
})
