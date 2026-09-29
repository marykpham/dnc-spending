import type { ReactNode } from 'react'
import { useInView } from '../lib/useInView'

/**
 * Adds `.in` once scrolled into view. `wipe` reveals its content with a scan-line sweep.
 * The observer sits on an unclipped outer element: an element hidden by its own clip-path
 * reports zero visible area and would never trigger.
 */
export function Reveal({ children, wipe = false, className = '' }: { children: ReactNode; wipe?: boolean; className?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.1)
  return (
    <div ref={ref}>
      <div className={`reveal${wipe ? ' wipe' : ''}${seen ? ' in' : ''} ${className}`}>{children}</div>
    </div>
  )
}
