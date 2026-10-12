import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  body?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-8 text-center', className)}>
      <div className="relative mb-4 grid size-16 place-items-center">
        <div className="absolute inset-0 rounded-2xl bg-water-soft" />
        <div className="absolute -right-1.5 -top-1.5 size-5 rounded-full bg-move-soft" />
        <Icon className="relative size-7 text-water-soft-foreground" aria-hidden />
      </div>
      <p className="text-base font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-64 text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
