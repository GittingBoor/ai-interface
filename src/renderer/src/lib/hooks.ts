import { useEffect, useRef, useState, type RefObject } from 'react'

/** Beobachtet die Breite/Höhe eines Elements. */
export function useElementSize<T extends HTMLElement>(): [RefObject<T | null>, { readonly width: number; readonly height: number }] {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, size]
}

/** Führt `callback` alle `ms` Millisekunden aus. */
export function useInterval(callback: () => void, ms: number): void {
  const saved = useRef(callback)
  saved.current = callback
  useEffect(() => {
    const id = setInterval(() => saved.current(), ms)
    return () => clearInterval(id)
  }, [ms])
}

/** Löst alle `ms` ein Neu-Rendern aus (für relative Zeitangaben). */
export function useNow(ms: number): number {
  const [now, setNow] = useState(Date.now())
  useInterval(() => setNow(Date.now()), ms)
  return now
}
