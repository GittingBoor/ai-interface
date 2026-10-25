import { z } from 'zod'
import type { SetupProposal } from '@shared/types'

const nonEmpty = z.string().trim().min(1)

/** Format von `ai-interface-setup.json` (siehe `docs/CLAUDE-TEMPLATE.md`). Unbekannte Felder werden ignoriert. */
const proposalSchema = z.object({
  projectsRoot: nonEmpty.optional(),
  vault: z
    .object({ path: nonEmpty, todoFile: z.string().optional(), protocolDir: z.string().optional(), notesDir: z.string().optional() })
    .nullable()
    .optional(),
  devices: z
    .array(
      z.object({
        id: z.string().optional(),
        name: nonEmpty,
        host: nonEmpty,
        user: nonEmpty,
        port: z.number().int().min(1).max(65_535).optional(),
        privateKeyPath: z.string().optional(),
        projectsDir: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().nullable().optional()
      })
    )
    .optional(),
  categories: z.array(z.object({ name: nonEmpty, color: z.string().optional(), icon: z.string().nullable().optional() })).optional(),
  projects: z
    .array(
      z.object({
        path: nonEmpty,
        name: z.string().optional(),
        device: z.string().optional(),
        category: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().nullable().optional(),
        starred: z.boolean().optional()
      })
    )
    .optional()
})

export type ProposalResult = { readonly proposal: SetupProposal; readonly error: null } | { readonly proposal: null; readonly error: string }

/** Liest den Einrichtungsvorschlag; Fehler werden als Text zurückgegeben, damit die Einrichtung trotzdem startet. */
export function parseProposal(text: string): ProposalResult {
  let raw: unknown
  try {
    raw = JSON.parse(text.replace(/^﻿/, ''))
  } catch (error) {
    return { proposal: null, error: `Kein gültiges JSON: ${error instanceof Error ? error.message : String(error)}` }
  }
  const parsed = proposalSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { proposal: null, error: `Ungültiger Inhalt bei „${first?.path.join('.') || 'Wurzel'}“: ${first?.message ?? 'unbekannt'}` }
  }
  return { proposal: parsed.data as SetupProposal, error: null }
}
