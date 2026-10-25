import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'
import { BrandSpinner } from './BrandSpinner'

export type ButtonVariant = 'primary' | 'soft' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
  readonly icon?: LucideIcon
  readonly loading?: boolean
  readonly children?: ReactNode
}

const VARIANT: Readonly<Record<ButtonVariant, string>> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-hover font-[620] shadow-[0_1px_0_0_oklch(1_0_0/0.25)_inset,0_1px_2px_oklch(0_0_0/0.4)] disabled:bg-raised-2 disabled:text-ink-3 disabled:shadow-none disabled:opacity-100',
  soft: 'bg-accent-soft text-accent-text hover:bg-accent hover:text-accent-ink',
  secondary: 'bg-raised-2 text-ink hover:bg-line-strong/70 border border-line-strong/60',
  ghost: 'text-ink-2 hover:text-ink hover:bg-raised-2',
  danger: 'bg-danger-soft text-danger-ink hover:bg-danger hover:text-canvas border border-danger/30'
}

const SIZE: Readonly<Record<ButtonSize, string>> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  md: 'h-8 px-3 text-[0.8125rem] gap-2 rounded-md'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, loading = false, className = '', children, disabled, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center font-[540] whitespace-nowrap transition-[background-color,color,transform,box-shadow] duration-150 ease-out active:translate-y-px disabled:opacity-45 disabled:active:translate-y-0 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {loading ? <BrandSpinner /> : Icon ? <Icon className="size-3.5" aria-hidden strokeWidth={2} /> : null}
      {children}
    </button>
  )
})

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly icon: LucideIcon
  readonly label: string
  readonly size?: ButtonSize
  readonly tone?: 'default' | 'danger'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, size = 'md', tone = 'default', className = '', type = 'button', ...rest },
  ref
) {
  const box = size === 'sm' ? 'size-7' : 'size-8'
  const color = tone === 'danger' ? 'text-ink-3 hover:text-danger-ink hover:bg-danger-soft' : 'text-ink-3 hover:text-ink hover:bg-raised-2'
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-md transition-colors duration-150 disabled:opacity-40 ${box} ${color} ${className}`}
      {...rest}
    >
      <Icon className="size-4" aria-hidden strokeWidth={1.75} />
    </button>
  )
})
