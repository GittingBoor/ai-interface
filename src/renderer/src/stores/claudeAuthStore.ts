import { useEffect } from 'react'
import { create } from 'zustand'
import type { ClaudeAuth, HostId } from '@shared/types'
import { api } from '@renderer/api/client'
import { errorMessage, unwrap } from '@renderer/api/call'
import { useHostIds } from '@renderer/lib/hosts'

/** Das Ablaufdatum ändert sich nur bei einer neuen Anmeldung, daher selten nachsehen. */
export const CLAUDE_AUTH_POLL_MS = 3 * 60 * 60 * 1000

interface ClaudeAuthStore {
  readonly byHost: Readonly<Record<HostId, ClaudeAuth>>
  readonly checking: readonly HostId[]
  check(host: HostId): Promise<void>
}

export const useClaudeAuth = create<ClaudeAuthStore>((set, get) => ({
  byHost: {},
  checking: [],
  check: async (host) => {
    if (get().checking.includes(host)) return
    set({ checking: [...get().checking, host] })
    try {
      const auth = await unwrap(api.minipc.claudeAuth(host))
      set({ byHost: { ...get().byHost, [host]: auth } })
    } catch (error) {
      set({ byHost: { ...get().byHost, [host]: { state: 'unknown', reason: errorMessage(error), checkedAt: Date.now() } } })
    } finally {
      set({ checking: get().checking.filter((h) => h !== host) })
    }
  }
}))

/** Prüft alle eingeschalteten Geräte beim Start, bei neuen Geräten und dann alle paar Stunden. */
export function useClaudeAuthPolling(): void {
  const devices = useHostIds()
    .filter((id) => id !== 'local')
    .join('\n')
  useEffect(() => {
    if (!devices) return
    const ids = devices.split('\n')
    const checkAll = (): void => ids.forEach((id) => void useClaudeAuth.getState().check(id))
    checkAll()
    const timer = setInterval(checkAll, CLAUDE_AUTH_POLL_MS)
    return () => clearInterval(timer)
  }, [devices])
}
