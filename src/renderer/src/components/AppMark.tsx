import logo from '@renderer/assets/app-logo.png'

/** Logo der App: Terminal-Platine auf dunklem Grund mit orangem Rahmen (128 × 128 px). */
export function AppMark({ className = '' }: { readonly className?: string }): React.JSX.Element {
  return <img src={logo} alt="" aria-hidden width={128} height={128} draggable={false} className={`shrink-0 rounded-[5px] select-none ${className}`} />
}
