import * as React from 'react'
import { cn } from '@/lib/utils'

/** Native <select> styled like Input: the OS list is accessible and keyboard friendly. */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm text-foreground transition-shadow focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none disabled:opacity-50',
      className,
    )}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = 'Select'
