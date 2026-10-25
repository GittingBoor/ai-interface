import { PIN_PATTERN, type PrivacyStatus, type PrivateProject, type PrivateProjectInput } from '@shared/privacy'
import type { HostId } from '@shared/types'
import { isInside, normalize, type ProjectLocation } from '@shared/projectMatch'
import { InvalidPinError, PinRequiredError, PrivacyLockedError, ValidationError, WrongPinError } from '../errors'
import { hashPin, verifyPin } from './PinHasher'
import type { PrivateProjectsRepo } from './PrivateProjectsRepo'

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 30_000
/** Laufwerks- oder Dateisystemwurzel: würde alles ausblenden. */
const ROOT_PATH = /^([a-z]:)?$/

export interface PinStore {
  get(): string | null
  set(value: string): void
}

export interface PrivacyDeps {
  now(): number
  onChange(status: PrivacyStatus): void
  /** Bekannte Rechner (dieser PC und Geräte); ohne Angabe nur `local`. */
  knownHosts?(): readonly HostId[]
  /** Weitere Ordner, die gesperrt verborgen sind, ohne als private Projekte zu zählen (z. B. von Erweiterungen). */
  extraPrivate?(): readonly ProjectLocation[]
}

export interface Located {
  readonly host: HostId
  readonly path: string | null
}

/** Sichtschutz: blendet private Ordner aus, solange gesperrt (Start: gesperrt). */
export class PrivacyService {
  private locked = true
  private failures = 0
  private blockedUntil = 0
  private cache: PrivateProject[]
  /** Gespiegelt, weil `isHidden` sehr oft läuft und die PIN in der DB liegt. */
  private pinSet: boolean

  constructor(
    private readonly repo: PrivateProjectsRepo,
    private readonly pins: PinStore,
    private readonly deps: PrivacyDeps
  ) {
    this.cache = repo.list()
    this.pinSet = pins.get() !== null
  }

  status(): PrivacyStatus {
    return { locked: this.locked, hasPin: this.pins.get() !== null, hiddenCount: this.cache.length }
  }

  isHidden(host: HostId, path: string | null): boolean {
    if (!this.locked || path === null || path === '') return false
    if (this.cache.some((p) => isInside(p, host, path))) return true
    return this.pinSet && (this.deps.extraPrivate?.() ?? []).some((p) => isInside(p, host, path))
  }

  /**
   * Sind private Inhalte gerade verborgen? Ohne PIN lässt sich nichts entsperren; Add-ons, die sich als privat
   * markieren, bleiben dann sichtbar (sonst wären sie für immer weg).
   */
  isLocked(): boolean {
    return this.locked && this.pinSet
  }

  visible<T>(items: readonly T[], locate: (item: T) => Located | null): T[] {
    if (!this.locked) return [...items]
    return items.filter((item) => {
      const where = locate(item)
      return where === null || !this.isHidden(where.host, where.path)
    })
  }

  unlock(pin: string): PrivacyStatus {
    const stored = this.pins.get()
    if (stored === null) throw new PinRequiredError()
    this.checkPin(pin, stored)
    return this.change(false)
  }

  lock(): PrivacyStatus {
    return this.change(true)
  }

  setPin(current: string | null, next: string): PrivacyStatus {
    const stored = this.pins.get()
    if (stored !== null) this.checkPin(current ?? '', stored)
    if (!PIN_PATTERN.test(next)) throw new InvalidPinError()
    this.pins.set(hashPin(next))
    this.pinSet = true
    return this.change(false)
  }

  list(): PrivateProject[] {
    this.requireUnlocked()
    return [...this.cache]
  }

  add(input: PrivateProjectInput): PrivateProject {
    this.requireUnlocked()
    this.validate(input)
    const added = this.repo.add(input)
    this.cache = this.repo.list()
    this.deps.onChange(this.status())
    return added
  }

  remove(id: number): void {
    this.requireUnlocked()
    this.repo.remove(id)
    this.cache = this.repo.list()
    this.deps.onChange(this.status())
  }

  private validate(input: PrivateProjectInput): void {
    const hosts = this.deps.knownHosts?.() ?? ['local']
    if (!hosts.includes(input.host)) throw new ValidationError(`Unbekannter Rechner „${input.host}“, erwartet: ${hosts.join(', ')}.`)
    const path = normalize(input.path.trim())
    if (ROOT_PATH.test(path)) throw new ValidationError('Bitte einen Projektordner wählen, keine Laufwerks- oder Dateisystemwurzel.')
    if (this.cache.some((p) => p.host === input.host && normalize(p.path) === path)) throw new ValidationError('Dieser Ordner ist bereits privat.')
  }

  private checkPin(pin: string, stored: string): void {
    const now = this.deps.now()
    if (now < this.blockedUntil) throw new WrongPinError(Math.ceil((this.blockedUntil - now) / 1000))
    if (verifyPin(pin, stored)) {
      this.failures = 0
      return
    }
    this.failures++
    if (this.failures >= MAX_ATTEMPTS) {
      this.failures = 0
      this.blockedUntil = now + LOCKOUT_MS
    }
    throw new WrongPinError()
  }

  private requireUnlocked(): void {
    if (this.locked) throw new PrivacyLockedError()
  }

  private change(locked: boolean): PrivacyStatus {
    this.locked = locked
    const status = this.status()
    this.deps.onChange(status)
    return status
  }
}
